using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/locations")]
public class StockLocationController(AppDbContext db) : ControllerBase
{
    public record LocationDto(string Name, string? Code, string? Description);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery(Name = "per_page")] int perPage = 100, [FromQuery] int page = 1) =>
        Ok(await db.StockLocations.OrderBy(l => l.Name).ToPagedAsync(page, perPage));

    [HttpPost]
    public async Task<IActionResult> Store(LocationDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) throw new ApiException(422, "Lokasyon adı zorunludur.");
        var now = DateTime.UtcNow;
        var l = new StockLocation { TenantId = db.CurrentTenantId!.Value, Name = dto.Name, Code = dto.Code, Description = dto.Description, CreatedAt = now, UpdatedAt = now };
        db.StockLocations.Add(l);
        await db.SaveChangesAsync();
        return StatusCode(201, l);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, LocationDto dto)
    {
        var l = await db.StockLocations.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Lokasyon bulunamadı.");
        if (!string.IsNullOrWhiteSpace(dto.Name)) l.Name = dto.Name;
        l.Code = dto.Code; l.Description = dto.Description; l.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(l);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var l = await db.StockLocations.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Lokasyon bulunamadı.");
        l.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Silindi." });
    }
}
