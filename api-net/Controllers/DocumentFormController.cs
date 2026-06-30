using System.Text.Json;
using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

/// <summary>Genel belge formları — Kurtarma Formu (kind=rescue) & Eğitim Tutanağı (kind=training).</summary>
[ApiController]
[Authorize]
[Route("api/v1/document-forms")]
public class DocumentFormController(AppDbContext db) : ControllerBase
{
    public record FormDto(string? Kind, long? CustomerId, long? BuildingId, long? ElevatorId,
        string? Title, JsonElement? FormData, string? Status);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string? kind,
        [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var q = db.DocumentForms.AsQueryable();
        if (!string.IsNullOrEmpty(kind)) q = q.Where(d => d.Kind == kind);
        var projected = q.OrderByDescending(d => d.Id).Select(d => new
        {
            d.Id, d.Kind, d.Title, d.Status, d.CreatedAt, d.FormData, d.ElevatorId,
            Customer = d.CustomerId == null ? null : new { d.Customer!.Name },
            Elevator = d.ElevatorId == null ? null : new { d.Elevator!.Name },
        });
        return Ok(await projected.ToPagedAsync(page, perPage));
    }

    [HttpPost]
    public async Task<IActionResult> Store(FormDto dto)
    {
        var now = DateTime.UtcNow;
        var d = new DocumentForm
        {
            TenantId = db.CurrentTenantId!.Value, Kind = dto.Kind ?? "rescue",
            CustomerId = dto.CustomerId, BuildingId = dto.BuildingId, ElevatorId = dto.ElevatorId,
            Title = dto.Title, FormData = dto.FormData?.GetRawText() ?? "{}", Status = dto.Status ?? "draft",
            CreatedBy = long.Parse(User.FindFirst("uid")!.Value), CreatedAt = now, UpdatedAt = now,
        };
        db.DocumentForms.Add(d);
        await db.SaveChangesAsync();
        return StatusCode(201, d);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, FormDto dto)
    {
        var d = await db.DocumentForms.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Form bulunamadı.");
        if (dto.Title != null) d.Title = dto.Title;
        if (dto.FormData is { } fd) d.FormData = fd.GetRawText();
        if (dto.Status != null) d.Status = dto.Status;
        d.CustomerId = dto.CustomerId ?? d.CustomerId; d.BuildingId = dto.BuildingId ?? d.BuildingId; d.ElevatorId = dto.ElevatorId ?? d.ElevatorId;
        d.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(d);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var d = await db.DocumentForms.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Form bulunamadı.");
        d.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Silindi." });
    }
}
