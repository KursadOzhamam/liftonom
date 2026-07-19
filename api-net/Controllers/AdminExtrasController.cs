using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

/// <summary>Süper Admin ek modülleri: Hesabım/Şifre, Sözleşmeler, Ödemeler, Ayarlar.</summary>
[ApiController]
[Authorize(Policy = "Admin")]
[Route("api/v1/admin")]
public class AdminExtrasController(AppDbContext db) : ControllerBase
{
    private long CurrentAdminId => long.Parse(User.FindFirst("aid")!.Value);

    // ─────────── Hesabım / Şifre ───────────
    public record ProfileDto(string? Name, string? Email);
    public record PasswordDto(string CurrentPassword, string NewPassword);

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile(ProfileDto dto)
    {
        var admin = await db.PlatformAdmins.FindAsync(CurrentAdminId) ?? throw new ApiException(404, "Bulunamadı.");
        if (!string.IsNullOrWhiteSpace(dto.Name)) admin.Name = dto.Name;
        if (!string.IsNullOrWhiteSpace(dto.Email)) admin.Email = dto.Email!.Trim();
        admin.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { admin.Id, admin.Name, admin.Email });
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(PasswordDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
            throw new ApiException(422, "Yeni şifre en az 6 karakter olmalıdır.");
        var admin = await db.PlatformAdmins.FindAsync(CurrentAdminId) ?? throw new ApiException(404, "Bulunamadı.");
        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, admin.Password))
            throw new ApiException(422, "Mevcut şifre hatalı.");
        admin.Password = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        admin.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Şifre güncellendi." });
    }

    // ─────────── Sözleşmeler (abonelik) ───────────
    public record ContractDto(long TenantId, string? Title, string? Plan, decimal Amount, string? Currency,
        DateOnly? StartDate, DateOnly? EndDate, string? Status, string? Notes);

    [HttpGet("contracts")]
    public async Task<IActionResult> Contracts()
    {
        var rows = await db.SubscriptionContracts
            .Join(db.Tenants.IgnoreQueryFilters(), c => c.TenantId, t => t.Id, (c, t) => new
            {
                c.Id, c.TenantId, tenant_name = t.Name, c.Title, c.Plan, c.Amount, c.Currency,
                c.StartDate, c.EndDate, c.Status, c.Notes, c.CreatedAt,
            })
            .OrderByDescending(x => x.Id).ToListAsync();
        return Ok(rows);
    }

    [HttpPost("contracts")]
    public async Task<IActionResult> CreateContract(ContractDto dto)
    {
        if (dto.TenantId <= 0) throw new ApiException(422, "Firma seçin.");
        if (string.IsNullOrWhiteSpace(dto.Title)) throw new ApiException(422, "Başlık zorunludur.");
        if (!await db.Tenants.IgnoreQueryFilters().AnyAsync(t => t.Id == dto.TenantId))
            throw new ApiException(422, "Firma bulunamadı.");
        var now = DateTime.UtcNow;
        var c = new SubscriptionContract
        {
            TenantId = dto.TenantId, Title = dto.Title!.Trim(), Plan = dto.Plan, Amount = dto.Amount,
            Currency = string.IsNullOrWhiteSpace(dto.Currency) ? "TRY" : dto.Currency!, StartDate = dto.StartDate,
            EndDate = dto.EndDate, Status = string.IsNullOrWhiteSpace(dto.Status) ? "active" : dto.Status!,
            Notes = dto.Notes, CreatedAt = now, UpdatedAt = now,
        };
        db.SubscriptionContracts.Add(c);
        await db.SaveChangesAsync();
        return StatusCode(201, new { c.Id });
    }

    [HttpPut("contracts/{id:long}")]
    public async Task<IActionResult> UpdateContract(long id, ContractDto dto)
    {
        var c = await db.SubscriptionContracts.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new ApiException(404, "Sözleşme bulunamadı.");
        if (!string.IsNullOrWhiteSpace(dto.Title)) c.Title = dto.Title!.Trim();
        c.Plan = dto.Plan;
        c.Amount = dto.Amount;
        if (!string.IsNullOrWhiteSpace(dto.Currency)) c.Currency = dto.Currency!;
        c.StartDate = dto.StartDate;
        c.EndDate = dto.EndDate;
        if (!string.IsNullOrWhiteSpace(dto.Status)) c.Status = dto.Status!;
        c.Notes = dto.Notes;
        c.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { c.Id });
    }

    [HttpDelete("contracts/{id:long}")]
    public async Task<IActionResult> DeleteContract(long id)
    {
        var c = await db.SubscriptionContracts.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new ApiException(404, "Sözleşme bulunamadı.");
        c.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Sözleşme silindi." });
    }

    // ─────────── Ödemeler & Faturalar ───────────
    public record PaymentDto(long TenantId, decimal Amount, string? Currency, string? Status, DateOnly? PaidAt);

    [HttpGet("payments")]
    public async Task<IActionResult> Payments()
    {
        var rows = await db.SubscriptionPayments.IgnoreQueryFilters()
            .Join(db.Tenants.IgnoreQueryFilters(), p => p.TenantId, t => t.Id, (p, t) => new
            {
                p.Id, p.TenantId, tenant_name = t.Name, p.Amount, p.Currency, p.Status, p.PaidAt, p.CreatedAt,
            })
            .OrderByDescending(x => x.Id).ToListAsync();
        return Ok(rows);
    }

    [HttpPost("payments")]
    public async Task<IActionResult> AddPayment(PaymentDto dto)
    {
        if (dto.TenantId <= 0) throw new ApiException(422, "Firma seçin.");
        if (!await db.Tenants.IgnoreQueryFilters().AnyAsync(t => t.Id == dto.TenantId))
            throw new ApiException(422, "Firma bulunamadı.");
        var now = DateTime.UtcNow;
        db.SubscriptionPayments.Add(new SubscriptionPayment
        {
            TenantId = dto.TenantId, Amount = dto.Amount,
            Currency = string.IsNullOrWhiteSpace(dto.Currency) ? "TRY" : dto.Currency!,
            Status = string.IsNullOrWhiteSpace(dto.Status) ? "success" : dto.Status!,
            PaidAt = dto.PaidAt.HasValue
                ? DateTime.SpecifyKind(dto.PaidAt.Value.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc)
                : now,
            CreatedAt = now, UpdatedAt = now,
        });
        await db.SaveChangesAsync();
        return StatusCode(201, new { message = "Ödeme kaydedildi." });
    }

    // ─────────── Global Ayarlar ───────────
    public record SettingsDto(string? PlatformName, string? SupportEmail, string? DefaultPlan,
        string? SmtpHost, int? SmtpPort, string? SmtpUser, string? SmtpPassword,
        string? SmtpFrom, string? SmtpFromName, bool? SmtpSsl);

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        var s = await db.PlatformSettings.FirstOrDefaultAsync();
        return Ok(new
        {
            platform_name = s?.PlatformName ?? "Liftonom",
            support_email = s?.SupportEmail,
            default_plan = s?.DefaultPlan ?? "trial",
            // SMTP — şifre GET'te dönmez (güvenlik); yalnızca "ayarlı mı" bilgisi verilir.
            smtp_host = s?.SmtpHost,
            smtp_port = s?.SmtpPort,
            smtp_user = s?.SmtpUser,
            smtp_from = s?.SmtpFrom,
            smtp_from_name = s?.SmtpFromName,
            smtp_ssl = s?.SmtpSsl ?? true,
            smtp_password_set = !string.IsNullOrEmpty(s?.SmtpPassword),
            // Bilgi (salt-okunur): SMS ve OTP kapalı
            otp_enabled = false,
            sms_enabled = false,
        });
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings(SettingsDto dto)
    {
        var s = await db.PlatformSettings.FirstOrDefaultAsync();
        if (s == null)
        {
            s = new PlatformSetting { CreatedAt = DateTime.UtcNow };
            db.PlatformSettings.Add(s);
        }
        s.PlatformName = dto.PlatformName;
        s.SupportEmail = dto.SupportEmail;
        s.DefaultPlan = dto.DefaultPlan;
        s.SmtpHost = dto.SmtpHost; s.SmtpPort = dto.SmtpPort; s.SmtpUser = dto.SmtpUser;
        s.SmtpFrom = dto.SmtpFrom; s.SmtpFromName = dto.SmtpFromName;
        if (dto.SmtpSsl is { } ssl) s.SmtpSsl = ssl;
        // Şifre yalnızca yeni bir değer gönderildiyse güncellenir (boş = mevcut korunur).
        if (!string.IsNullOrEmpty(dto.SmtpPassword)) s.SmtpPassword = dto.SmtpPassword;
        s.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Ayarlar kaydedildi." });
    }
}
