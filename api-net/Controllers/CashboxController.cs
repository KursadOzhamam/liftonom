using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/cashboxes")]
public class CashboxController(AppDbContext db, LedgerService ledger) : ControllerBase
{
    public record CashboxDto(string Name, string Type, decimal? Balance, string? Currency);
    public record TransferDto(long FromId, long ToId, decimal Amount);

    [HttpGet]
    public async Task<IActionResult> Index()
    {
        var boxes = await db.Cashboxes.Where(c => c.IsActive).OrderBy(c => c.Name).ToListAsync();
        return Ok(new { data = boxes, total = boxes.Sum(c => c.Balance) });
    }

    [HttpPost]
    public async Task<IActionResult> Store(CashboxDto dto)
    {
        var now = DateTime.UtcNow;
        var c = new Cashbox
        {
            TenantId = db.CurrentTenantId!.Value, Name = dto.Name, Type = dto.Type,
            Balance = dto.Balance ?? 0, Currency = dto.Currency ?? "TRY", CreatedAt = now, UpdatedAt = now,
        };
        db.Cashboxes.Add(c);
        await db.SaveChangesAsync();
        return StatusCode(201, c);
    }

    [HttpPost("transfer")]
    public async Task<IActionResult> Transfer(TransferDto dto)
    {
        var uid = long.Parse(User.FindFirst("uid")!.Value);
        var (from, to) = await ledger.TransferAsync(dto.FromId, dto.ToId, dto.Amount, uid);
        return Ok(new { message = "Transfer tamamlandı.", from_balance = from, to_balance = to });
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Show(long id, [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var c = await db.Cashboxes.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Kasa bulunamadı.");
        var txns = await db.CashboxTransactions.Where(t => t.CashboxId == id).OrderByDescending(t => t.Id).ToPagedAsync(page, perPage);
        return Ok(new { cashbox = c, transactions = txns });
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] CashboxDto dto)
    {
        var c = await db.Cashboxes.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Kasa bulunamadı.");
        if (!string.IsNullOrWhiteSpace(dto.Name)) c.Name = dto.Name;
        c.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(c);
    }
}
