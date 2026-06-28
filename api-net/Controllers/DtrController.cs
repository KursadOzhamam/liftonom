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
[Route("api/v1/dtr")]
public class DtrController(AppDbContext db) : ControllerBase
{
    public record DtrDto(long ElevatorId, JsonElement? ChecklistItems, string? GeneralNote, JsonElement? Photos, string? SignatureUrl);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery(Name = "elevator_id")] long? elevatorId,
        [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var q = db.DtrReports.Include(d => d.Elevator).AsQueryable();
        if (elevatorId is { } e) q = q.Where(d => d.ElevatorId == e);
        return Ok(await q.OrderByDescending(d => d.Id).ToPagedAsync(page, perPage));
    }

    [HttpPost]
    public async Task<IActionResult> Store(DtrDto dto)
    {
        var now = DateTime.UtcNow;
        var d = new DtrReport
        {
            TenantId = db.CurrentTenantId!.Value, ElevatorId = dto.ElevatorId,
            TechnicianId = long.Parse(User.FindFirst("uid")!.Value),
            ChecklistItems = dto.ChecklistItems?.GetRawText() ?? "[]", GeneralNote = dto.GeneralNote,
            Photos = dto.Photos?.GetRawText() ?? "[]", SignatureUrl = dto.SignatureUrl, CreatedAt = now, UpdatedAt = now,
        };
        db.DtrReports.Add(d);
        await db.SaveChangesAsync();
        return StatusCode(201, d);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Show(long id) =>
        Ok(await db.DtrReports.Include(d => d.Elevator).FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "DTR bulunamadı."));

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, DtrDto dto)
    {
        var d = await db.DtrReports.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "DTR bulunamadı.");
        if (dto.ChecklistItems is { } ci) d.ChecklistItems = ci.GetRawText();
        if (dto.Photos is { } ph) d.Photos = ph.GetRawText();
        if (dto.GeneralNote != null) d.GeneralNote = dto.GeneralNote;
        if (dto.SignatureUrl != null) d.SignatureUrl = dto.SignatureUrl;
        d.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(d);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var d = await db.DtrReports.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "DTR bulunamadı.");
        d.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "DTR silindi." });
    }
}
