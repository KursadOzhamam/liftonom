using LiftOtonom.Api.Data;
using LiftOtonom.Api.Models;
using LiftOtonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LiftOtonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/elevator-orders")]
public class ElevatorOrderController(AppDbContext db) : ControllerBase
{
    private static readonly string[] Statuses = ["quote", "approved", "production", "shipping", "installing", "completed", "cancelled"];
    public record OrderDto(long CustomerId, string? ElevatorType, int? Quantity, decimal? Amount, string? Status, string? Notes);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string? status, [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var q = db.ElevatorOrders.AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(o => o.Status == status);
        var projected = q.OrderByDescending(o => o.Id).Select(o => new
        {
            o.Id, o.OrderNumber, o.ElevatorType, o.Quantity, o.Amount, o.Status,
            Customer = o.CustomerId == null ? null : new { o.Customer!.Name },
        });
        return Ok(await projected.ToPagedAsync(page, perPage));
    }

    [HttpPost]
    public async Task<IActionResult> Store(OrderDto dto)
    {
        var now = DateTime.UtcNow;
        var o = new ElevatorOrder
        {
            TenantId = db.CurrentTenantId!.Value, CustomerId = dto.CustomerId, ElevatorType = dto.ElevatorType,
            Quantity = dto.Quantity ?? 1, Amount = dto.Amount, Status = "quote", Notes = dto.Notes,
            CreatedAt = now, UpdatedAt = now,
        };
        db.ElevatorOrders.Add(o);
        await db.SaveChangesAsync();
        o.OrderNumber = $"SIP-{o.Id:D6}";
        await db.SaveChangesAsync();
        return StatusCode(201, o);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Show(long id) =>
        Ok(await db.ElevatorOrders.Include(o => o.Customer).FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Sipariş bulunamadı."));

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, OrderDto dto)
    {
        var o = await db.ElevatorOrders.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Sipariş bulunamadı.");
        o.ElevatorType = dto.ElevatorType;
        if (dto.Quantity is { } qn) o.Quantity = qn;
        o.Amount = dto.Amount;
        if (dto.Status != null && Statuses.Contains(dto.Status)) o.Status = dto.Status;
        o.Notes = dto.Notes; o.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(o);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var o = await db.ElevatorOrders.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Sipariş bulunamadı.");
        o.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Sipariş silindi." });
    }
}
