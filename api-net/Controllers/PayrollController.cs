using LiftOtonom.Api.Data;
using LiftOtonom.Api.Models;
using LiftOtonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LiftOtonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/payroll")]
public class PayrollController(AppDbContext db, LedgerService ledger) : ControllerBase
{
    public record PayrollDto(long UserId, string Period, decimal BaseSalary, decimal? Bonus, decimal? Deduction, long? CashboxId);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery(Name = "user_id")] long? userId, [FromQuery] string? period,
        [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var q = db.Payrolls.AsQueryable();
        if (userId is { } u) q = q.Where(p => p.UserId == u);
        if (!string.IsNullOrEmpty(period)) q = q.Where(p => p.Period == period);
        var projected = q.OrderByDescending(p => p.Id).Select(p => new
        {
            p.Id, p.Period, p.BaseSalary, p.Bonus, p.Deduction, p.NetPaid, p.PaidAt,
            User = p.User == null ? null : new { p.User.Name, p.User.Surname },
        });
        return Ok(await projected.ToPagedAsync(page, perPage));
    }

    [HttpPost]
    [Authorize(Roles = "manager,accounting")]
    public async Task<IActionResult> Store(PayrollDto dto)
    {
        var net = dto.BaseSalary + (dto.Bonus ?? 0) - (dto.Deduction ?? 0);
        var uid = long.Parse(User.FindFirst("uid")!.Value);

        await using var tx = await db.Database.BeginTransactionAsync();
        var p = new Payroll
        {
            TenantId = db.CurrentTenantId!.Value, UserId = dto.UserId, Period = dto.Period,
            BaseSalary = dto.BaseSalary, Bonus = dto.Bonus ?? 0, Deduction = dto.Deduction ?? 0,
            NetPaid = net, CashboxId = dto.CashboxId, CreatedBy = uid,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        db.Payrolls.Add(p);
        await db.SaveChangesAsync();

        if (dto.CashboxId is { } cb)
        {
            await ledger.CashOutAsync(cb, net, $"Maaş ödemesi ({dto.Period})", "payroll", p.Id, uid);
            p.PaidAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }
        await tx.CommitAsync();

        return StatusCode(201, p);
    }
}
