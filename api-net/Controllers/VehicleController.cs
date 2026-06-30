using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/vehicles")]
public class VehicleController(AppDbContext db) : ControllerBase
{
    public record VehicleDto(string Plate, string? Brand, string? Model, long? AssignedUserId, string? Status, string? Notes);
    public record LocationDto(double Lat, double Lng);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery(Name = "per_page")] int perPage = 50, [FromQuery] int page = 1)
    {
        var projected = db.Vehicles.OrderBy(v => v.Plate).Select(v => new
        {
            v.Id, v.Plate, v.Brand, v.Model, v.Status, v.LastLat, v.LastLng, v.LocationUpdatedAt, v.Notes,
            AssignedUser = v.AssignedUserId == null ? null : new { v.AssignedUser!.Name, v.AssignedUser.Surname },
        });
        return Ok(await projected.ToPagedAsync(page, perPage));
    }

    [HttpPost]
    public async Task<IActionResult> Store(VehicleDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Plate)) throw new ApiException(422, "Plaka zorunludur.");
        var now = DateTime.UtcNow;
        var v = new Vehicle
        {
            TenantId = db.CurrentTenantId!.Value, Plate = dto.Plate.ToUpperInvariant(), Brand = dto.Brand, Model = dto.Model,
            AssignedUserId = dto.AssignedUserId, Status = dto.Status ?? "active", Notes = dto.Notes, CreatedAt = now, UpdatedAt = now,
        };
        db.Vehicles.Add(v);
        await db.SaveChangesAsync();
        return StatusCode(201, v);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, VehicleDto dto)
    {
        var v = await db.Vehicles.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Araç bulunamadı.");
        if (!string.IsNullOrWhiteSpace(dto.Plate)) v.Plate = dto.Plate.ToUpperInvariant();
        v.Brand = dto.Brand; v.Model = dto.Model; v.AssignedUserId = dto.AssignedUserId;
        if (dto.Status != null) v.Status = dto.Status;
        v.Notes = dto.Notes; v.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(v);
    }

    [HttpPost("{id:long}/location")]
    public async Task<IActionResult> UpdateLocation(long id, LocationDto dto)
    {
        var v = await db.Vehicles.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Araç bulunamadı.");
        v.LastLat = dto.Lat; v.LastLng = dto.Lng; v.LocationUpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Konum güncellendi." });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var v = await db.Vehicles.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Araç bulunamadı.");
        v.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Silindi." });
    }
}
