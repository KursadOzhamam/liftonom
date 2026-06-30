using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/maintenance-fees")]
public class MaintenanceFeeController(AppDbContext db) : ControllerBase
{
    public record FeeDto(long? CustomerId, long? BuildingId, decimal Amount, string? Period, DateOnly? ValidFrom, string? Notes, bool? IsActive);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var projected = db.MaintenanceFees.OrderByDescending(f => f.Id).Select(f => new
        {
            f.Id, f.Amount, f.Period, f.ValidFrom, f.IsActive, f.Notes,
            Customer = f.CustomerId == null ? null : new { f.Customer!.Name },
            Building = f.BuildingId == null ? null : new { f.Building!.Name },
        });
        return Ok(await projected.ToPagedAsync(page, perPage));
    }

    [HttpPost]
    public async Task<IActionResult> Store(FeeDto dto)
    {
        var now = DateTime.UtcNow;
        var f = new MaintenanceFee
        {
            TenantId = db.CurrentTenantId!.Value, CustomerId = dto.CustomerId, BuildingId = dto.BuildingId,
            Amount = dto.Amount, Period = dto.Period ?? "monthly", ValidFrom = dto.ValidFrom,
            Notes = dto.Notes, IsActive = dto.IsActive ?? true, CreatedAt = now, UpdatedAt = now,
        };
        db.MaintenanceFees.Add(f);
        await db.SaveChangesAsync();
        return StatusCode(201, f);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, FeeDto dto)
    {
        var f = await db.MaintenanceFees.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Ücret bulunamadı.");
        f.CustomerId = dto.CustomerId; f.BuildingId = dto.BuildingId; f.Amount = dto.Amount;
        if (dto.Period != null) f.Period = dto.Period;
        f.ValidFrom = dto.ValidFrom; f.Notes = dto.Notes;
        if (dto.IsActive is { } a) f.IsActive = a;
        f.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(f);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var f = await db.MaintenanceFees.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Ücret bulunamadı.");
        f.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Silindi." });
    }
}
