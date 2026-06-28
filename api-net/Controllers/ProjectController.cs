using System.Text.Json;
using LiftOtonom.Api.Data;
using LiftOtonom.Api.Models;
using LiftOtonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LiftOtonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/projects")]
public class ProjectController(AppDbContext db) : ControllerBase
{
    public record ProjectDto(long? CustomerId, string Name, string? Description, string? Status,
        DateOnly? StartDate, DateOnly? EndDate, int? Progress, List<long>? AssignedUsers);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string? status, [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var q = db.Projects.AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(p => p.Status == status);
        var projected = q.OrderByDescending(p => p.Id).Select(p => new
        {
            p.Id, p.Name, p.Status, p.Progress, p.StartDate, p.EndDate,
            Customer = p.CustomerId == null ? null : new { p.Customer!.Name },
        });
        return Ok(await projected.ToPagedAsync(page, perPage));
    }

    [HttpPost]
    public async Task<IActionResult> Store(ProjectDto dto)
    {
        var now = DateTime.UtcNow;
        var p = new Project
        {
            TenantId = db.CurrentTenantId!.Value, CustomerId = dto.CustomerId, Name = dto.Name,
            Description = dto.Description, Status = dto.Status ?? "planning", StartDate = dto.StartDate,
            EndDate = dto.EndDate, Progress = dto.Progress ?? 0,
            AssignedUsers = JsonSerializer.Serialize(dto.AssignedUsers ?? []), CreatedAt = now, UpdatedAt = now,
        };
        db.Projects.Add(p);
        await db.SaveChangesAsync();
        return StatusCode(201, p);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Show(long id) =>
        Ok(await db.Projects.Include(p => p.Customer).FirstOrDefaultAsync(p => p.Id == id) ?? throw new ApiException(404, "Proje bulunamadı."));

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, ProjectDto dto)
    {
        var p = await db.Projects.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Proje bulunamadı.");
        if (!string.IsNullOrWhiteSpace(dto.Name)) p.Name = dto.Name;
        p.CustomerId = dto.CustomerId; p.Description = dto.Description;
        if (dto.Status != null) p.Status = dto.Status;
        p.StartDate = dto.StartDate; p.EndDate = dto.EndDate;
        if (dto.Progress is { } pr) p.Progress = pr;
        if (dto.AssignedUsers != null) p.AssignedUsers = JsonSerializer.Serialize(dto.AssignedUsers);
        p.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(p);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var p = await db.Projects.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Proje bulunamadı.");
        p.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Proje silindi." });
    }
}
