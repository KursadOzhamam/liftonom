using Liftonom.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/finance")]
public class FinanceController(AppDbContext db) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<IActionResult> Summary()
    {
        var boxes = await db.Cashboxes.Where(c => c.IsActive).ToListAsync();
        var todayStart = DateTime.UtcNow.Date;
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        async Task<decimal> Sum(DateTime since, string type) =>
            await db.CashboxTransactions
                .Where(t => t.SourceType != "transfer" && t.Type == type && t.CreatedAt >= since)
                .SumAsync(t => (decimal?)t.Amount) ?? 0;

        return Ok(new
        {
            total_balance = boxes.Sum(b => b.Balance),
            cash_total = boxes.Where(b => b.Type == "cash").Sum(b => b.Balance),
            bank_total = boxes.Where(b => b.Type == "bank").Sum(b => b.Balance),
            today = new { @in = await Sum(todayStart, "in"), @out = await Sum(todayStart, "out") },
            this_month = new { @in = await Sum(monthStart, "in"), @out = await Sum(monthStart, "out") },
        });
    }

    [HttpGet("monthly")]
    public async Task<IActionResult> Monthly()
    {
        var since = DateTime.UtcNow.AddMonths(-11);
        since = new DateTime(since.Year, since.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var raw = await db.CashboxTransactions
            .Where(t => t.SourceType != "transfer" && t.CreatedAt >= since)
            .GroupBy(t => new { t.CreatedAt.Year, t.CreatedAt.Month })
            .Select(grp => new
            {
                grp.Key.Year, grp.Key.Month,
                Income = grp.Where(t => t.Type == "in").Sum(t => (decimal?)t.Amount) ?? 0,
                Expense = grp.Where(t => t.Type == "out").Sum(t => (decimal?)t.Amount) ?? 0,
            })
            .ToListAsync();
        var rows = raw.OrderBy(x => x.Year).ThenBy(x => x.Month)
            .Select(x => new { Month = $"{x.Year:D4}-{x.Month:D2}", x.Income, x.Expense });

        return Ok(rows);
    }
}
