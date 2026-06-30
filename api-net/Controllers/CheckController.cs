using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/checks")]
public class CheckController(AppDbContext db) : ControllerBase
{
    public record CheckDto(long? CustomerId, string? Type, string? Direction, decimal Amount,
        string? Bank, string? SerialNo, DateOnly? DueDate, string? Status, string? Notes);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string? direction, [FromQuery] string? status,
        [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var q = db.Checks.AsQueryable();
        if (!string.IsNullOrEmpty(direction)) q = q.Where(c => c.Direction == direction);
        if (!string.IsNullOrEmpty(status)) q = q.Where(c => c.Status == status);
        var projected = q.OrderBy(c => c.DueDate).Select(c => new
        {
            c.Id, c.Type, c.Direction, c.Amount, c.Bank, c.SerialNo, c.DueDate, c.Status,
            Customer = c.CustomerId == null ? null : new { c.Customer!.Name },
        });
        return Ok(await projected.ToPagedAsync(page, perPage));
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var in15 = today.AddDays(15);
        var portfolio = db.Checks.Where(c => c.Status == "portfolio");
        return Ok(new
        {
            portfolio_count = await portfolio.CountAsync(),
            portfolio_total = await portfolio.SumAsync(c => (decimal?)c.Amount) ?? 0,
            due_15_count = await portfolio.CountAsync(c => c.DueDate != null && c.DueDate >= today && c.DueDate <= in15),
            due_15_total = await portfolio.Where(c => c.DueDate != null && c.DueDate >= today && c.DueDate <= in15).SumAsync(c => (decimal?)c.Amount) ?? 0,
            bounced_count = await db.Checks.CountAsync(c => c.Status == "bounced"),
        });
    }

    [HttpPost]
    public async Task<IActionResult> Store(CheckDto dto)
    {
        var now = DateTime.UtcNow;
        var c = new Check
        {
            TenantId = db.CurrentTenantId!.Value, CustomerId = dto.CustomerId,
            Type = dto.Type ?? "cek", Direction = dto.Direction ?? "received", Amount = dto.Amount,
            Bank = dto.Bank, SerialNo = dto.SerialNo, DueDate = dto.DueDate,
            Status = dto.Status ?? "portfolio", Notes = dto.Notes, CreatedAt = now, UpdatedAt = now,
        };
        db.Checks.Add(c);
        await db.SaveChangesAsync();
        return StatusCode(201, c);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, CheckDto dto)
    {
        var c = await db.Checks.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Çek/senet bulunamadı.");
        c.CustomerId = dto.CustomerId;
        if (dto.Type != null) c.Type = dto.Type;
        if (dto.Direction != null) c.Direction = dto.Direction;
        c.Amount = dto.Amount; c.Bank = dto.Bank; c.SerialNo = dto.SerialNo; c.DueDate = dto.DueDate;
        if (dto.Status != null) c.Status = dto.Status;
        c.Notes = dto.Notes; c.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(c);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var c = await db.Checks.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Çek/senet bulunamadı.");
        c.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Silindi." });
    }
}
