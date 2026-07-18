using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/buildings")]
public class BuildingController(AppDbContext db) : ControllerBase
{
    public record BuildingDto(string Name, string? Type, long? CustomerId, long? RegionId, string? Address,
        string? District, string? City, int? FloorCount, int? UnitCount, string? ManagerName, string? ManagerPhone, string? Notes,
        decimal? Latitude, decimal? Longitude);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string? search,
        [FromQuery(Name = "customer_id")] long? customerId, [FromQuery(Name = "region_id")] long? regionId,
        [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1, [FromQuery] string sort = "name")
    {
        var q = db.Buildings.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(b => EF.Functions.ILike(b.Name, $"%{search}%") ||
                             EF.Functions.ILike(b.City ?? "", $"%{search}%") ||
                             EF.Functions.ILike(b.District ?? "", $"%{search}%") ||
                             EF.Functions.ILike(b.ManagerName ?? "", $"%{search}%"));
        if (customerId is { } c) q = q.Where(b => b.CustomerId == c);
        if (regionId is { } r) q = q.Where(b => b.RegionId == r);

        q = sort switch
        {
            "city" => q.OrderBy(b => b.City),
            "newest" => q.OrderByDescending(b => b.Id),
            _ => q.OrderBy(b => b.Name),
        };

        var projected = q.Select(b => new
        {
            b.Id, b.Name, b.City, b.District, b.FloorCount, b.ManagerName, b.ManagerPhone, b.Address,
            b.Latitude, b.Longitude,
            Customer = b.CustomerId == null ? null : new { Id = b.Customer!.Id, b.Customer.Name },
            ElevatorsCount = db.Elevators.Count(e => e.BuildingId == b.Id),
        });

        return Ok(await projected.ToPagedAsync(page, perPage));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Show(long id)
    {
        var b = await db.Buildings.Include(x => x.Customer).FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new ApiException(404, "Bina bulunamadı.");
        return Ok(b);
    }

    [HttpPost]
    public async Task<IActionResult> Store(BuildingDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) throw new ApiException(422, "Bina adı zorunludur.");
        var now = DateTime.UtcNow;
        var b = new Building
        {
            TenantId = db.CurrentTenantId!.Value,
            Name = dto.Name, Type = dto.Type, CustomerId = dto.CustomerId, RegionId = dto.RegionId,
            Address = dto.Address, District = dto.District, City = dto.City,
            FloorCount = dto.FloorCount, UnitCount = dto.UnitCount, ManagerName = dto.ManagerName, ManagerPhone = dto.ManagerPhone,
            Notes = dto.Notes, Latitude = dto.Latitude, Longitude = dto.Longitude, CreatedAt = now, UpdatedAt = now,
        };
        db.Buildings.Add(b);
        await db.SaveChangesAsync();
        return StatusCode(201, b);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, BuildingDto dto)
    {
        var b = await db.Buildings.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new ApiException(404, "Bina bulunamadı.");
        if (!string.IsNullOrWhiteSpace(dto.Name)) b.Name = dto.Name;
        b.CustomerId = dto.CustomerId; b.RegionId = dto.RegionId; b.Address = dto.Address;
        b.District = dto.District; b.City = dto.City; b.FloorCount = dto.FloorCount;
        b.ManagerName = dto.ManagerName; b.ManagerPhone = dto.ManagerPhone; b.Notes = dto.Notes;
        b.Latitude = dto.Latitude; b.Longitude = dto.Longitude;
        b.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(b);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var b = await db.Buildings.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new ApiException(404, "Bina bulunamadı.");
        b.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Bina silindi." });
    }
}
