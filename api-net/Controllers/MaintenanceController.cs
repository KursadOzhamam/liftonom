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
    public record UpdateDto(string? Type, DateTime? PlannedDate, string? Status, string? TechnicianNote,
        List<long>? AssignedUsers, string? Description, bool? IsCritical, string? Notes);
    public record CompleteDto(string? TechnicianNote, string? CustomerSignatureUrl);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string? search, [FromQuery] string? status, [FromQuery] string? type,
        [FromQuery(Name = "elevator_id")] long? elevatorId, [FromQuery(Name = "region_id")] long? regionId,
        [FromQuery(Name = "technician_id")] long? technicianId, [FromQuery] DateTime? from, [FromQuery] DateTime? to,
        [FromQuery] bool mine = false, [FromQuery] string sort = "newest",
        [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var q = db.MaintenanceRecords.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(m => EF.Functions.ILike(m.Elevator!.Name ?? "", $"%{search}%")
                || EF.Functions.ILike(m.Elevator!.Building!.Name, $"%{search}%")
                || EF.Functions.ILike(m.Elevator!.Building!.Customer!.Name, $"%{search}%")
                || EF.Functions.ILike(m.Notes ?? "", $"%{search}%")
                || EF.Functions.ILike(m.Description ?? "", $"%{search}%"));
        if (!string.IsNullOrEmpty(status)) q = q.Where(m => m.Status == status);
        if (!string.IsNullOrEmpty(type)) q = q.Where(m => m.Type == type);
        if (elevatorId is { } e) q = q.Where(m => m.ElevatorId == e);
        if (regionId is { } r) q = q.Where(m => m.Elevator!.Building!.RegionId == r);
        if (from is { } f) { var fu = DateTime.SpecifyKind(f, DateTimeKind.Utc); q = q.Where(m => m.PlannedDate >= fu); }
        if (to is { } t) { var tu = DateTime.SpecifyKind(t, DateTimeKind.Utc); q = q.Where(m => m.PlannedDate <= tu); }
        if (technicianId is { } tid) q = q.Where(m => EF.Functions.JsonContains(m.AssignedUsers!, $"[{tid}]"));
        if (mine) { var uid = long.Parse(User.FindFirst("uid")!.Value); q = q.Where(m => EF.Functions.JsonContains(m.AssignedUsers!, $"[{uid}]")); }

        q = sort switch
        {
            "oldest" => q.OrderBy(m => m.PlannedDate),
            "planned_asc" => q.OrderBy(m => m.PlannedDate),
            _ => q.OrderByDescending(m => m.PlannedDate).ThenByDescending(m => m.Id),
        };

        var projected = q.Select(m => new
        {
            m.Id, m.Type, m.Status, m.PlannedDate, m.CompletedAt, m.IsCritical, m.AssignedUsers,
            ElevatorName = m.Elevator!.Name,
            BuildingName = m.Elevator!.Building!.Name,
            CustomerName = m.Elevator!.Building!.Customer!.Name,
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

    public record BulkDto(int Year, int Month, int StartDay, bool? HolidayShift,
        string? Distribution, string? Strategy, long? TechnicianId, bool? FeeOnly,
        long? RegionId, long? CustomerId, long? BuildingId, List<long>? ElevatorIds,
        string? Type, bool? SkipExisting, bool? Preview);

    /// <summary>Aylık toplu bakım — dönem/dağılım/atama/hedef; Preview=true iken hiçbir kayıt yazmaz, plan döner.</summary>
    [HttpPost("bulk")]
    public async Task<IActionResult> Bulk(BulkDto dto)
    {
        var uid = long.Parse(User.FindFirst("uid")!.Value);
        var now = DateTime.UtcNow;
        var year = dto.Year <= 0 ? now.Year : dto.Year;
        var month = Math.Clamp(dto.Month <= 0 ? now.Month : dto.Month, 1, 12);
        var startDay = Math.Clamp(dto.StartDay <= 0 ? 1 : dto.StartDay, 1, 28);
        var startDate = new DateTime(year, month, startDay, 0, 0, 0, DateTimeKind.Utc);
        var shift = dto.HolidayShift ?? false;
        var dist = dto.Distribution ?? "single";
        var strategy = dto.Strategy ?? "same";

        // Hedef asansörler
        var q = db.Elevators.Include(e => e.Building).AsQueryable();
        if (dto.ElevatorIds is { Count: > 0 } ids) q = q.Where(e => ids.Contains(e.Id));
        else
        {
            if (dto.BuildingId is { } bid) q = q.Where(e => e.BuildingId == bid);
            if (dto.CustomerId is { } cid) q = q.Where(e => e.Building!.CustomerId == cid);
            if (dto.RegionId is { } rid) q = q.Where(e => e.Building!.RegionId == rid);
        }
        var elevators = await q.Select(e => new
        {
            e.Id, Name = e.Name ?? $"#{e.Id}", e.BuildingId,
            BuildingName = e.Building!.Name, e.Building.CustomerId, DefaultTech = e.Building.DefaultTechnicianUserId,
        }).ToListAsync();

        // Yalnızca bakım ücreti tanımlı asansörler
        if (dto.FeeOnly ?? false)
        {
            var fees = await db.MaintenanceFees.Where(f => f.IsActive).Select(f => new { f.BuildingId, f.CustomerId }).ToListAsync();
            var feeB = fees.Where(f => f.BuildingId != null).Select(f => f.BuildingId!.Value).ToHashSet();
            var feeC = fees.Where(f => f.CustomerId != null).Select(f => f.CustomerId!.Value).ToHashSet();
            elevators = elevators.Where(e => (e.BuildingId != null && feeB.Contains(e.BuildingId.Value))
                || (e.CustomerId != null && feeC.Contains(e.CustomerId.Value))).ToList();
        }

        // Bu ay zaten planlı olanları atla
        var skip = dto.SkipExisting ?? true;
        var existing = skip
            ? (await db.MaintenanceRecords.Where(m => m.PlannedDate!.Value.Year == year && m.PlannedDate.Value.Month == month)
                .Select(m => m.ElevatorId).ToListAsync()).Where(x => x != null).Select(x => x!.Value).ToHashSet()
            : new HashSet<long>();

        var targets = elevators.Where(e => !(skip && existing.Contains(e.Id))).ToList();
        var skipped = elevators.Count - targets.Count;

        // Tarih dağılımı
        static DateTime NextWeekday(DateTime d)
        {
            while (d.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) d = d.AddDays(1);
            return d;
        }
        var weekdays = new List<DateTime>();
        if (dist == "weekdays")
        {
            for (var d = startDate; d.Month == month; d = d.AddDays(1))
                if (d.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday)) weekdays.Add(d);
            if (weekdays.Count == 0) weekdays.Add(NextWeekday(startDate));
        }
        var n = targets.Count;
        DateTime DateFor(int i) => dist == "weekdays"
            ? weekdays[(int)((long)i * weekdays.Count / Math.Max(1, n))]
            : (shift ? NextWeekday(startDate) : startDate);

        long? TechFor(long? buildingDefault) => strategy == "building_default" ? (buildingDefault ?? dto.TechnicianId) : dto.TechnicianId;

        // Teknisyen adları
        var techIds = targets.Select(e => TechFor(e.DefaultTech)).Where(x => x != null).Select(x => x!.Value).Distinct().ToList();
        var techNames = await db.Users.Where(u => techIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => (u.Name + " " + (u.Surname ?? "")).Trim());

        var plan = new List<object>(n);
        for (int i = 0; i < n; i++)
        {
            var e = targets[i];
            var tech = TechFor(e.DefaultTech);
            plan.Add(new
            {
                ElevatorId = e.Id, ElevatorName = e.Name, BuildingName = e.BuildingName,
                PlannedDate = DateFor(i),
                TechnicianId = tech,
                TechnicianName = tech != null && techNames.TryGetValue(tech.Value, out var tn) ? tn : null,
            });
        }

        if (dto.Preview ?? false)
            return Ok(new { preview = true, count = n, skipped, total = elevators.Count, items = plan });

        var created = 0;
        for (int i = 0; i < n; i++)
        {
            var e = targets[i];
            var tech = TechFor(e.DefaultTech);
            db.MaintenanceRecords.Add(new MaintenanceRecord
            {
                TenantId = db.CurrentTenantId!.Value, ElevatorId = e.Id, Type = dto.Type ?? "periodic",
                PlannedDate = DateFor(i), Status = "pending",
                AssignedUsers = tech != null ? $"[{tech}]" : "[]",
                CreatedBy = uid, CreatedAt = now, UpdatedAt = now,
            });
            created++;
        }
        await db.SaveChangesAsync();
        return Ok(new { message = $"{created} bakım oluşturuldu.", created, skipped, total = elevators.Count });
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Show(long id) =>
        Ok(await db.MaintenanceRecords.Include(m => m.Elevator!).ThenInclude(e => e.Building!).ThenInclude(b => b.Customer)
            .FirstOrDefaultAsync(m => m.Id == id)
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
        if (dto.AssignedUsers != null) m.AssignedUsers = System.Text.Json.JsonSerializer.Serialize(dto.AssignedUsers);
        if (dto.Description != null) m.Description = dto.Description;
        if (dto.IsCritical is { } ic) m.IsCritical = ic;
        if (dto.Notes != null) m.Notes = dto.Notes;
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
