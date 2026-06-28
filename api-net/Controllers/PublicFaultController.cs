using LiftOtonom.Api.Data;
using LiftOtonom.Api.Models;
using LiftOtonom.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LiftOtonom.Api.Controllers;

/// <summary>QR ile GİRİŞSİZ arıza bildirimi (auth YOK).</summary>
[ApiController]
[Route("api/v1/public")]
public class PublicFaultController(AppDbContext db, ITenantContext tenantCtx, FaultNotificationService notify) : ControllerBase
{
    public record FaultDto(string? ReporterName, string? ReporterPhone, string Description);

    [HttpGet("qr/{qrToken}")]
    public async Task<IActionResult> Show(string qrToken)
    {
        var e = await db.Elevators.IgnoreQueryFilters()
            .Include(x => x.Building).FirstOrDefaultAsync(x => x.QrToken == qrToken && x.DeletedAt == null)
            ?? throw new ApiException(404, "Asansör bulunamadı.");
        return Ok(new
        {
            elevator = new { e.Id, e.Name, e.Brand },
            building = e.Building == null ? null : new { e.Building.Name, e.Building.Address },
        });
    }

    [HttpPost("fault-reports/{qrToken}")]
    public async Task<IActionResult> Store(string qrToken, FaultDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Description)) throw new ApiException(422, "Açıklama zorunludur.");
        var e = await db.Elevators.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.QrToken == qrToken && x.DeletedAt == null)
            ?? throw new ApiException(404, "Asansör bulunamadı.");

        tenantCtx.TenantId = e.TenantId; // kayıt doğru firmaya düşsün
        var now = DateTime.UtcNow;
        var fault = new FaultReport
        {
            TenantId = e.TenantId, ElevatorId = e.Id, ReportedByType = "qr", Priority = "normal", Status = "new",
            Description = $"{dto.ReporterName} {dto.ReporterPhone} — {dto.Description}".Trim(),
            CreatedAt = now, UpdatedAt = now,
        };
        db.FaultReports.Add(fault);
        await db.SaveChangesAsync();
        await notify.NotifyAsync(fault, FaultNotificationService.Stage.Created); // otonom WhatsApp
        return StatusCode(201, new { message = "Arıza talebiniz alındı. Ekibimiz en kısa sürede ilgilenecek.", report_id = fault.Id });
    }
}
