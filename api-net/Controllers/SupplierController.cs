using LiftOtonom.Api.Data;
using LiftOtonom.Api.Models;
using LiftOtonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LiftOtonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/suppliers")]
public class SupplierController(AppDbContext db) : ControllerBase
{
    public record SupplierDto(string Name, string? Phone, string? Email, string? TaxNumber, string? Address, string? Notes);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string? search, [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var q = db.Suppliers.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search)) q = q.Where(s => EF.Functions.ILike(s.Name, $"%{search}%"));
        return Ok(await q.OrderBy(s => s.Name).ToPagedAsync(page, perPage));
    }

    [HttpPost]
    public async Task<IActionResult> Store(SupplierDto dto)
    {
        var now = DateTime.UtcNow;
        var s = new Supplier { TenantId = db.CurrentTenantId!.Value, Name = dto.Name, Phone = dto.Phone, Email = dto.Email,
            TaxNumber = dto.TaxNumber, Address = dto.Address, Notes = dto.Notes, CreatedAt = now, UpdatedAt = now };
        db.Suppliers.Add(s);
        await db.SaveChangesAsync();
        return StatusCode(201, s);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Show(long id) =>
        Ok(await db.Suppliers.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Tedarikçi bulunamadı."));

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, SupplierDto dto)
    {
        var s = await db.Suppliers.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Tedarikçi bulunamadı.");
        if (!string.IsNullOrWhiteSpace(dto.Name)) s.Name = dto.Name;
        s.Phone = dto.Phone; s.Email = dto.Email; s.TaxNumber = dto.TaxNumber; s.Address = dto.Address; s.Notes = dto.Notes;
        s.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(s);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var s = await db.Suppliers.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Tedarikçi bulunamadı.");
        s.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Tedarikçi silindi." });
    }
}
