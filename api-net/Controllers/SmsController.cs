using LiftOtonom.Api.Data;
using LiftOtonom.Api.Models;
using LiftOtonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LiftOtonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/sms")]
public class SmsController(AppDbContext db, ISmsSender sms) : ControllerBase
{
    public record SendDto(string Phone, string Message);
    public record PrefDto(bool? MaintenanceReminder, bool? MaintenanceCompleted, bool? NewFault, bool? FaultResolved,
        bool? InvoiceCreated, bool? PaymentReceived, bool? TseExpiry, int? ReminderDaysBefore);

    private long TenantId => db.CurrentTenantId!.Value;

    [HttpGet("balance")]
    public async Task<IActionResult> Balance()
    {
        var tenant = await db.Tenants.FindAsync(TenantId);
        return Ok(new { balance = tenant!.SmsBalance, sent_total = await db.SmsLogs.CountAsync() });
    }

    [HttpGet("history")]
    public async Task<IActionResult> History([FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1) =>
        Ok(await db.SmsLogs.OrderByDescending(s => s.Id).ToPagedAsync(page, perPage));

    [HttpPost("send")]
    public async Task<IActionResult> Send(SendDto dto)
    {
        var tenant = await db.Tenants.FindAsync(TenantId);
        if (tenant!.SmsBalance <= 0) throw new ApiException(402, "SMS bakiyeniz yetersiz.");

        var phone = PhoneHelper.Normalize(dto.Phone);
        await sms.SendAsync(phone, dto.Message, "manual");
        tenant.SmsBalance -= 1;
        await db.SaveChangesAsync();

        return Ok(new { message = "SMS gönderildi.", remaining = tenant.SmsBalance });
    }

    [HttpGet("preferences")]
    public async Task<IActionResult> GetPreferences() => Ok(await Prefs());

    [HttpPut("preferences")]
    public async Task<IActionResult> UpdatePreferences(PrefDto dto)
    {
        var p = await Prefs();
        if (dto.MaintenanceReminder is { } a) p.MaintenanceReminder = a;
        if (dto.MaintenanceCompleted is { } b) p.MaintenanceCompleted = b;
        if (dto.NewFault is { } c) p.NewFault = c;
        if (dto.FaultResolved is { } d) p.FaultResolved = d;
        if (dto.InvoiceCreated is { } e) p.InvoiceCreated = e;
        if (dto.PaymentReceived is { } f) p.PaymentReceived = f;
        if (dto.TseExpiry is { } g) p.TseExpiry = g;
        if (dto.ReminderDaysBefore is { } h) p.ReminderDaysBefore = h;
        p.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(p);
    }

    private async Task<SmsPreference> Prefs()
    {
        var p = await db.SmsPreferences.FirstOrDefaultAsync(x => x.TenantId == TenantId);
        if (p == null)
        {
            p = new SmsPreference { TenantId = TenantId, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
            db.SmsPreferences.Add(p);
            await db.SaveChangesAsync();
        }
        return p;
    }
}
