using LiftOtonom.Api.Data;
using LiftOtonom.Api.Models;
using LiftOtonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LiftOtonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/inventory")]
public class ProductController(AppDbContext db) : ControllerBase
{
    public record ProductDto(long? SupplierId, string? Code, string Name, string? Category, string? Unit,
        decimal? StockQuantity, decimal? MinStock, decimal? UnitPrice);
    public record MoveDto(decimal Quantity, decimal? UnitPrice, string? Note);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string? search, [FromQuery(Name = "low_stock")] bool lowStock = false,
        [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var q = db.Products.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(p => EF.Functions.ILike(p.Name, $"%{search}%") ||
                             EF.Functions.ILike(p.Code ?? "", $"%{search}%") ||
                             EF.Functions.ILike(p.Category ?? "", $"%{search}%"));
        if (lowStock) q = q.Where(p => p.StockQuantity < p.MinStock);
        return Ok(await q.OrderBy(p => p.Name).ToPagedAsync(page, perPage));
    }

    [HttpGet("low-stock")]
    public async Task<IActionResult> LowStock() =>
        Ok(await db.Products.Where(p => p.StockQuantity < p.MinStock).OrderBy(p => p.Name).ToListAsync());

    [HttpGet("movements")]
    public async Task<IActionResult> Movements([FromQuery(Name = "product_id")] long? productId,
        [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var q = db.StockMovements.AsQueryable();
        if (productId is { } p) q = q.Where(m => m.ProductId == p);
        return Ok(await q.OrderByDescending(m => m.Id).ToPagedAsync(page, perPage));
    }

    [HttpPost]
    public async Task<IActionResult> Store(ProductDto dto)
    {
        var now = DateTime.UtcNow;
        var p = new Product
        {
            TenantId = db.CurrentTenantId!.Value, SupplierId = dto.SupplierId, Code = dto.Code, Name = dto.Name,
            Category = dto.Category, Unit = dto.Unit, StockQuantity = dto.StockQuantity ?? 0,
            MinStock = dto.MinStock ?? 0, UnitPrice = dto.UnitPrice, CreatedAt = now, UpdatedAt = now,
        };
        db.Products.Add(p);
        await db.SaveChangesAsync();
        return StatusCode(201, p);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Show(long id) =>
        Ok(await db.Products.Include(p => p.Supplier).FirstOrDefaultAsync(p => p.Id == id) ?? throw new ApiException(404, "Ürün bulunamadı."));

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, ProductDto dto)
    {
        var p = await db.Products.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Ürün bulunamadı.");
        p.SupplierId = dto.SupplierId;
        if (!string.IsNullOrWhiteSpace(dto.Name)) p.Name = dto.Name;
        p.Category = dto.Category; p.Unit = dto.Unit;
        if (dto.MinStock is { } ms) p.MinStock = ms;
        p.UnitPrice = dto.UnitPrice; p.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(p);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var p = await db.Products.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Ürün bulunamadı.");
        p.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Ürün silindi." });
    }

    [HttpPost("{id:long}/stock-in")]
    public Task<IActionResult> StockIn(long id, MoveDto dto) => Move(id, dto, "in");

    [HttpPost("{id:long}/stock-out")]
    public Task<IActionResult> StockOut(long id, MoveDto dto) => Move(id, dto, "out");

    private async Task<IActionResult> Move(long id, MoveDto dto, string type)
    {
        if (dto.Quantity <= 0) throw new ApiException(422, "Miktar 0'dan büyük olmalı.");
        await using var tx = await db.Database.BeginTransactionAsync();
        var p = await db.Products.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Ürün bulunamadı.");

        if (type == "out" && p.StockQuantity < dto.Quantity) throw new ApiException(422, "Yeterli stok yok.");
        p.StockQuantity += type == "in" ? dto.Quantity : -dto.Quantity;
        p.UpdatedAt = DateTime.UtcNow;

        var price = dto.UnitPrice ?? p.UnitPrice;
        db.StockMovements.Add(new StockMovement
        {
            TenantId = db.CurrentTenantId!.Value, ProductId = p.Id, Type = type, Quantity = dto.Quantity,
            UnitPrice = price, TotalPrice = dto.Quantity * (price ?? 0),
            ReferenceType = type == "in" ? "purchase" : "adjustment", Note = dto.Note,
            CreatedBy = long.Parse(User.FindFirst("uid")!.Value), CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return Ok(new { message = "Stok güncellendi.", stock_quantity = p.StockQuantity });
    }
}
