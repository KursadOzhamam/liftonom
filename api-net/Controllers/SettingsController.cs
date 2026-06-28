using LiftOtonom.Api.Data;
using LiftOtonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LiftOtonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/settings")]
public class SettingsController(AppDbContext db) : ControllerBase
{
    public record SettingsDto(string? Name, string? Phone, string? Email, string? Address, string? TaxNumber, string? TaxOffice);

    [HttpGet]
    public async Task<IActionResult> Show()
    {
        var t = await db.Tenants.FindAsync(db.CurrentTenantId!.Value) ?? throw new ApiException(404, "Firma bulunamadı.");
        return Ok(new
        {
            t.Name, t.Slug, t.Phone, t.Email, t.Address, t.TaxNumber, t.TaxOffice, t.LogoUrl,
            t.Plan, t.PlanExpiresAt, t.SmsBalance,
        });
    }

    [HttpPut]
    [Authorize(Roles = "manager")]
    public async Task<IActionResult> Update(SettingsDto dto)
    {
        var t = await db.Tenants.FindAsync(db.CurrentTenantId!.Value) ?? throw new ApiException(404, "Firma bulunamadı.");
        if (!string.IsNullOrWhiteSpace(dto.Name)) t.Name = dto.Name;
        t.Phone = dto.Phone; t.Email = dto.Email; t.Address = dto.Address;
        t.TaxNumber = dto.TaxNumber; t.TaxOffice = dto.TaxOffice; t.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Firma bilgileri güncellendi." });
    }
}
