using Liftonom.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/reports")]
public class ReportController(AppDbContext db) : ControllerBase
{
    private (DateTime Start, DateTime End) Range(DateTime? start, DateTime? end)
    {
        var s = (start ?? new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc)).Date;
        var e = (end ?? DateTime.UtcNow).Date.AddDays(1).AddTicks(-1);
        return (DateTime.SpecifyKind(s, DateTimeKind.Utc), DateTime.SpecifyKind(e, DateTimeKind.Utc));
    }

    [HttpGet("daily-summary")]
    public async Task<IActionResult> DailySummary([FromQuery] DateTime? date)
    {
        var d = (date ?? DateTime.UtcNow).Date;
        return Ok(new
        {
            date = DateOnly.FromDateTime(d).ToString("yyyy-MM-dd"),
            maintenance = await db.MaintenanceRecords.CountAsync(m => m.PlannedDate!.Value.Date == d),
            completed = await db.MaintenanceRecords.CountAsync(m => m.CompletedAt!.Value.Date == d),
            new_faults = await db.FaultReports.CountAsync(f => f.CreatedAt.Date == d),
            collections = await db.CashboxTransactions.Where(t => t.SourceType == "collection" && t.CreatedAt.Date == d).SumAsync(t => (decimal?)t.Amount) ?? 0,
            cash_in = await db.CashboxTransactions.Where(t => t.SourceType != "transfer" && t.Type == "in" && t.CreatedAt.Date == d).SumAsync(t => (decimal?)t.Amount) ?? 0,
            cash_out = await db.CashboxTransactions.Where(t => t.SourceType != "transfer" && t.Type == "out" && t.CreatedAt.Date == d).SumAsync(t => (decimal?)t.Amount) ?? 0,
        });
    }

    [HttpGet("collection-summary")]
    public async Task<IActionResult> CollectionSummary([FromQuery] DateTime? start, [FromQuery] DateTime? end)
    {
        var (s, e) = Range(start, end);
        var rows = await db.AccountTransactions
            .Where(t => t.SourceType == "collection" && t.CreatedAt >= s && t.CreatedAt <= e)
            .GroupBy(t => t.PaymentMethod)
            .Select(grp => new { payment_method = grp.Key, count = grp.Count(), total = grp.Sum(t => t.Amount) })
            .ToListAsync();
        return Ok(new { start = DateOnly.FromDateTime(s).ToString("yyyy-MM-dd"), end = DateOnly.FromDateTime(e).ToString("yyyy-MM-dd"),
            total = rows.Sum(r => r.total), by_method = rows });
    }

    [HttpGet("staff-performance")]
    public async Task<IActionResult> StaffPerformance([FromQuery] DateTime? start, [FromQuery] DateTime? end)
    {
        var (s, e) = Range(start, end);
        var users = await db.Users.Where(u => u.TenantId == db.CurrentTenantId && u.Role == "technician")
            .Select(u => new { u.Id, u.Name, u.Surname }).ToListAsync();

        var data = new List<object>();
        foreach (var u in users)
        {
            data.Add(new
            {
                user = $"{u.Name} {u.Surname}".Trim(),
                completed_maint = await db.MaintenanceRecords.CountAsync(m => m.Status == "completed" && m.CompletedAt >= s && m.CompletedAt <= e),
                resolved_faults = await db.FaultReports.CountAsync(f => f.AssignedUserId == u.Id && f.ResolvedAt >= s && f.ResolvedAt <= e),
            });
        }
        return Ok(new { start = DateOnly.FromDateTime(s).ToString("yyyy-MM-dd"), end = DateOnly.FromDateTime(e).ToString("yyyy-MM-dd"), data });
    }

    [HttpGet("inventory-movements")]
    public async Task<IActionResult> InventoryMovements([FromQuery] DateTime? start, [FromQuery] DateTime? end,
        [FromQuery(Name = "product_id")] long? productId)
    {
        var (s, e) = Range(start, end);
        var q = db.StockMovements.Where(m => m.CreatedAt >= s && m.CreatedAt <= e);
        if (productId is { } p) q = q.Where(m => m.ProductId == p);
        return Ok(new
        {
            start = DateOnly.FromDateTime(s).ToString("yyyy-MM-dd"),
            end = DateOnly.FromDateTime(e).ToString("yyyy-MM-dd"),
            @in = await q.Where(m => m.Type == "in").SumAsync(m => (decimal?)m.Quantity) ?? 0,
            @out = await q.Where(m => m.Type == "out").SumAsync(m => (decimal?)m.Quantity) ?? 0,
            items = await q.OrderByDescending(m => m.Id).Take(500).ToListAsync(),
        });
    }
}
