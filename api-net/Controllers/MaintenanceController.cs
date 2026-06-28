using System.Text.Json;
using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/maintenance")]
public class MaintenanceController(AppDbContext db) : ControllerBase
{
    public record CreateDto(long ElevatorId, string Type, DateTime PlannedDate,
        List<long>? AssignedUsers, bool? IsRecurring, string? RecurringPeriod, string? TechnicianNote);
    public record UpdateDto(string? Type, DateTime? PlannedDate, string? Status, string? TechnicianNote);
    public record CompleteDto(string? TechnicianNote, string? CustomerSignatureUrl);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string? status, [FromQuery] string? type,
        [FromQuery(Name = "elevator_id")] long? elevatorId, [FromQuery] DateTime? from, [FromQuery] DateTime? to,
        [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var q = db.MaintenanceRecords.AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(m => m.Status == status);
        if (!string.IsNullOrEmpty(type)) q = q.Where(m => m.Type == type);
        if (elevatorId is { } e) q = q.Where(m => m.ElevatorId == e);
        if (from is { } f) q = q.Where(m => m.PlannedDate >= f);
        if (to is { } t) q = q.Where(m => m.PlannedDate <= t);

        var projected = q.OrderByDescending(m => m.PlannedDate).Select(m => new
        {
            m.Id, m.Type, m.Status, m.PlannedDate, m.CompletedAt,
            Elevator = m.ElevatorId == null ? null : new { Name = m.Elevator!.Name },
        });
        return Ok(await projected.ToPagedAsync(page, perPage));
    }

    [HttpGet("calendar")]
    public async Task<IActionResult> Calendar([FromQuery] DateTime? start, [FromQuery] DateTime? end)
    {
        var q = db.MaintenanceRecords.AsQueryable();
        if (start is { } s) q = q.Where(m => m.PlannedDate >= s);
        if (end is { } e) q = q.Where(m => m.PlannedDate <= e);
        return Ok(await q.Select(m => new { m.Id, m.ElevatorId, m.Type, m.Status, m.PlannedDate }).ToListAsync());
    }

    [HttpPost]
    public async Task<IActionResult> Store(CreateDto dto)
    {
        var uid = long.Parse(User.FindFirst("uid")!.Value);
        var now = DateTime.UtcNow;
        var m = new MaintenanceRecord
        {
            TenantId = db.CurrentTenantId!.Value,
            ElevatorId = dto.ElevatorId, Type = dto.Type,
            PlannedDate = DateTime.SpecifyKind(dto.PlannedDate, DateTimeKind.Utc),
            Status = "pending",
            AssignedUsers = JsonSerializer.Serialize(dto.AssignedUsers ?? []),
            IsRecurring = dto.IsRecurring ?? false, RecurringPeriod = dto.RecurringPeriod,
            TechnicianNote = dto.TechnicianNote, CreatedBy = uid, CreatedAt = now, UpdatedAt = now,
        };
        db.MaintenanceRecords.Add(m);
        await db.SaveChangesAsync();
        return StatusCode(201, m);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Show(long id) =>
        Ok(await db.MaintenanceRecords.Include(m => m.Elevator).FirstOrDefaultAsync(m => m.Id == id)
            ?? throw new ApiException(404, "Bakım kaydı bulunamadı."));

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, UpdateDto dto)
    {
        var m = await db.MaintenanceRecords.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new ApiException(404, "Bakım kaydı bulunamadı.");
        if (dto.Type != null) m.Type = dto.Type;
        if (dto.PlannedDate is { } pd) m.PlannedDate = DateTime.SpecifyKind(pd, DateTimeKind.Utc);
        if (dto.Status != null) m.Status = dto.Status;
        if (dto.TechnicianNote != null) m.TechnicianNote = dto.TechnicianNote;
        m.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(m);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var m = await db.MaintenanceRecords.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new ApiException(404, "Bakım kaydı bulunamadı.");
        m.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Bakım kaydı silindi." });
    }

    [HttpPost("{id:long}/complete")]
    public async Task<IActionResult> Complete(long id, CompleteDto dto)
    {
        var m = await db.MaintenanceRecords.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new ApiException(404, "Bakım kaydı bulunamadı.");

        m.Status = "completed";
        m.CompletedAt = DateTime.UtcNow;
        m.StartedAt ??= DateTime.UtcNow;
        if (dto.TechnicianNote != null) m.TechnicianNote = dto.TechnicianNote;
        if (dto.CustomerSignatureUrl != null) m.CustomerSignatureUrl = dto.CustomerSignatureUrl;
        m.UpdatedAt = DateTime.UtcNow;

        // Asansör bakım tarihleri
        var elevator = await db.Elevators.FirstOrDefaultAsync(e => e.Id == m.ElevatorId);
        if (elevator != null)
        {
            var period = elevator.MaintenancePeriod <= 0 ? 30 : elevator.MaintenancePeriod;
            elevator.LastMaintenanceAt = DateTime.UtcNow;
            elevator.NextMaintenanceAt = DateTime.UtcNow.AddDays(period);
        }

        await db.SaveChangesAsync();
        return Ok(m);
    }
}
