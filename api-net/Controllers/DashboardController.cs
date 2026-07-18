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
    // Zengin ana sayfa — tek çağrıda banner + sayaçlar + hasılat + kasa + çek/senet (hepsi gerçek veri).
    [HttpGet("overview")]
    public async Task<IActionResult> Overview()
    {
        var now = DateTime.UtcNow;
        var todayStart = new DateTime(now.Year, now.Month, now.Day, 0, 0, 0, DateTimeKind.Utc);
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var weekStart = todayStart.AddDays(-(((int)now.DayOfWeek + 6) % 7)); // Pazartesi başlangıç
        var today = DateOnly.FromDateTime(now);
        var due15 = today.AddDays(15);

        var tenant = await db.Tenants.FindAsync(db.CurrentTenantId!.Value);
        var uid = long.Parse(User.FindFirst("uid")!.Value);
        var me = await db.Users.FindAsync(uid);

        // Hasılat (nakit girişleri, transfer hariç)
        var inTx = db.CashboxTransactions.Where(t => t.SourceType != "transfer" && t.Type == "in");
        var revToday = await inTx.Where(t => t.CreatedAt >= todayStart).SumAsync(t => (decimal?)t.Amount) ?? 0;
        var revWeek = await inTx.Where(t => t.CreatedAt >= weekStart).SumAsync(t => (decimal?)t.Amount) ?? 0;
        var revMonth = await inTx.Where(t => t.CreatedAt >= monthStart).SumAsync(t => (decimal?)t.Amount) ?? 0;

        // Kasa bazında bu ayın hareketleri (bugün alt kümesi)
        var txMonth = await db.CashboxTransactions
            .Where(t => t.SourceType != "transfer" && t.CreatedAt >= monthStart)
            .Select(t => new { t.CashboxId, t.Type, t.Amount, t.CreatedAt })
            .ToListAsync();
        var cashboxes = await db.Cashboxes.Where(c => c.IsActive)
            .Select(c => new { c.Id, c.Name, c.Type, c.Balance }).ToListAsync();
        var cashboxRows = cashboxes.Select(c =>
        {
            var mine = txMonth.Where(t => t.CashboxId == c.Id).ToList();
            return new
            {
                c.Id, c.Name, c.Type, c.Balance,
                Today = mine.Where(t => t.CreatedAt >= todayStart).Sum(t => (t.Type == "in" ? 1 : -1) * t.Amount),
                Month = mine.Sum(t => (t.Type == "in" ? 1 : -1) * t.Amount),
            };
        }).ToList();

        // Çek & Senet portföyü (alınan çek/senetler)
        var checks = await db.Checks.Where(c => c.Direction == "received")
            .Select(c => new { c.Status, c.Amount, c.DueDate }).ToListAsync();
        var portfolio = checks.Where(c => c.Status == "portfolio").ToList();
        var dueSoon = portfolio.Where(c => c.DueDate != null && c.DueDate >= today && c.DueDate <= due15).ToList();
        var bounced = await db.Checks.CountAsync(c => c.Status == "bounced");

        var openFaultsQ = db.FaultReports.Where(f => f.Status != "resolved" && f.Status != "closed");

        return Ok(new
        {
            User = new { Name = me?.Name ?? "" },
            Firm = new { Name = tenant?.Name ?? "" },
            Plan = new
            {
                Code = tenant?.Plan ?? "trial",
                ExpiresAt = tenant?.PlanExpiresAt,
                DaysLeft = tenant?.PlanExpiresAt is { } exp ? Math.Max(0, (int)Math.Ceiling((exp - now).TotalDays)) : (int?)null,
                SmsBalance = tenant?.SmsBalance ?? 0,
            },
            Counts = new
            {
                Buildings = await db.Buildings.CountAsync(),
                BuildingsThisMonth = await db.Buildings.CountAsync(b => b.CreatedAt >= monthStart),
                Elevators = await db.Elevators.CountAsync(),
                ElevatorsThisMonth = await db.Elevators.CountAsync(e => e.CreatedAt >= monthStart),
                OpenFaults = await openFaultsQ.CountAsync(),
                UrgentFaults = await openFaultsQ.CountAsync(f => f.Priority == "urgent"),
                PlannedMaintenance = await db.MaintenanceRecords.CountAsync(m => m.Status == "pending"),
                UpcomingWeek = await db.MaintenanceRecords.CountAsync(m => m.Status == "pending"
                    && m.PlannedDate >= now && m.PlannedDate <= now.AddDays(7)),
            },
            Revenue = new { Today = revToday, Week = revWeek, Month = revMonth },
            Cashboxes = cashboxRows,
            Checks = new
            {
                PortfolioCount = portfolio.Count,
                PortfolioAmount = portfolio.Sum(c => c.Amount),
                DueSoonCount = dueSoon.Count,
                DueSoonAmount = dueSoon.Sum(c => c.Amount),
                BouncedCount = bounced,
            },
        });
    }

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
    public async Task<IActionResult> UpcomingMaintenance([FromQuery] bool mine = false)
    {
        var q = db.MaintenanceRecords.Where(m => m.Status == "pending"
            && m.PlannedDate >= DateTime.UtcNow && m.PlannedDate <= DateTime.UtcNow.AddDays(7));
        if (mine)
        {
            var uid = long.Parse(User.FindFirst("uid")!.Value);
            q = q.Where(m => EF.Functions.JsonContains(m.AssignedUsers!, $"[{uid}]"));
        }
        return Ok(await q.OrderBy(m => m.PlannedDate).Take(10)
            .Select(m => new { m.Id, m.PlannedDate, Elevator = new { m.Elevator!.Name } }).ToListAsync());
    }

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
