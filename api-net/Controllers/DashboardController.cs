using Liftonom.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/dashboard")]
public class DashboardController(AppDbContext db) : ControllerBase
{
    [HttpGet("kpis")]
    public async Task<IActionResult> Kpis()
    {
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var unpaidInvoices = await db.Invoices
            .Where(i => i.Status == "sent" || i.Status == "overdue")
            .Select(i => (i.Total ?? 0) - i.PaidAmount)
            .ToListAsync();

        return Ok(new
        {
            Customers = await db.Customers.CountAsync(),
            ActiveElevators = await db.Elevators.CountAsync(e => e.Status == "active"),
            MaintenanceMonth = await db.MaintenanceRecords.CountAsync(m => m.PlannedDate >= monthStart),
            OpenFaults = await db.FaultReports.CountAsync(f => f.Status != "resolved" && f.Status != "closed"),
            RevenueMonth = await db.CashboxTransactions
                .Where(t => t.SourceType != "transfer" && t.Type == "in" && t.CreatedAt >= monthStart)
                .SumAsync(t => (decimal?)t.Amount) ?? 0,
            Unpaid = unpaidInvoices.Sum(),
        });
    }

    [HttpGet("revenue-chart")]
    public async Task<IActionResult> RevenueChart()
    {
        var since = DateTime.UtcNow.AddMonths(-5);
        since = new DateTime(since.Year, since.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var raw = await db.CashboxTransactions
            .Where(t => t.SourceType != "transfer" && t.Type == "in" && t.CreatedAt >= since)
            .GroupBy(t => new { t.CreatedAt.Year, t.CreatedAt.Month })
            .Select(grp => new { grp.Key.Year, grp.Key.Month, Total = grp.Sum(t => t.Amount) })
            .ToListAsync();
        var rows = raw.OrderBy(x => x.Year).ThenBy(x => x.Month)
            .Select(x => new { Month = $"{x.Year:D4}-{x.Month:D2}", x.Total });
        return Ok(rows);
    }

    [HttpGet("cashbox-summary")]
    public async Task<IActionResult> CashboxSummary() =>
        Ok(await db.Cashboxes.Where(c => c.IsActive)
            .Select(c => new { c.Id, c.Name, c.Type, c.Balance }).ToListAsync());

    [HttpGet("upcoming-maintenance")]
    public async Task<IActionResult> UpcomingMaintenance() =>
        Ok(await db.MaintenanceRecords.Where(m => m.Status == "pending"
                && m.PlannedDate >= DateTime.UtcNow && m.PlannedDate <= DateTime.UtcNow.AddDays(7))
            .OrderBy(m => m.PlannedDate).Take(10)
            .Select(m => new { m.Id, m.PlannedDate, Elevator = new { m.Elevator!.Name } }).ToListAsync());

    [HttpGet("open-faults")]
    public async Task<IActionResult> OpenFaults() =>
        Ok(await db.FaultReports.Where(f => f.Status != "resolved" && f.Status != "closed")
            .OrderByDescending(f => f.Id).Take(5)
            .Select(f => new { f.Id, f.Priority, f.Description, Elevator = new { f.Elevator!.Name } }).ToListAsync());

    [HttpGet("tse-warnings")]
    public async Task<IActionResult> TseWarnings()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var in30 = today.AddDays(30);
        return Ok(await db.Elevators.Where(e => e.TseEndDate != null && e.TseEndDate >= today && e.TseEndDate <= in30)
            .OrderBy(e => e.TseEndDate).Take(20)
            .Select(e => new { e.Id, e.Name, e.TseEndDate, Building = new { e.Building!.Name } }).ToListAsync());
    }
}
