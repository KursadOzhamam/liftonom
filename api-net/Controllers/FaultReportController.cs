using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/fault-reports")]
public class FaultReportController(AppDbContext db, FaultNotificationService notify) : ControllerBase
{
    // 6-aşamalı yaşam döngüsü
    private static readonly string[] Statuses =
        ["reported", "acknowledged", "dispatched", "inspected", "repairing", "completed"];

    public record CreateDto(long ElevatorId, string? Title, string? Type, string? Priority, string? Status,
        string? Code, long? AssignedUserId, string? ContactName, string? ContactPhone,
        string Description, string? Symptoms, string? Diagnosis, string? Solution, string? WorkDone,
        bool? UnderWarranty, bool? Billable, string? Notes);
    public record StatusDto(string Status, string? ResolutionNote);
    public record AssignDto(long AssignedUserId);
    public record CommentDto(string Comment);
    public record DispatchDto(double? Lat, double? Lng);
    public record InspectDto(string? Diagnosis, bool NeedsPart, string? PartDetails);
    public record LocationDto(double Lat, double Lng);
    public record CompleteDto(string? ResolutionNote);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string? search, [FromQuery] string? status,
        [FromQuery] string? priority, [FromQuery(Name = "elevator_id")] long? elevatorId,
        [FromQuery(Name = "assigned_user_id")] long? assignedUserId, [FromQuery] bool mine = false,
        [FromQuery] bool open = false, [FromQuery] bool unassigned = false,
        [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var q = db.FaultReports.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(f => EF.Functions.ILike(f.Title ?? "", $"%{search}%")
                || EF.Functions.ILike(f.Description ?? "", $"%{search}%")
                || EF.Functions.ILike(f.Elevator!.Name ?? "", $"%{search}%")
                || EF.Functions.ILike(f.Elevator!.Building!.Name, $"%{search}%")
                || EF.Functions.ILike(f.Elevator!.Building!.Customer!.Name, $"%{search}%"));
        if (!string.IsNullOrEmpty(status)) q = q.Where(f => f.Status == status);
        if (!string.IsNullOrEmpty(priority)) q = q.Where(f => f.Priority == priority);
        if (elevatorId is { } e) q = q.Where(f => f.ElevatorId == e);
        if (assignedUserId is { } u) q = q.Where(f => f.AssignedUserId == u);
        if (open) q = q.Where(f => f.Status != "completed");
        if (unassigned) q = q.Where(f => f.AssignedUserId == null);
        if (mine) { var uid = long.Parse(User.FindFirst("uid")!.Value); q = q.Where(f => f.AssignedUserId == uid); }

        var projected = q.OrderByDescending(f => f.Id).Select(f => new
        {
            f.Id, f.Title, f.Type, f.Priority, f.Status, f.Description, f.CreatedAt, f.EstimatedRepair,
            f.FaultDiagnosis, f.NeedsPart, f.PartDetails,
            ElevatorName = f.Elevator!.Name,
            BuildingName = f.Elevator!.Building!.Name,
            CustomerName = f.Elevator!.Building!.Customer!.Name,
            AssignedUser = f.AssignedUserId == null ? null : new { f.AssignedUserId, f.AssignedUser!.Name, f.AssignedUser.Surname },
            CommentsCount = db.FaultReportComments.Count(c => c.FaultReportId == f.Id),
        });
        return Ok(await projected.ToPagedAsync(page, perPage));
    }

    /// <summary>Ana ekran sayaçları: aktif / tamamlanan / bugün / yüksek öncelik.</summary>
    [HttpGet("summary")]
    public async Task<IActionResult> Summary([FromQuery] bool mine = false)
    {
        var today = DateTime.UtcNow.Date;
        IQueryable<Models.FaultReport> all = db.FaultReports;
        if (mine) { var uid = long.Parse(User.FindFirst("uid")!.Value); all = all.Where(f => f.AssignedUserId == uid); }
        var myUid = long.Parse(User.FindFirst("uid")!.Value);
        return Ok(new
        {
            active = await all.CountAsync(f => f.Status != "completed"),
            completed = await all.CountAsync(f => f.Status == "completed"),
            today = await all.CountAsync(f => f.CreatedAt >= today),
            today_resolved = await all.CountAsync(f => f.Status == "completed" && f.CompletedAt >= today),
            unowned = await db.FaultReports.CountAsync(f => f.Status != "completed" && f.AssignedUserId == null),
            mine = await db.FaultReports.CountAsync(f => f.Status != "completed" && f.AssignedUserId == myUid),
            high = await all.CountAsync(f => (f.Priority == "high" || f.Priority == "urgent") && f.Status != "completed"),
        });
    }

    [HttpGet("kanban")]
    public async Task<IActionResult> Kanban()
    {
        var result = new Dictionary<string, object>();
        foreach (var s in Statuses)
        {
            result[s] = await db.FaultReports.Where(f => f.Status == s)
                .OrderByDescending(f => f.Id).Take(50)
                .Select(f => new { f.Id, f.Priority, f.Status, f.Description,
                    Elevator = f.ElevatorId == null ? null : new { Name = f.Elevator!.Name } })
                .ToListAsync();
        }
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Store(CreateDto dto, [FromServices] PushService push)
    {
        var now = DateTime.UtcNow;
        var f = new FaultReport
        {
            TenantId = db.CurrentTenantId!.Value,
            ElevatorId = dto.ElevatorId, Title = dto.Title, Type = dto.Type, Code = dto.Code,
            Priority = dto.Priority ?? "normal", Status = dto.Status ?? "reported",
            ContactName = dto.ContactName, ContactPhone = dto.ContactPhone,
            Description = dto.Description, Symptoms = dto.Symptoms,
            FaultDiagnosis = dto.Diagnosis, ResolutionNote = dto.Solution, WorkDone = dto.WorkDone,
            UnderWarranty = dto.UnderWarranty ?? false, Billable = dto.Billable ?? true, Notes = dto.Notes,
            AssignedUserId = dto.AssignedUserId, ReportedByType = "user", CreatedAt = now, UpdatedAt = now,
        };
        db.FaultReports.Add(f);
        await db.SaveChangesAsync();
        if (f.AssignedUserId is { } auid)
        {
            db.Notifications.Add(new Models.Notification
            {
                TenantId = f.TenantId, UserId = auid, Title = "Yeni arıza atandı",
                Body = f.Description, Type = "fault", Link = $"/faults/{f.Id}", CreatedAt = now,
            });
            await db.SaveChangesAsync();
            await push.SendToUserAsync(auid, "Yeni arıza atandı", f.Description ?? "Size bir arıza atandı.",
                new() { ["type"] = "fault", ["id"] = f.Id.ToString() });
        }
        await notify.NotifyAsync(f, FaultNotificationService.Stage.Reported); // otonom WhatsApp
        return StatusCode(201, f);
    }

    /// <summary>1→2 İşleme Al → "İşleme Alındı".</summary>
    [HttpPost("{id:long}/acknowledge")]
    public async Task<IActionResult> Acknowledge(long id)
    {
        var f = await Find(id);
        f.Status = "acknowledged";
        f.AcknowledgedAt = Touch(f);
        await db.SaveChangesAsync();
        await notify.NotifyAsync(f, FaultNotificationService.Stage.Acknowledged);
        return Ok(f);
    }

    /// <summary>2→3 Yola Çık → "Servis Yola Çıktı" (+ başlangıç konumu).</summary>
    [HttpPost("{id:long}/dispatch")]
    public async Task<IActionResult> Dispatch(long id, DispatchDto? dto)
    {
        var f = await Find(id);
        f.Status = "dispatched";
        f.DispatchedAt = Touch(f);
        if (dto?.Lat is { } lat && dto.Lng is { } lng)
        {
            f.TechnicianLat = lat; f.TechnicianLng = lng; f.LocationUpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
        await notify.NotifyAsync(f, FaultNotificationService.Stage.Dispatched);
        return Ok(f);
    }

    /// <summary>Canlı konum güncellemesi (web Google Map izleme için).</summary>
    [HttpPost("{id:long}/location")]
    public async Task<IActionResult> UpdateLocation(long id, LocationDto dto)
    {
        var f = await Find(id);
        f.TechnicianLat = dto.Lat; f.TechnicianLng = dto.Lng;
        f.LocationUpdatedAt = DateTime.UtcNow;
        f.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { f.Id, f.TechnicianLat, f.TechnicianLng, f.LocationUpdatedAt });
    }

    /// <summary>3→4 Kontrol Et → "Kontrol Edildi" (+ arıza tanısı/parça formu).</summary>
    [HttpPost("{id:long}/inspect")]
    public async Task<IActionResult> Inspect(long id, InspectDto dto)
    {
        var f = await Find(id);
        f.Status = "inspected";
        f.InspectedAt = Touch(f);
        f.DiagnosedAt ??= DateTime.UtcNow;
        f.FaultDiagnosis = dto.Diagnosis;
        f.NeedsPart = dto.NeedsPart;
        f.PartDetails = dto.PartDetails;
        await db.SaveChangesAsync();
        await notify.NotifyAsync(f, FaultNotificationService.Stage.Inspected);
        return Ok(f);
    }

    /// <summary>4→5 Arızayı Gidermeye Başla → "Arıza Gideriliyor".</summary>
    [HttpPost("{id:long}/start-repair")]
    public async Task<IActionResult> StartRepair(long id)
    {
        var f = await Find(id);
        f.Status = "repairing";
        f.RepairStartedAt = Touch(f);
        await db.SaveChangesAsync();
        await notify.NotifyAsync(f, FaultNotificationService.Stage.Repairing);
        return Ok(f);
    }

    /// <summary>5→6 İş Tamamlandı → "İş Tamamlandı".</summary>
    [HttpPost("{id:long}/complete")]
    public async Task<IActionResult> Complete(long id, CompleteDto? dto)
    {
        var f = await Find(id);
        f.Status = "completed";
        f.CompletedAt = Touch(f);
        f.ResolvedAt = DateTime.UtcNow;
        if (dto?.ResolutionNote != null) f.ResolutionNote = dto.ResolutionNote;
        await db.SaveChangesAsync();
        await notify.NotifyAsync(f, FaultNotificationService.Stage.Completed);
        return Ok(f);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Show(long id)
    {
        var f = await db.FaultReports.Include(x => x.Elevator).Include(x => x.AssignedUser)
            .FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Arıza bulunamadı.");
        var comments = await db.FaultReportComments.Where(c => c.FaultReportId == id)
            .OrderBy(c => c.Id)
            .Select(c => new { c.Id, c.Comment, c.CreatedAt, User = c.User == null ? null : new { c.User.Name, c.User.Surname } })
            .ToListAsync();

        // Hedef (arıza yeri): asansör → bina konumu
        var dest = f.ElevatorId == null ? null : await db.Elevators
            .Where(e => e.Id == f.ElevatorId)
            .Select(e => new { e.Building!.Latitude, e.Building.Longitude, e.Building.Address, e.Building.Name, e.Building.City })
            .FirstOrDefaultAsync();

        return Ok(new { f.Id, f.Title, f.Type, f.Code, f.Priority, f.Status, f.AssignedUserId,
            f.ContactName, f.ContactPhone, f.Description, f.Symptoms, f.WorkDone, f.UnderWarranty, f.Billable, f.Notes,
            f.ResolutionNote, f.CreatedAt, f.ResolvedAt,
            f.EstimatedRepair, f.DispatchedAt, f.DiagnosedAt, f.AcknowledgedAt, f.InspectedAt, f.RepairStartedAt, f.CompletedAt,
            f.FaultDiagnosis, f.NeedsPart, f.PartDetails, f.TechnicianLat, f.TechnicianLng, f.LocationUpdatedAt,
            DestinationLat = dest?.Latitude, DestinationLng = dest?.Longitude,
            DestinationAddress = dest?.Address, DestinationName = dest?.Name, DestinationCity = dest?.City,
            f.Elevator, f.AssignedUser, Comments = comments });
    }

    public record EditDto(string? Title, string? Type, string? Priority, string? Status, string? Code, long? AssignedUserId,
        string? ContactName, string? ContactPhone, string? Description, string? Symptoms, string? Diagnosis,
        string? Solution, string? WorkDone, bool? UnderWarranty, bool? Billable, string? Notes);

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Edit(long id, EditDto dto)
    {
        var f = await db.FaultReports.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Arıza bulunamadı.");
        f.Title = dto.Title; f.Type = dto.Type; f.Code = dto.Code;
        if (dto.Priority != null) f.Priority = dto.Priority;
        if (dto.Status != null && Statuses.Contains(dto.Status)) f.Status = dto.Status;
        f.AssignedUserId = dto.AssignedUserId; f.ContactName = dto.ContactName; f.ContactPhone = dto.ContactPhone;
        f.Description = dto.Description; f.Symptoms = dto.Symptoms; f.FaultDiagnosis = dto.Diagnosis;
        f.ResolutionNote = dto.Solution; f.WorkDone = dto.WorkDone; f.Notes = dto.Notes;
        if (dto.UnderWarranty is { } uw) f.UnderWarranty = uw;
        if (dto.Billable is { } b) f.Billable = b;
        f.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(f);
    }

    [HttpPut("{id:long}/status")]
    public async Task<IActionResult> ChangeStatus(long id, StatusDto dto)
    {
        if (!Statuses.Contains(dto.Status)) throw new ApiException(422, "Geçersiz durum.");
        var f = await Find(id);
        f.Status = dto.Status;
        if (dto.ResolutionNote != null) f.ResolutionNote = dto.ResolutionNote;
        if (dto.Status == "completed" && f.CompletedAt == null) { f.CompletedAt = DateTime.UtcNow; f.ResolvedAt = DateTime.UtcNow; }
        f.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(f);
    }

    [HttpPost("{id:long}/assign")]
    public async Task<IActionResult> Assign(long id, AssignDto dto, [FromServices] PushService push)
    {
        var f = await Find(id);
        f.AssignedUserId = dto.AssignedUserId;
        f.UpdatedAt = DateTime.UtcNow;
        db.Notifications.Add(new Models.Notification
        {
            TenantId = f.TenantId, UserId = dto.AssignedUserId, Title = "Bir arıza size atandı",
            Body = f.Description, Type = "fault", Link = $"/faults/{f.Id}", CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
        await push.SendToUserAsync(dto.AssignedUserId, "Bir arıza size atandı", f.Description ?? "Size bir arıza atandı.",
            new() { ["type"] = "fault", ["id"] = f.Id.ToString() });
        return Ok(f);
    }

    [HttpPost("{id:long}/comments")]
    public async Task<IActionResult> AddComment(long id, CommentDto dto)
    {
        var uid = long.Parse(User.FindFirst("uid")!.Value);
        _ = await Find(id);
        var now = DateTime.UtcNow;
        var c = new FaultReportComment { FaultReportId = id, UserId = uid, Comment = dto.Comment, CreatedAt = now, UpdatedAt = now };
        db.FaultReportComments.Add(c);
        await db.SaveChangesAsync();
        return StatusCode(201, c);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var f = await Find(id);
        f.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Arıza kaydı silindi." });
    }

    private async Task<FaultReport> Find(long id) =>
        await db.FaultReports.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Arıza bulunamadı.");

    private static DateTime Touch(FaultReport f) { f.UpdatedAt = DateTime.UtcNow; return f.UpdatedAt; }
}
