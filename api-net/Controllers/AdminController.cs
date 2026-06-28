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
}
