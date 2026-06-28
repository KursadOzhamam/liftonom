using System.Text.Json;
using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/quotes")]
public class QuoteController(AppDbContext db, PdfService pdf) : ControllerBase
{
    public record QuoteDto(long? CustomerId, DateOnly? ValidUntil, List<LineItem>? Items, decimal? TaxRate, decimal? Discount, string? Notes);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string? status, [FromQuery(Name = "customer_id")] long? customerId,
        [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var q = db.Quotes.AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(x => x.Status == status);
        if (customerId is { } c) q = q.Where(x => x.CustomerId == c);

        var projected = q.OrderByDescending(x => x.Id).Select(x => new
        {
            x.Id, x.QuoteNumber, x.Status, x.Total, x.ValidUntil,
            Customer = x.CustomerId == null ? null : new { x.Customer!.Name },
        });
        return Ok(await projected.ToPagedAsync(page, perPage));
    }

    [HttpPost]
    public async Task<IActionResult> Store(QuoteDto dto)
    {
        if (dto.CustomerId == null) throw new ApiException(422, "Müşteri zorunludur.");
        var t = DocumentTotals.Compute(dto.Items, dto.TaxRate ?? 20, dto.Discount ?? 0);
        var now = DateTime.UtcNow;
        var q = new Quote
        {
            TenantId = db.CurrentTenantId!.Value, CustomerId = dto.CustomerId, Status = "draft",
            ValidUntil = dto.ValidUntil, Items = JsonSerializer.Serialize(dto.Items ?? []),
            Subtotal = t.Subtotal, TaxRate = t.TaxRate, TaxAmount = t.TaxAmount, Discount = t.Discount, Total = t.Total,
            Notes = dto.Notes, CreatedBy = long.Parse(User.FindFirst("uid")!.Value), CreatedAt = now, UpdatedAt = now,
        };
        db.Quotes.Add(q);
        await db.SaveChangesAsync();
        q.QuoteNumber = $"TEK-{q.Id:D6}";
        await db.SaveChangesAsync();
        return StatusCode(201, q);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Show(long id) =>
        Ok(await db.Quotes.Include(q => q.Customer).FirstOrDefaultAsync(q => q.Id == id) ?? throw new ApiException(404, "Teklif bulunamadı."));

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, QuoteDto dto)
    {
        var q = await db.Quotes.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Teklif bulunamadı.");
        if (dto.CustomerId is { } cid) q.CustomerId = cid;
        if (dto.ValidUntil is { } vu) q.ValidUntil = vu;
        if (dto.Items != null)
        {
            var t = DocumentTotals.Compute(dto.Items, dto.TaxRate ?? q.TaxRate, dto.Discount ?? q.Discount);
            q.Items = JsonSerializer.Serialize(dto.Items);
            q.Subtotal = t.Subtotal; q.TaxRate = t.TaxRate; q.TaxAmount = t.TaxAmount; q.Discount = t.Discount; q.Total = t.Total;
        }
        if (dto.Notes != null) q.Notes = dto.Notes;
        q.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(q);
    }

    [HttpPost("{id:long}/send")] public Task<IActionResult> Send(long id) => SetStatus(id, "sent");
    [HttpPost("{id:long}/approve")] public Task<IActionResult> Approve(long id) => SetStatus(id, "approved");
    [HttpPost("{id:long}/reject")] public Task<IActionResult> Reject(long id) => SetStatus(id, "rejected");

    private async Task<IActionResult> SetStatus(long id, string status)
    {
        var q = await db.Quotes.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Teklif bulunamadı.");
        q.Status = status; q.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(q);
    }

    [HttpGet("{id:long}/pdf")]
    public async Task<IActionResult> Pdf(long id)
    {
        var q = await db.Quotes.Include(x => x.Customer).FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new ApiException(404, "Teklif bulunamadı.");
        var tenant = await db.Tenants.FindAsync(db.CurrentTenantId!.Value);
        var bytes = pdf.Generate("TEKLİF", q.QuoteNumber ?? $"#{q.Id}", tenant!, q.Customer?.Name ?? "-",
            q.Items, q.Subtotal ?? 0, q.TaxRate, q.TaxAmount ?? 0, q.Discount, q.Total ?? 0,
            DateOnly.FromDateTime(q.CreatedAt));
        return File(bytes, "application/pdf", $"{q.QuoteNumber}.pdf");
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var q = await db.Quotes.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Teklif bulunamadı.");
        q.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Teklif silindi." });
    }
}
