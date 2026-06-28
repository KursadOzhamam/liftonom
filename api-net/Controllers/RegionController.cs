using LiftOtonom.Api.Data;
using LiftOtonom.Api.Models;
using LiftOtonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LiftOtonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/regions")]
public class RegionController(AppDbContext db) : ControllerBase
{
    public record RegionDto(string Name, string? Code, string? Description, bool? IsActive);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string? search,
        [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var q = db.Regions.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(r => EF.Functions.ILike(r.Name, $"%{search}%") ||
                             EF.Functions.ILike(r.Code ?? "", $"%{search}%"));

        var projected = q.OrderBy(r => r.Name).Select(r => new
        {
            r.Id, r.Name, r.Code, r.Description, r.IsActive, TechniciansCount = 0,
        });
        return Ok(await projected.ToPagedAsync(page, perPage));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Show(long id) =>
        Ok(await db.Regions.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Bölge bulunamadı."));

    [HttpPost]
    public async Task<IActionResult> Store(RegionDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) throw new ApiException(422, "Bölge adı zorunludur.");
        var now = DateTime.UtcNow;
        var r = new Region
        {
            TenantId = db.CurrentTenantId!.Value,
            Name = dto.Name, Code = dto.Code, Description = dto.Description,
            IsActive = dto.IsActive ?? true, CreatedAt = now, UpdatedAt = now,
        };
        db.Regions.Add(r);
        await db.SaveChangesAsync();
        return StatusCode(201, r);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, RegionDto dto)
    {
        var r = await db.Regions.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Bölge bulunamadı.");
        if (!string.IsNullOrWhiteSpace(dto.Name)) r.Name = dto.Name;
        r.Code = dto.Code; r.Description = dto.Description;
        if (dto.IsActive is { } a) r.IsActive = a;
        r.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(r);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var r = await db.Regions.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Bölge bulunamadı.");
        db.Regions.Remove(r);
        await db.SaveChangesAsync();
        return Ok(new { message = "Bölge silindi." });
    }
}
