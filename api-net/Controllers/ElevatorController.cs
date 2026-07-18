using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/elevators")]
public class ElevatorController(AppDbContext db) : ControllerBase
{
    public record ElevatorDto(long? BuildingId, string? Code, string Name, string? Type, string? Brand,
        string? Model, int? CapacityKg, int? StopCount, string? SerialNumber, string? TseCertificateNo,
        DateOnly? TseStartDate, DateOnly? TseEndDate, string? Status, int? MaintenancePeriod, string? Notes);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string? search,
        [FromQuery(Name = "building_id")] long? buildingId, [FromQuery] string? status, [FromQuery] string? type,
        [FromQuery] string? tse, [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var q = db.Elevators.Include(e => e.Building).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(e => EF.Functions.ILike(e.Name ?? "", $"%{search}%") ||
                             EF.Functions.ILike(e.SerialNumber ?? "", $"%{search}%") ||
                             EF.Functions.ILike(e.Brand ?? "", $"%{search}%") ||
                             EF.Functions.ILike(e.Code ?? "", $"%{search}%"));
        if (buildingId is { } b) q = q.Where(e => e.BuildingId == b);
        if (!string.IsNullOrEmpty(status)) q = q.Where(e => e.Status == status);
        if (!string.IsNullOrEmpty(type)) q = q.Where(e => e.Type == type);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var in30 = today.AddDays(30);
        q = tse switch
        {
            "green" => q.Where(e => e.TseEndDate != null && e.TseEndDate > in30),
            "yellow" => q.Where(e => e.TseEndDate != null && e.TseEndDate >= today && e.TseEndDate <= in30),
            "red" => q.Where(e => e.TseEndDate != null && e.TseEndDate < today),
            "gray" => q.Where(e => e.TseEndDate == null),
            _ => q,
        };

        return Ok(await q.OrderBy(e => e.Name).ToPagedAsync(page, perPage));
    }

    [HttpGet("tse-report")]
    public async Task<IActionResult> TseReport([FromQuery] string list = "upcoming",
        [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var in30 = today.AddDays(30);

        var summary = new
        {
            Total = await db.Elevators.CountAsync(),
            Green = await db.Elevators.CountAsync(e => e.TseEndDate != null && e.TseEndDate > in30),
            Yellow = await db.Elevators.CountAsync(e => e.TseEndDate != null && e.TseEndDate >= today && e.TseEndDate <= in30),
            Red = await db.Elevators.CountAsync(e => e.TseEndDate != null && e.TseEndDate < today),
            Gray = await db.Elevators.CountAsync(e => e.TseEndDate == null),
        };

        var q = db.Elevators.Include(e => e.Building).AsQueryable();
        if (list == "upcoming") q = q.Where(e => e.TseEndDate != null && e.TseEndDate >= today && e.TseEndDate <= in30);
        else if (list == "expired") q = q.Where(e => e.TseEndDate != null && e.TseEndDate < today);

        var items = await q.OrderBy(e => e.TseEndDate).ToPagedAsync(page, perPage);
        return Ok(new { summary, items });
    }

    [HttpGet("{id:long}/qr")]
    public async Task<IActionResult> Qr(long id)
    {
        var e = await db.Elevators.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new ApiException(404, "Asansör bulunamadı.");
        return Ok(new
        {
            qr_token = e.QrToken,
            public_url = $"{Request.Scheme}://{Request.Host}/qr/{e.QrToken}",
            fault_endpoint = $"{Request.Scheme}://{Request.Host}/api/v1/public/fault-reports/{e.QrToken}",
        });
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Show(long id)
    {
        var e = await db.Elevators.Include(x => x.Building).FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new ApiException(404, "Asansör bulunamadı.");
        return Ok(e);
    }

    [HttpPost]
    public async Task<IActionResult> Store(ElevatorDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) throw new ApiException(422, "Asansör adı zorunludur.");
        var now = DateTime.UtcNow;
        var e = new Elevator
        {
            TenantId = db.CurrentTenantId!.Value,
            BuildingId = dto.BuildingId, Code = dto.Code, Name = dto.Name, Type = dto.Type,
            Brand = dto.Brand, Model = dto.Model, CapacityKg = dto.CapacityKg, StopCount = dto.StopCount, SerialNumber = dto.SerialNumber,
            TseCertificateNo = dto.TseCertificateNo, TseStartDate = dto.TseStartDate, TseEndDate = dto.TseEndDate,
            Status = dto.Status ?? "active", MaintenancePeriod = dto.MaintenancePeriod ?? 30, Notes = dto.Notes,
            QrToken = Guid.NewGuid().ToString("N"), CreatedAt = now, UpdatedAt = now,
        };
        db.Elevators.Add(e);
        await db.SaveChangesAsync();
        return StatusCode(201, e);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, ElevatorDto dto)
    {
        var e = await db.Elevators.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new ApiException(404, "Asansör bulunamadı.");
        if (!string.IsNullOrWhiteSpace(dto.Name)) e.Name = dto.Name;
        e.BuildingId = dto.BuildingId; e.Code = dto.Code; e.Type = dto.Type; e.Brand = dto.Brand;
        e.Model = dto.Model; e.CapacityKg = dto.CapacityKg; e.SerialNumber = dto.SerialNumber;
        e.TseCertificateNo = dto.TseCertificateNo; e.TseStartDate = dto.TseStartDate; e.TseEndDate = dto.TseEndDate;
        if (dto.Status != null) e.Status = dto.Status;
        if (dto.MaintenancePeriod is { } mp) e.MaintenancePeriod = mp;
        e.Notes = dto.Notes; e.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(e);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var e = await db.Elevators.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new ApiException(404, "Asansör bulunamadı.");
        e.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Asansör silindi." });
    }
}
