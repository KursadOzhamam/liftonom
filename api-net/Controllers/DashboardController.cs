using LiftOtonom.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LiftOtonom.Api.Controllers;

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
}
