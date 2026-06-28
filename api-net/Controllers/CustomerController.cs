using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/customers")]
public class CustomerController(AppDbContext db) : ControllerBase
{
    public record CustomerDto(
        string? Type, string Name, string? TaxNumber, string? TaxOffice,
        string? IdNumber, string? Phone, string? Email, string? Address,
        string? District, string? City, long? RegionId, string? Notes, bool? IsActive);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string? search, [FromQuery] string? type,
        [FromQuery(Name = "region_id")] long? regionId, [FromQuery(Name = "per_page")] int perPage = 25,
        [FromQuery] int page = 1, [FromQuery] string sort = "name")
    {
        var q = db.Customers.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(c =>
                EF.Functions.ILike(c.Name, $"%{search}%") ||
                EF.Functions.ILike(c.Phone ?? "", $"%{search}%") ||
                EF.Functions.ILike(c.Email ?? "", $"%{search}%") ||
                EF.Functions.ILike(c.TaxNumber ?? "", $"%{search}%"));

        if (!string.IsNullOrEmpty(type)) q = q.Where(c => c.Type == type);
        if (regionId is { } r) q = q.Where(c => c.RegionId == r);

        q = sort switch
        {
            "name_desc" => q.OrderByDescending(c => c.Name),
            "newest" => q.OrderByDescending(c => c.Id),
            "oldest" => q.OrderBy(c => c.Id),
            _ => q.OrderBy(c => c.Name),
        };

        var projected = q.Select(c => new
        {
            c.Id, c.Type, c.Name, c.Phone, c.Email, c.City, c.IsActive, c.IsSample,
            BuildingsCount = db.Buildings.Count(b => b.CustomerId == c.Id),
        });

        return Ok(await projected.ToPagedAsync(page, perPage));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Show(long id)
    {
        var c = await db.Customers.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new ApiException(404, "Müşteri bulunamadı.");
        return Ok(c);
    }

    [HttpPost]
    public async Task<IActionResult> Store(CustomerDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new ApiException(422, "Ad / Ünvan zorunludur.");

        var now = DateTime.UtcNow;
        var c = new Customer
        {
            TenantId = db.CurrentTenantId!.Value,
            Type = dto.Type ?? Customer.TypeCorporate,
            Name = dto.Name,
            TaxNumber = dto.TaxNumber,
            TaxOffice = dto.TaxOffice,
            IdNumber = dto.IdNumber,
            Phone = dto.Phone,
            Email = dto.Email,
            Address = dto.Address,
            District = dto.District,
            City = dto.City,
            RegionId = dto.RegionId,
            Notes = dto.Notes,
            IsActive = dto.IsActive ?? true,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Customers.Add(c);
        await db.SaveChangesAsync();
        return StatusCode(201, c);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, CustomerDto dto)
    {
        var c = await db.Customers.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new ApiException(404, "Müşteri bulunamadı.");

        if (dto.Type != null) c.Type = dto.Type;
        if (!string.IsNullOrWhiteSpace(dto.Name)) c.Name = dto.Name;
        c.TaxNumber = dto.TaxNumber;
        c.TaxOffice = dto.TaxOffice;
        c.IdNumber = dto.IdNumber;
        c.Phone = dto.Phone;
        c.Email = dto.Email;
        c.Address = dto.Address;
        c.District = dto.District;
        c.City = dto.City;
        c.RegionId = dto.RegionId;
        c.Notes = dto.Notes;
        if (dto.IsActive is { } a) c.IsActive = a;
        c.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(c);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var c = await db.Customers.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new ApiException(404, "Müşteri bulunamadı.");
        c.DeletedAt = DateTime.UtcNow; // soft delete
        await db.SaveChangesAsync();
        return Ok(new { message = "Müşteri silindi." });
    }
}
