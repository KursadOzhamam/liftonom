using LiftOtonom.Api.Data;
using LiftOtonom.Api.Models;
using LiftOtonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LiftOtonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/subscription")]
public class SubscriptionController(AppDbContext db, IPaymentGateway gateway) : ControllerBase
{
    public record UpgradeDto(string Plan);

    private long TenantId => db.CurrentTenantId!.Value;

    [HttpGet]
    public async Task<IActionResult> Current()
    {
        var tenant = await db.Tenants.FindAsync(TenantId);
        var sub = await db.Subscriptions.Where(s => s.TenantId == TenantId)
            .OrderByDescending(s => s.Id).FirstOrDefaultAsync();
        var plan = sub?.PlanId == null ? null : await db.Plans.FindAsync(sub.PlanId);
        return Ok(new
        {
            plan = tenant!.Plan,
            plan_expires_at = tenant.PlanExpiresAt,
            status = sub?.Status ?? "trialing",
            current_period_end = sub?.CurrentPeriodEnd,
            plan_details = plan == null ? null : new { plan.Code, plan.Name, plan.MonthlyPrice, plan.MaxUsers, plan.MaxElevators, plan.SmsQuota },
        });
    }

    [HttpGet("plans")]
    public async Task<IActionResult> Plans() =>
        Ok(await db.Plans.IgnoreQueryFilters().Where(p => p.IsActive).OrderBy(p => p.MonthlyPrice)
            .Select(p => new { p.Id, p.Code, p.Name, p.MonthlyPrice, p.MaxUsers, p.MaxElevators, p.SmsQuota }).ToListAsync());

    [HttpGet("payments")]
    public async Task<IActionResult> Payments([FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1) =>
        Ok(await db.SubscriptionPayments.OrderByDescending(p => p.Id).ToPagedAsync(page, perPage));

    /// <summary>Plan yükselt — ödeme al (mock/iyzico), abonelik + firma planını güncelle.</summary>
    [HttpPost("upgrade")]
    [Authorize(Roles = "manager")]
    public async Task<IActionResult> Upgrade(UpgradeDto dto)
    {
        var plan = await db.Plans.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.Code == dto.Plan && p.IsActive)
            ?? throw new ApiException(422, "Geçersiz plan.");

        await using var tx = await db.Database.BeginTransactionAsync();

        // Ödeme (ücretsiz planlarda atla)
        PaymentResult? pay = null;
        if (plan.MonthlyPrice > 0)
        {
            pay = await gateway.ChargeAsync(plan.MonthlyPrice, "TRY", $"LiftOtonom {plan.Name} aboneliği");
            if (!pay.Success) throw new ApiException(402, "Ödeme alınamadı.");
        }

        var now = DateTime.UtcNow;
        var periodEnd = now.AddDays(30);

        var sub = await db.Subscriptions.Where(s => s.TenantId == TenantId).OrderByDescending(s => s.Id).FirstOrDefaultAsync();
        if (sub == null)
        {
            sub = new Subscription { TenantId = TenantId, CreatedAt = now };
            db.Subscriptions.Add(sub);
        }
        sub.PlanId = plan.Id;
        sub.Status = "active";
        sub.StartedAt = now;
        sub.CurrentPeriodEnd = periodEnd;
        sub.UpdatedAt = now;
        await db.SaveChangesAsync(); // sub.Id'yi al (ödeme FK'si için)

        if (plan.MonthlyPrice > 0)
        {
            db.SubscriptionPayments.Add(new SubscriptionPayment
            {
                TenantId = TenantId, SubscriptionId = sub.Id, Amount = plan.MonthlyPrice, Currency = "TRY",
                Status = "success", IyzicoPaymentId = pay!.PaymentId, RawResponse = pay.Raw, PaidAt = now,
                CreatedAt = now, UpdatedAt = now,
            });
        }

        var tenant = await db.Tenants.FindAsync(TenantId);
        tenant!.Plan = plan.Code;
        tenant.PlanExpiresAt = periodEnd;
        if (plan.SmsQuota is { } quota) tenant.SmsBalance = quota;
        tenant.UpdatedAt = now;

        await db.SaveChangesAsync();
        await tx.CommitAsync();

        return Ok(new { message = $"{plan.Name} planına yükseltildi.", plan = plan.Code, plan_expires_at = periodEnd });
    }
}
