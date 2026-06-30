using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

/// <summary>Süper Admin — platform geneli firma yönetimi (admin JWT gerekir).</summary>
[ApiController]
[Authorize(Policy = "Admin")]
[Route("api/v1/admin")]
public class AdminController(AppDbContext db, TokenService tokens) : ControllerBase
{
    public record TenantUpdateDto(bool? IsActive, string? Plan, DateTime? PlanExpiresAt);
    public record AdminCreateDto(string? Name, string Email, string Password);
    public record AdminUpdateDto(string? Name, string? Email, bool? IsActive, string? Password);

    private long CurrentAdminId => long.Parse(User.FindFirst("aid")!.Value);

    [HttpGet("stats")]
    public async Task<IActionResult> Stats() => Ok(new
    {
        tenants = await db.Tenants.IgnoreQueryFilters().CountAsync(t => t.DeletedAt == null),
        active_tenants = await db.Tenants.IgnoreQueryFilters().CountAsync(t => t.DeletedAt == null && t.IsActive),
        users = await db.Users.IgnoreQueryFilters().CountAsync(u => u.DeletedAt == null),
        elevators = await db.Elevators.IgnoreQueryFilters().CountAsync(e => e.DeletedAt == null),
    });

    [HttpGet("tenants")]
    public async Task<IActionResult> Tenants([FromQuery] string? search,
        [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var q = db.Tenants.IgnoreQueryFilters().Where(t => t.DeletedAt == null);
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(t => EF.Functions.ILike(t.Name, $"%{search}%") || EF.Functions.ILike(t.Slug, $"%{search}%"));

        var projected = q.OrderByDescending(t => t.Id).Select(t => new
        {
            t.Id, t.Name, t.Slug, t.Plan, t.PlanExpiresAt, t.IsActive, t.SmsBalance, t.CreatedAt,
            UsersCount = db.Users.IgnoreQueryFilters().Count(u => u.TenantId == t.Id && u.DeletedAt == null),
            ElevatorsCount = db.Elevators.IgnoreQueryFilters().Count(e => e.TenantId == t.Id && e.DeletedAt == null),
        });
        return Ok(await projected.ToPagedAsync(page, perPage));
    }

    [HttpGet("tenants/{id:long}")]
    public async Task<IActionResult> TenantDetail(long id)
    {
        var t = await db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new ApiException(404, "Firma bulunamadı.");
        return Ok(t);
    }

    [HttpPut("tenants/{id:long}")]
    public async Task<IActionResult> UpdateTenant(long id, TenantUpdateDto dto)
    {
        var t = await db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new ApiException(404, "Firma bulunamadı.");
        if (dto.IsActive is { } a) t.IsActive = a;
        if (dto.Plan != null) t.Plan = dto.Plan;
        if (dto.PlanExpiresAt is { } pe) t.PlanExpiresAt = DateTime.SpecifyKind(pe, DateTimeKind.Utc);
        t.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Firma güncellendi.", t.IsActive, t.Plan });
    }

    /// <summary>Firma adına giriş (impersonate) — destek için o firmanın yöneticisi olarak token üret.</summary>
    [HttpPost("tenants/{id:long}/impersonate")]
    public async Task<IActionResult> Impersonate(long id)
    {
        var manager = await db.Users.IgnoreQueryFilters().Include(u => u.Tenant)
            .Where(u => u.TenantId == id && u.Role == "manager" && u.DeletedAt == null && u.IsActive)
            .FirstOrDefaultAsync() ?? throw new ApiException(404, "Firmada yönetici bulunamadı.");

        return Ok(new
        {
            token = tokens.Create(manager),
            tenant = new { manager.Tenant!.Id, manager.Tenant.Name, manager.Tenant.Slug },
            user = new { manager.Id, manager.Name, manager.Role },
        });
    }

    // ───────────────────────── Platform Yöneticileri ─────────────────────────

    /// <summary>Platform (süper admin) yöneticilerini listele.</summary>
    [HttpGet("admins")]
    public async Task<IActionResult> Admins() =>
        Ok(await db.PlatformAdmins
            .OrderBy(a => a.Id)
            .Select(a => new { a.Id, a.Name, a.Email, a.IsActive, a.LastLoginAt, a.CreatedAt })
            .ToListAsync());

    /// <summary>Yeni platform yöneticisi oluştur.</summary>
    [HttpPost("admins")]
    public async Task<IActionResult> CreateAdmin(AdminCreateDto dto)
    {
        var email = dto.Email.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email)) throw new ApiException(422, "E-posta zorunludur.");
        if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length < 6)
            throw new ApiException(422, "Şifre en az 6 karakter olmalıdır.");
        if (await db.PlatformAdmins.AnyAsync(a => a.Email == email))
            throw new ApiException(422, "Bu e-posta zaten kayıtlı.");

        var now = DateTime.UtcNow;
        var admin = new PlatformAdmin
        {
            Name = dto.Name, Email = email,
            Password = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            IsActive = true, CreatedAt = now, UpdatedAt = now,
        };
        db.PlatformAdmins.Add(admin);
        await db.SaveChangesAsync();
        return StatusCode(201, new { admin.Id, admin.Name, admin.Email, admin.IsActive });
    }

    /// <summary>Platform yöneticisini güncelle (ad, e-posta, durum, şifre).</summary>
    [HttpPut("admins/{id:long}")]
    public async Task<IActionResult> UpdateAdmin(long id, AdminUpdateDto dto)
    {
        var admin = await db.PlatformAdmins.FindAsync(id)
            ?? throw new ApiException(404, "Yönetici bulunamadı.");

        if (dto.IsActive is false && id == CurrentAdminId)
            throw new ApiException(422, "Kendi hesabınızı pasife alamazsınız.");

        if (dto.Name != null) admin.Name = dto.Name;
        if (!string.IsNullOrWhiteSpace(dto.Email))
        {
            var email = dto.Email.Trim().ToLowerInvariant();
            if (await db.PlatformAdmins.AnyAsync(a => a.Email == email && a.Id != id))
                throw new ApiException(422, "Bu e-posta zaten kayıtlı.");
            admin.Email = email;
        }
        if (dto.IsActive is { } act) admin.IsActive = act;
        if (!string.IsNullOrWhiteSpace(dto.Password))
        {
            if (dto.Password.Length < 6) throw new ApiException(422, "Şifre en az 6 karakter olmalıdır.");
            admin.Password = BCrypt.Net.BCrypt.HashPassword(dto.Password);
        }
        admin.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { admin.Id, admin.Name, admin.Email, admin.IsActive });
    }

    /// <summary>Platform yöneticisini sil (kendini veya son yöneticiyi silemez).</summary>
    [HttpDelete("admins/{id:long}")]
    public async Task<IActionResult> DeleteAdmin(long id)
    {
        if (id == CurrentAdminId) throw new ApiException(422, "Kendi hesabınızı silemezsiniz.");
        var admin = await db.PlatformAdmins.FindAsync(id)
            ?? throw new ApiException(404, "Yönetici bulunamadı.");
        if (await db.PlatformAdmins.CountAsync() <= 1)
            throw new ApiException(422, "Son platform yöneticisi silinemez.");

        db.PlatformAdmins.Remove(admin);
        await db.SaveChangesAsync();
        return Ok(new { message = "Yönetici silindi." });
    }

    // ───────────────────────── Firma oluştur / sil ─────────────────────────

    public record TenantCreateDto(string CompanyName, string? Plan, string ManagerName, string? ManagerSurname,
        string Phone, string? Email, string Password);

    /// <summary>Yeni firma (tenant) + ilk yönetici kullanıcı oluştur (OTP'siz, admin tarafından).</summary>
    [HttpPost("tenants")]
    public async Task<IActionResult> CreateTenant(TenantCreateDto dto, [FromServices] ITenantContext tenantCtx)
    {
        if (string.IsNullOrWhiteSpace(dto.CompanyName)) throw new ApiException(422, "Firma adı zorunludur.");
        var phone = PhoneHelper.Normalize(dto.Phone);
        if (!PhoneHelper.IsValid(phone)) throw new ApiException(422, "Geçerli bir cep telefonu girin.");
        if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length < 6)
            throw new ApiException(422, "Şifre en az 6 karakter olmalıdır.");

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

        tenantCtx.TenantId = tenant.Id;

        db.Users.Add(new User
        {
            TenantId = tenant.Id, Name = dto.ManagerName, Surname = dto.ManagerSurname, Phone = phone, Email = dto.Email,
            Password = BCrypt.Net.BCrypt.HashPassword(dto.Password), Role = "manager", IsActive = true,
            CreatedAt = now, UpdatedAt = now,
        });

        var plan = await db.Plans.FirstOrDefaultAsync(p => p.Code == planCode);
        db.Subscriptions.Add(new Subscription
        {
            TenantId = tenant.Id, PlanId = plan?.Id, Status = "trialing", StartedAt = now,
            CurrentPeriodEnd = now.AddDays(30), CreatedAt = now, UpdatedAt = now,
        });
        db.SmsPreferences.Add(new SmsPreference { TenantId = tenant.Id, CreatedAt = now, UpdatedAt = now });

        await db.SaveChangesAsync();
        await tx.CommitAsync();

        return StatusCode(201, new { tenant.Id, tenant.Name, tenant.Slug });
    }

    /// <summary>Firmayı sil (soft-delete).</summary>
    [HttpDelete("tenants/{id:long}")]
    public async Task<IActionResult> DeleteTenant(long id)
    {
        var t = await db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null)
            ?? throw new ApiException(404, "Firma bulunamadı.");
        t.DeletedAt = DateTime.UtcNow;
        t.IsActive = false;
        t.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Firma silindi." });
    }

    /// <summary>Firmanın kullanıcıları.</summary>
    [HttpGet("tenants/{id:long}/users")]
    public async Task<IActionResult> TenantUsers(long id) =>
        Ok(await db.Users.IgnoreQueryFilters()
            .Where(u => u.TenantId == id && u.DeletedAt == null)
            .OrderByDescending(u => u.Id)
            .Select(u => new { u.Id, u.Name, u.Surname, u.Phone, u.Email, u.Role, u.IsActive, u.LastLoginAt })
            .ToListAsync());

    /// <summary>Firmanın abonelik ödemeleri.</summary>
    [HttpGet("tenants/{id:long}/payments")]
    public async Task<IActionResult> TenantPayments(long id) =>
        Ok(await db.SubscriptionPayments.IgnoreQueryFilters()
            .Where(p => p.TenantId == id)
            .OrderByDescending(p => p.Id)
            .Select(p => new { p.Id, p.Amount, p.Currency, p.Status, p.PaidAt, p.CreatedAt })
            .ToListAsync());

    // ───────────────────────── Gelir / Abonelik ─────────────────────────

    /// <summary>Platform geneli gelir & abonelik özeti.</summary>
    [HttpGet("revenue")]
    public async Task<IActionResult> Revenue()
    {
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var payments = db.SubscriptionPayments.IgnoreQueryFilters();

        var totalRevenue = await payments.Where(p => p.Status == "success").SumAsync(p => (decimal?)p.Amount) ?? 0;
        var thisMonth = await payments.Where(p => p.Status == "success" && p.PaidAt != null && p.PaidAt >= monthStart)
            .SumAsync(p => (decimal?)p.Amount) ?? 0;

        var byStatus = await payments.GroupBy(p => p.Status)
            .Select(g => new { status = g.Key, count = g.Count(), total = g.Sum(x => x.Amount) }).ToListAsync();

        // MRR: aktif firmaların plan aylık ücretleri toplamı
        var prices = await db.Plans.ToDictionaryAsync(p => p.Code, p => p.MonthlyPrice);
        var activePlans = await db.Tenants.IgnoreQueryFilters()
            .Where(t => t.DeletedAt == null && t.IsActive).Select(t => t.Plan).ToListAsync();
        var mrr = activePlans.Sum(code => prices.TryGetValue(code, out var pr) ? pr : 0m);

        // Son 12 ay başarılı ödeme serisi
        var since = new DateTime(DateTime.UtcNow.AddMonths(-11).Year, DateTime.UtcNow.AddMonths(-11).Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var raw = await payments
            .Where(p => p.Status == "success" && p.PaidAt != null && p.PaidAt >= since)
            .GroupBy(p => new { p.PaidAt!.Value.Year, p.PaidAt!.Value.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Total = g.Sum(x => x.Amount) })
            .ToListAsync();
        var monthly = raw.OrderBy(x => x.Year).ThenBy(x => x.Month)
            .Select(x => new { month = $"{x.Year:D4}-{x.Month:D2}", total = x.Total });

        var recent = await payments.OrderByDescending(p => p.Id).Take(10)
            .Select(p => new
            {
                p.Id, p.Amount, p.Currency, p.Status, p.PaidAt,
                tenant = db.Tenants.IgnoreQueryFilters().Where(t => t.Id == p.TenantId).Select(t => t.Name).FirstOrDefault(),
            }).ToListAsync();

        return Ok(new { total_revenue = totalRevenue, this_month = thisMonth, mrr, by_status = byStatus, monthly, recent });
    }

    // ───────────────────────── Plan yönetimi ─────────────────────────

    public record PlanDto(string Code, string Name, decimal MonthlyPrice, int? MaxUsers, int? MaxElevators, bool? IsActive);

    [HttpGet("plans")]
    public async Task<IActionResult> Plans() =>
        Ok(await db.Plans.OrderBy(p => p.MonthlyPrice)
            .Select(p => new { p.Id, p.Code, p.Name, p.MonthlyPrice, p.MaxUsers, p.MaxElevators, p.IsActive })
            .ToListAsync());

    [HttpPost("plans")]
    public async Task<IActionResult> CreatePlan(PlanDto dto)
    {
        var code = dto.Code.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(code)) throw new ApiException(422, "Plan kodu zorunludur.");
        if (await db.Plans.AnyAsync(p => p.Code == code)) throw new ApiException(422, "Bu plan kodu zaten var.");
        var now = DateTime.UtcNow;
        var plan = new Plan
        {
            Code = code, Name = dto.Name, MonthlyPrice = dto.MonthlyPrice,
            MaxUsers = dto.MaxUsers, MaxElevators = dto.MaxElevators, IsActive = dto.IsActive ?? true,
            CreatedAt = now, UpdatedAt = now,
        };
        db.Plans.Add(plan);
        await db.SaveChangesAsync();
        return StatusCode(201, new { plan.Id, plan.Code, plan.Name, plan.MonthlyPrice });
    }

    [HttpPut("plans/{id:long}")]
    public async Task<IActionResult> UpdatePlan(long id, PlanDto dto)
    {
        var plan = await db.Plans.FindAsync(id) ?? throw new ApiException(404, "Plan bulunamadı.");
        if (!string.IsNullOrWhiteSpace(dto.Name)) plan.Name = dto.Name;
        plan.MonthlyPrice = dto.MonthlyPrice;
        plan.MaxUsers = dto.MaxUsers;
        plan.MaxElevators = dto.MaxElevators;
        if (dto.IsActive is { } a) plan.IsActive = a;
        plan.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { plan.Id, plan.Code, plan.Name, plan.MonthlyPrice, plan.IsActive });
    }

    // ───────────────────────── Yardımcılar ─────────────────────────

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
