using LiftOtonom.Api.Data;
using LiftOtonom.Api.Models;
using LiftOtonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LiftOtonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/fault-reports")]
public class FaultReportController(AppDbContext db, FaultNotificationService notify) : ControllerBase
{
    private static readonly string[] Statuses = ["new", "investigating", "repairing", "resolved", "closed"];

    public record CreateDto(long ElevatorId, string? Priority, string Description, long? AssignedUserId);
    public record StatusDto(string Status, string? ResolutionNote);
    public record AssignDto(long AssignedUserId);
    public record CommentDto(string Comment);
    public record DiagnoseDto(string EstimatedRepair);
    public record ResolveDto(string? ResolutionNote);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string? search, [FromQuery] string? status,
        [FromQuery] string? priority, [FromQuery(Name = "elevator_id")] long? elevatorId,
        [FromQuery(Name = "assigned_user_id")] long? assignedUserId,
        [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var q = db.FaultReports.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search)) q = q.Where(f => EF.Functions.ILike(f.Description ?? "", $"%{search}%"));
        if (!string.IsNullOrEmpty(status)) q = q.Where(f => f.Status == status);
        if (!string.IsNullOrEmpty(priority)) q = q.Where(f => f.Priority == priority);
        if (elevatorId is { } e) q = q.Where(f => f.ElevatorId == e);
        if (assignedUserId is { } u) q = q.Where(f => f.AssignedUserId == u);

        var projected = q.OrderByDescending(f => f.Id).Select(f => new
        {
            f.Id, f.Priority, f.Status, f.Description, f.CreatedAt,
            Elevator = f.ElevatorId == null ? null : new { Name = f.Elevator!.Name },
            AssignedUser = f.AssignedUserId == null ? null : new { f.AssignedUser!.Name, f.AssignedUser.Surname },
            CommentsCount = db.FaultReportComments.Count(c => c.FaultReportId == f.Id),
        });
        return Ok(await projected.ToPagedAsync(page, perPage));
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
    public async Task<IActionResult> Store(CreateDto dto)
    {
        var uid = long.Parse(User.FindFirst("uid")!.Value);
        var now = DateTime.UtcNow;
        var f = new FaultReport
        {
            TenantId = db.CurrentTenantId!.Value,
            ElevatorId = dto.ElevatorId, Priority = dto.Priority ?? "normal",
            Status = "new", Description = dto.Description,
            AssignedUserId = dto.AssignedUserId, ReportedByType = "user", CreatedAt = now, UpdatedAt = now,
        };
        db.FaultReports.Add(f);
        await db.SaveChangesAsync();
        await notify.NotifyAsync(f, FaultNotificationService.Stage.Created); // otonom WhatsApp
        return StatusCode(201, f);
    }

    /// <summary>Teknisyen yola çıktı → müşteriye WhatsApp.</summary>
    [HttpPost("{id:long}/dispatch")]
    public async Task<IActionResult> Dispatch(long id)
    {
        var f = await db.FaultReports.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Arıza bulunamadı.");
        f.Status = "investigating";
        f.DispatchedAt = DateTime.UtcNow;
        f.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await notify.NotifyAsync(f, FaultNotificationService.Stage.Dispatched);
        return Ok(f);
    }

    /// <summary>Arıza tespit edildi + tahmini onarım süresi → müşteriye WhatsApp.</summary>
    [HttpPost("{id:long}/diagnose")]
    public async Task<IActionResult> Diagnose(long id, DiagnoseDto dto)
    {
        var f = await db.FaultReports.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Arıza bulunamadı.");
        f.Status = "repairing";
        f.DiagnosedAt = DateTime.UtcNow;
        f.EstimatedRepair = dto.EstimatedRepair;
        f.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await notify.NotifyAsync(f, FaultNotificationService.Stage.Diagnosed);
        return Ok(f);
    }

    /// <summary>Arıza giderildi → müşteriye WhatsApp.</summary>
    [HttpPost("{id:long}/resolve")]
    public async Task<IActionResult> Resolve(long id, ResolveDto dto)
    {
        var f = await db.FaultReports.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Arıza bulunamadı.");
        f.Status = "resolved";
        f.ResolvedAt = DateTime.UtcNow;
        if (dto.ResolutionNote != null) f.ResolutionNote = dto.ResolutionNote;
        f.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await notify.NotifyAsync(f, FaultNotificationService.Stage.Resolved);
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
        return Ok(new { f.Id, f.Priority, f.Status, f.Description, f.ResolutionNote, f.CreatedAt, f.ResolvedAt,
            f.EstimatedRepair, f.DispatchedAt, f.DiagnosedAt, f.Elevator, f.AssignedUser, Comments = comments });
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] StatusDto dto)
    {
        var f = await db.FaultReports.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Arıza bulunamadı.");
        if (dto.ResolutionNote != null) f.ResolutionNote = dto.ResolutionNote;
        f.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(f);
    }

    [HttpPut("{id:long}/status")]
    public async Task<IActionResult> ChangeStatus(long id, StatusDto dto)
    {
        if (!Statuses.Contains(dto.Status)) throw new ApiException(422, "Geçersiz durum.");
        var f = await db.FaultReports.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Arıza bulunamadı.");
        f.Status = dto.Status;
        if (dto.ResolutionNote != null) f.ResolutionNote = dto.ResolutionNote;
        if ((dto.Status == "resolved" || dto.Status == "closed") && f.ResolvedAt == null) f.ResolvedAt = DateTime.UtcNow;
        f.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(f);
    }

    [HttpPost("{id:long}/assign")]
    public async Task<IActionResult> Assign(long id, AssignDto dto)
    {
        var f = await db.FaultReports.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Arıza bulunamadı.");
        f.AssignedUserId = dto.AssignedUserId;
        f.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(f);
    }

    [HttpPost("{id:long}/comments")]
    public async Task<IActionResult> AddComment(long id, CommentDto dto)
    {
        var uid = long.Parse(User.FindFirst("uid")!.Value);
        _ = await db.FaultReports.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Arıza bulunamadı.");
        var now = DateTime.UtcNow;
        var c = new FaultReportComment { FaultReportId = id, UserId = uid, Comment = dto.Comment, CreatedAt = now, UpdatedAt = now };
        db.FaultReportComments.Add(c);
        await db.SaveChangesAsync();
        return StatusCode(201, c);
    }

    [HttpPost("{id:long}/convert-to-work-order")]
    public async Task<IActionResult> ConvertToWorkOrder(long id)
    {
        var uid = long.Parse(User.FindFirst("uid")!.Value);
        var f = await db.FaultReports.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Arıza bulunamadı.");
        var now = DateTime.UtcNow;
        var wo = new WorkOrder
        {
            TenantId = db.CurrentTenantId!.Value,
            ElevatorId = f.ElevatorId, SourceType = "fault", SourceId = f.Id,
            AssignedUserId = f.AssignedUserId, Status = "open", Description = f.Description,
            CreatedBy = uid, CreatedAt = now, UpdatedAt = now,
        };
        db.WorkOrders.Add(wo);
        f.Status = "repairing";
        await db.SaveChangesAsync();
        return StatusCode(201, wo);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var f = await db.FaultReports.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Arıza bulunamadı.");
        f.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Arıza kaydı silindi." });
    }
}
