using LiftOtonom.Api.Data;
using LiftOtonom.Api.Models;
using LiftOtonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LiftOtonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/work-orders")]
public class WorkOrderController(AppDbContext db) : ControllerBase
{
    public record CreateDto(long? ElevatorId, long? AssignedUserId, DateTime? PlannedDate, string Description);
    public record UpdateDto(long? AssignedUserId, DateTime? PlannedDate, string? Status, string? Description);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string? status,
        [FromQuery(Name = "assigned_user_id")] long? assignedUserId,
        [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var q = db.WorkOrders.AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(w => w.Status == status);
        if (assignedUserId is { } u) q = q.Where(w => w.AssignedUserId == u);

        var projected = q.OrderByDescending(w => w.Id).Select(w => new
        {
            w.Id, w.SourceType, w.Status, w.Description, w.PlannedDate,
            Elevator = w.ElevatorId == null ? null : new { Name = w.Elevator!.Name },
            AssignedUser = w.AssignedUserId == null ? null : new { w.AssignedUser!.Name, w.AssignedUser.Surname },
        });
        return Ok(await projected.ToPagedAsync(page, perPage));
    }

    [HttpPost]
    public async Task<IActionResult> Store(CreateDto dto)
    {
        var uid = long.Parse(User.FindFirst("uid")!.Value);
        var now = DateTime.UtcNow;
        var w = new WorkOrder
        {
            TenantId = db.CurrentTenantId!.Value,
            ElevatorId = dto.ElevatorId, AssignedUserId = dto.AssignedUserId,
            PlannedDate = dto.PlannedDate is { } p ? DateTime.SpecifyKind(p, DateTimeKind.Utc) : null,
            Description = dto.Description, SourceType = "manual", Status = "open",
            CreatedBy = uid, CreatedAt = now, UpdatedAt = now,
        };
        db.WorkOrders.Add(w);
        await db.SaveChangesAsync();
        return StatusCode(201, w);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Show(long id) =>
        Ok(await db.WorkOrders.Include(w => w.Elevator).Include(w => w.AssignedUser).FirstOrDefaultAsync(w => w.Id == id)
            ?? throw new ApiException(404, "İş emri bulunamadı."));

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, UpdateDto dto)
    {
        var w = await db.WorkOrders.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "İş emri bulunamadı.");
        w.AssignedUserId = dto.AssignedUserId;
        if (dto.PlannedDate is { } p) w.PlannedDate = DateTime.SpecifyKind(p, DateTimeKind.Utc);
        if (dto.Status != null) w.Status = dto.Status;
        if (dto.Description != null) w.Description = dto.Description;
        w.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(w);
    }

    [HttpPost("{id:long}/complete")]
    public async Task<IActionResult> Complete(long id)
    {
        var w = await db.WorkOrders.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "İş emri bulunamadı.");
        w.Status = "done"; w.CompletedAt = DateTime.UtcNow; w.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(w);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var w = await db.WorkOrders.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "İş emri bulunamadı.");
        w.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "İş emri silindi." });
    }
}
