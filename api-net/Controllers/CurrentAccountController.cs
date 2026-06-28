using LiftOtonom.Api.Data;
using LiftOtonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LiftOtonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/current-accounts")]
public class CurrentAccountController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string? search,
        [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var q = db.Customers.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(c => EF.Functions.ILike(c.Name, $"%{search}%"));

        var projected = q.Select(c => new
        {
            c.Id, c.Name, c.Phone,
            Balance = db.CurrentAccounts.Where(a => a.CustomerId == c.Id).Select(a => (decimal?)a.Balance).FirstOrDefault() ?? 0m,
        }).OrderByDescending(x => x.Balance);

        return Ok(await projected.ToPagedAsync(page, perPage));
    }

    [HttpGet("{customerId:long}")]
    public async Task<IActionResult> Show(long customerId, [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var customer = await db.Customers.FirstOrDefaultAsync(c => c.Id == customerId)
            ?? throw new ApiException(404, "Müşteri bulunamadı.");
        var account = await db.CurrentAccounts.FirstOrDefaultAsync(a => a.CustomerId == customerId);

        object transactions = account == null
            ? new { data = Array.Empty<object>(), meta = new { current_page = 1, last_page = 1, total = 0, per_page = perPage } }
            : await db.AccountTransactions.Where(t => t.AccountId == account.Id).OrderByDescending(t => t.Id).ToPagedAsync(page, perPage);

        return Ok(new
        {
            customer = new { customer.Id, customer.Name },
            balance = account?.Balance ?? 0,
            transactions,
        });
    }
}
