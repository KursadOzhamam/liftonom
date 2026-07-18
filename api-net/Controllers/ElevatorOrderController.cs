using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/elevator-orders")]
public class ElevatorOrderController(AppDbContext db) : ControllerBase
{
    private static readonly string[] Statuses = ["draft", "quote", "approved", "production", "shipping", "installing", "completed", "cancelled"];
    public record OrderDto(long CustomerId, long? BuildingId, string? OrderNumber, string? ProjectName,
        string? ElevatorType, string? Status, int? CapacityKg, int? CapacityPersons, int? FloorCount, int? StopCount,
        decimal? SpeedMs, string? DoorType, DateOnly? OrderDate, DateOnly? EstimatedEnd,
        decimal? Amount, decimal? Downpayment, string? TechnicalDetails, string? Notes);

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
            TenantId = db.CurrentTenantId!.Value, CustomerId = dto.CustomerId, BuildingId = dto.BuildingId,
            ProjectName = dto.ProjectName, ElevatorType = dto.ElevatorType,
            Status = dto.Status != null && Statuses.Contains(dto.Status) ? dto.Status : "draft",
            CapacityKg = dto.CapacityKg, CapacityPersons = dto.CapacityPersons,
            FloorCount = dto.FloorCount, StopCount = dto.StopCount, SpeedMs = dto.SpeedMs, DoorType = dto.DoorType,
            OrderDate = dto.OrderDate, EstimatedEnd = dto.EstimatedEnd,
            Amount = dto.Amount, Downpayment = dto.Downpayment, TechnicalDetails = dto.TechnicalDetails, Notes = dto.Notes,
            CreatedAt = now, UpdatedAt = now,
        };
        db.ElevatorOrders.Add(o);
        await db.SaveChangesAsync();
        o.OrderNumber = string.IsNullOrWhiteSpace(dto.OrderNumber) ? $"SIP-{now:yyyyMMdd}-{o.Id:D4}" : dto.OrderNumber.Trim();
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
        o.BuildingId = dto.BuildingId; o.ProjectName = dto.ProjectName; o.ElevatorType = dto.ElevatorType;
        o.CapacityKg = dto.CapacityKg; o.CapacityPersons = dto.CapacityPersons;
        o.FloorCount = dto.FloorCount; o.StopCount = dto.StopCount; o.SpeedMs = dto.SpeedMs; o.DoorType = dto.DoorType;
        o.OrderDate = dto.OrderDate; o.EstimatedEnd = dto.EstimatedEnd;
        o.Amount = dto.Amount; o.Downpayment = dto.Downpayment; o.TechnicalDetails = dto.TechnicalDetails;
        if (!string.IsNullOrWhiteSpace(dto.OrderNumber)) o.OrderNumber = dto.OrderNumber.Trim();
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
