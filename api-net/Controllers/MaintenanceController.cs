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
public class MaintenanceController(AppDbContext db, PdfService pdf) : ControllerBase
{
    public record CreateDto(long ElevatorId, string Type, DateTime PlannedDate,
        List<long>? AssignedUsers, bool? IsRecurring, string? RecurringPeriod, string? TechnicianNote,
        string? Description, bool? IsCritical, string? Notes, string? Status, DateTime? CompletedAt);
    public record UpdateDto(string? Type, DateTime? PlannedDate, string? Status, string? TechnicianNote);
    public record CompleteDto(string? TechnicianNote, string? CustomerSignatureUrl);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string? status, [FromQuery] string? type,
        [FromQuery(Name = "elevator_id")] long? elevatorId, [FromQuery] DateTime? from, [FromQuery] DateTime? to,
        [FromQuery] bool mine = false,
        [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var q = db.MaintenanceRecords.AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(m => m.Status == status);
        if (!string.IsNullOrEmpty(type)) q = q.Where(m => m.Type == type);
        if (elevatorId is { } e) q = q.Where(m => m.ElevatorId == e);
        if (from is { } f) q = q.Where(m => m.PlannedDate >= f);
        if (to is { } t) q = q.Where(m => m.PlannedDate <= t);
        // Teknisyene atanan bakımlar: assigned_users jsonb dizisi uid'yi içerir
        if (mine) { var uid = long.Parse(User.FindFirst("uid")!.Value); q = q.Where(m => EF.Functions.JsonContains(m.AssignedUsers!, $"[{uid}]")); }

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
        // Query string'den gelen DateTime Kind=Unspecified olur; timestamptz karşılaştırması için UTC'ye çevir.
        if (start is { } s) { var su = DateTime.SpecifyKind(s, DateTimeKind.Utc); q = q.Where(m => m.PlannedDate >= su); }
        if (end is { } e) { var eu = DateTime.SpecifyKind(e, DateTimeKind.Utc); q = q.Where(m => m.PlannedDate <= eu); }
        return Ok(await q.Select(m => new { m.Id, m.ElevatorId, m.Type, m.Status, m.PlannedDate }).ToListAsync());
    }

    [HttpPost]
    public async Task<IActionResult> Store(CreateDto dto, [FromServices] PushService push)
    {
        var uid = long.Parse(User.FindFirst("uid")!.Value);
        var now = DateTime.UtcNow;
        var m = new MaintenanceRecord
        {
            TenantId = db.CurrentTenantId!.Value,
            ElevatorId = dto.ElevatorId, Type = dto.Type,
            PlannedDate = DateTime.SpecifyKind(dto.PlannedDate, DateTimeKind.Utc),
            Status = dto.Status ?? "pending",
            CompletedAt = dto.CompletedAt is { } c ? DateTime.SpecifyKind(c, DateTimeKind.Utc) : null,
            AssignedUsers = JsonSerializer.Serialize(dto.AssignedUsers ?? []),
            IsRecurring = dto.IsRecurring ?? false, RecurringPeriod = dto.RecurringPeriod,
            TechnicianNote = dto.TechnicianNote, Description = dto.Description,
            IsCritical = dto.IsCritical ?? false, Notes = dto.Notes,
            CreatedBy = uid, CreatedAt = now, UpdatedAt = now,
        };
        db.MaintenanceRecords.Add(m);
        await db.SaveChangesAsync();

        // Atanan teknisyenlere bildirim + push (yalnızca planlı/açık kayıtlarda)
        var assigned = m.Status == "completed" ? [] : (dto.AssignedUsers ?? []).Distinct().ToList();
        foreach (var auid in assigned)
        {
            db.Notifications.Add(new Models.Notification
            {
                TenantId = m.TenantId, UserId = auid, Title = "Yeni bakım atandı",
                Body = $"Planlı bakım: {m.PlannedDate:dd.MM.yyyy}", Type = "maintenance",
                Link = $"/maintenance/{m.Id}", CreatedAt = now,
            });
        }
        if (assigned.Count > 0)
        {
            await db.SaveChangesAsync();
            foreach (var auid in assigned)
                await push.SendToUserAsync(auid, "Yeni bakım atandı",
                    $"Planlı bakım: {m.PlannedDate:dd.MM.yyyy}", new() { ["type"] = "maintenance", ["id"] = m.Id.ToString() });
        }

        return StatusCode(201, m);
    }

    public record BulkDto(DateTime PlannedDate, string? Type, long? RegionId, bool? SkipExisting);

    /// <summary>Aylık toplu bakım: tüm (veya bölgedeki) asansörler için planlı bakım kaydı oluşturur.</summary>
    [HttpPost("bulk")]
    public async Task<IActionResult> Bulk(BulkDto dto)
    {
        var uid = long.Parse(User.FindFirst("uid")!.Value);
        var now = DateTime.UtcNow;
        var planned = DateTime.SpecifyKind(dto.PlannedDate, DateTimeKind.Utc).Date;

        var elevatorsQ = db.Elevators.AsQueryable();
        if (dto.RegionId is { } rid)
            elevatorsQ = elevatorsQ.Where(e => db.Buildings.Any(b => b.Id == e.BuildingId && b.RegionId == rid));
        var elevatorIds = await elevatorsQ.Select(e => e.Id).ToListAsync();

        // Aynı gün zaten planlı olanları atla (varsayılan true)
        var skip = dto.SkipExisting ?? true;
        var existing = skip
            ? await db.MaintenanceRecords.Where(m => m.PlannedDate!.Value.Date == planned).Select(m => m.ElevatorId).ToListAsync()
            : new List<long?>();

        var created = 0;
        foreach (var eid in elevatorIds)
        {
            if (skip && existing.Contains(eid)) continue;
            db.MaintenanceRecords.Add(new MaintenanceRecord
            {
                TenantId = db.CurrentTenantId!.Value, ElevatorId = eid, Type = dto.Type ?? "periodic",
                PlannedDate = planned, Status = "pending", AssignedUsers = "[]",
                CreatedBy = uid, CreatedAt = now, UpdatedAt = now,
            });
            created++;
        }
        await db.SaveChangesAsync();
        return Ok(new { message = $"{created} bakım oluşturuldu.", created, total_elevators = elevatorIds.Count });
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

    [HttpGet("{id:long}/pdf")]
    public async Task<IActionResult> Pdf(long id)
    {
        var m = await db.MaintenanceRecords.Include(x => x.Elevator)!.ThenInclude(e => e!.Building)
            .FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Bakım kaydı bulunamadı.");
        var tenant = await db.Tenants.FindAsync(db.CurrentTenantId!.Value);
        var bytes = pdf.GenerateMaintenanceReport(m, tenant!, m.Elevator?.Name ?? "-",
            m.Elevator?.Building?.Name, m.Checklist);
        return File(bytes, "application/pdf", $"bakim-{m.Id}.pdf");
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
