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
[Route("api/v1/atf")]
public class AtfController(AppDbContext db) : ControllerBase
{
    public record AtfDto(long? CustomerId, long? BuildingId, JsonElement? FormData, string? Status, JsonElement? Attachments);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1) =>
        Ok(await db.AtfForms.OrderByDescending(a => a.Id).ToPagedAsync(page, perPage));

    [HttpPost]
    public async Task<IActionResult> Store(AtfDto dto)
    {
        var now = DateTime.UtcNow;
        var a = new AtfForm
        {
            TenantId = db.CurrentTenantId!.Value, CustomerId = dto.CustomerId, BuildingId = dto.BuildingId,
            FormData = dto.FormData?.GetRawText() ?? "{}", Status = dto.Status ?? "draft",
            Attachments = dto.Attachments?.GetRawText() ?? "[]",
            CreatedBy = long.Parse(User.FindFirst("uid")!.Value), CreatedAt = now, UpdatedAt = now,
        };
        db.AtfForms.Add(a);
        await db.SaveChangesAsync();
        return StatusCode(201, a);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Show(long id) =>
        Ok(await db.AtfForms.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "ATF bulunamadı."));

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, AtfDto dto)
    {
        var a = await db.AtfForms.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "ATF bulunamadı.");
        if (dto.FormData is { } fd) a.FormData = fd.GetRawText();
        if (dto.Attachments is { } at) a.Attachments = at.GetRawText();
        if (dto.Status != null) a.Status = dto.Status;
        a.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(a);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var a = await db.AtfForms.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "ATF bulunamadı.");
        a.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "ATF silindi." });
    }
}
