using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class RegisterController(AppDbContext db, OtpService otp, ITenantContext tenantCtx, IHostEnvironment env) : ControllerBase
{
    public record RegisterDto(string Name, string? Surname, string CompanyName, string Phone, string? Email, string Password, string? Plan);

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        var phone = PhoneHelper.Normalize(dto.Phone);
        if (!PhoneHelper.IsValid(phone)) throw new ApiException(422, "Geçerli bir cep telefonu girin.");
        var planCode = dto.Plan ?? "trial";
        var now = DateTime.UtcNow;

        await using var tx = await db.Database.BeginTransactionAsync();

        var tenant = new Tenant
        {
            Name = dto.CompanyName, Slug = await UniqueSlug(dto.CompanyName), Phone = phone, Email = dto.Email,
            Plan = planCode, PlanExpiresAt = now.AddDays(30), SmsBalance = 100, IsActive = true,
            CreatedAt = now, UpdatedAt = now,
        };
        db.Tenants.Add(tenant);
        await db.SaveChangesAsync();

        // Yeni kayıtlarda tenant bağlamını set et (sms_preferences vb. için)
        tenantCtx.TenantId = tenant.Id;

        var user = new User
        {
            TenantId = tenant.Id, Name = dto.Name, Surname = dto.Surname, Phone = phone, Email = dto.Email,
            Password = BCrypt.Net.BCrypt.HashPassword(dto.Password), Role = "manager", IsActive = true,
            CreatedAt = now, UpdatedAt = now,
        };
        db.Users.Add(user);

        var plan = await db.Plans.FirstOrDefaultAsync(p => p.Code == planCode);
        db.Subscriptions.Add(new Subscription
        {
            TenantId = tenant.Id, PlanId = plan?.Id, Status = "trialing", StartedAt = now,
            CurrentPeriodEnd = now.AddDays(30), CreatedAt = now, UpdatedAt = now,
        });
        db.SmsPreferences.Add(new SmsPreference { TenantId = tenant.Id, CreatedAt = now, UpdatedAt = now });

        await db.SaveChangesAsync();
        await tx.CommitAsync();

        var code = await otp.GenerateAsync(phone, tenant.Id, "login");

        return StatusCode(201, new
        {
            message = "Firma kaydınız oluşturuldu. Doğrulama kodu gönderildi.",
            requires_otp = true,
            phone,
            tenant = new { tenant.Id, tenant.Name, tenant.Slug },
            dev_code = env.IsDevelopment() ? code : null,
        });
    }

    private async Task<string> UniqueSlug(string name)
    {
        var baseSlug = Slugify(name);
        if (string.IsNullOrEmpty(baseSlug)) baseSlug = "firma";
        var slug = baseSlug;
        var i = 1;
        while (await db.Tenants.IgnoreQueryFilters().AnyAsync(t => t.Slug == slug))
            slug = $"{baseSlug}-{++i}";
        return slug;
    }

    private static string Slugify(string input)
    {
        var s = input.ToLowerInvariant().Trim();
        s = s.Replace('ı', 'i').Replace('ğ', 'g').Replace('ü', 'u').Replace('ş', 's').Replace('ö', 'o').Replace('ç', 'c');
        var chars = s.Select(c => char.IsLetterOrDigit(c) ? c : '-').ToArray();
        s = new string(chars);
        while (s.Contains("--")) s = s.Replace("--", "-");
        return s.Trim('-');
    }
}
