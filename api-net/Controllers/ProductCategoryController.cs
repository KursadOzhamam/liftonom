using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

/// <summary>Ürün/stok kategorileri (tenant CRUD). NOT: /inventory/categories ürünlerden türetilen özet döndürür; bu uç yönetilen listedir.</summary>
[ApiController]
[Authorize]
[Route("api/v1/product-categories")]
public class ProductCategoryController(AppDbContext db) : ControllerBase
{
    public record CategoryDto(string? Name);

    [HttpGet]
    public async Task<IActionResult> List() =>
        Ok(await db.ProductCategories.OrderBy(c => c.Name).Select(c => new { c.Id, c.Name }).ToListAsync());

    [HttpPost]
    public async Task<IActionResult> Create(CategoryDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) throw new ApiException(422, "Kategori adı zorunludur.");
        var now = DateTime.UtcNow;
        var c = new ProductCategory { TenantId = db.CurrentTenantId!.Value, Name = dto.Name!.Trim(), CreatedAt = now, UpdatedAt = now };
        db.ProductCategories.Add(c);
        await db.SaveChangesAsync();
        return StatusCode(201, new { c.Id, c.Name });
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, CategoryDto dto)
    {
        var c = await db.ProductCategories.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Kategori bulunamadı.");
        if (!string.IsNullOrWhiteSpace(dto.Name)) c.Name = dto.Name!.Trim();
        c.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { c.Id, c.Name });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        var c = await db.ProductCategories.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Kategori bulunamadı.");
        c.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Kategori silindi." });
    }
}
