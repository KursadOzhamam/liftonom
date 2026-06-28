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
[Route("api/v1/invoices")]
public class InvoiceController(AppDbContext db, LedgerService ledger, PdfService pdf) : ControllerBase
{
    public record InvoiceDto(long CustomerId, string? Type, DateOnly? IssueDate, DateOnly? DueDate,
        List<LineItem>? Items, decimal? TaxRate, decimal? Discount, string? Notes);
    public record PayDto(decimal Amount, long CashboxId, string PaymentMethod);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string? status, [FromQuery(Name = "customer_id")] long? customerId,
        [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var q = db.Invoices.AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(i => i.Status == status);
        if (customerId is { } c) q = q.Where(i => i.CustomerId == c);
        var projected = q.OrderByDescending(i => i.Id).Select(i => new
        {
            i.Id, i.InvoiceNumber, i.Status, i.Total, i.PaidAmount, i.IssueDate, i.DueDate,
            Customer = i.CustomerId == null ? null : new { i.Customer!.Name },
        });
        return Ok(await projected.ToPagedAsync(page, perPage));
    }

    [HttpPost]
    public async Task<IActionResult> Store(InvoiceDto dto)
    {
        var t = DocumentTotals.Compute(dto.Items, dto.TaxRate ?? 20, dto.Discount ?? 0);
        var now = DateTime.UtcNow;
        var inv = new Invoice
        {
            TenantId = db.CurrentTenantId!.Value, CustomerId = dto.CustomerId, Type = dto.Type ?? "e-archive",
            Status = "draft", IssueDate = dto.IssueDate ?? DateOnly.FromDateTime(DateTime.UtcNow), DueDate = dto.DueDate,
            Items = JsonSerializer.Serialize(dto.Items ?? []), Subtotal = t.Subtotal, TaxRate = t.TaxRate,
            TaxAmount = t.TaxAmount, Discount = t.Discount, Total = t.Total, Notes = dto.Notes,
            CreatedBy = long.Parse(User.FindFirst("uid")!.Value), CreatedAt = now, UpdatedAt = now,
        };
        db.Invoices.Add(inv);
        await db.SaveChangesAsync();
        inv.InvoiceNumber = $"FTR-{inv.Id:D6}";
        await db.SaveChangesAsync();
        return StatusCode(201, inv);
    }

    [HttpPost("from-quote/{quoteId:long}")]
    public async Task<IActionResult> FromQuote(long quoteId)
    {
        var q = await db.Quotes.FirstOrDefaultAsync(x => x.Id == quoteId) ?? throw new ApiException(404, "Teklif bulunamadı.");
        var now = DateTime.UtcNow;
        var inv = new Invoice
        {
            TenantId = db.CurrentTenantId!.Value, CustomerId = q.CustomerId, Status = "draft",
            IssueDate = DateOnly.FromDateTime(DateTime.UtcNow), Items = q.Items, Subtotal = q.Subtotal,
            TaxRate = q.TaxRate, TaxAmount = q.TaxAmount, Discount = q.Discount, Total = q.Total,
            SourceType = "quote", SourceId = q.Id, CreatedBy = long.Parse(User.FindFirst("uid")!.Value),
            CreatedAt = now, UpdatedAt = now,
        };
        db.Invoices.Add(inv);
        await db.SaveChangesAsync();
        inv.InvoiceNumber = $"FTR-{inv.Id:D6}";
        await db.SaveChangesAsync();
        return StatusCode(201, inv);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Show(long id) =>
        Ok(await db.Invoices.Include(i => i.Customer).FirstOrDefaultAsync(i => i.Id == id) ?? throw new ApiException(404, "Fatura bulunamadı."));

    [HttpPost("{id:long}/send")]
    public async Task<IActionResult> Send(long id)
    {
        var inv = await db.Invoices.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Fatura bulunamadı.");
        inv.Status = "sent"; inv.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(inv);
    }

    [HttpPost("{id:long}/pay")]
    public async Task<IActionResult> Pay(long id, PayDto dto)
    {
        var inv = await db.Invoices.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Fatura bulunamadı.");
        var uid = long.Parse(User.FindFirst("uid")!.Value);
        await ledger.CollectAsync(inv.CustomerId!.Value, dto.Amount, dto.PaymentMethod, dto.CashboxId,
            $"Fatura {inv.InvoiceNumber} ödemesi", uid);
        inv.PaidAmount += dto.Amount;
        if (inv.PaidAmount >= (inv.Total ?? 0)) inv.Status = "paid";
        inv.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(inv);
    }

    [HttpGet("{id:long}/pdf")]
    public async Task<IActionResult> Pdf(long id)
    {
        var inv = await db.Invoices.Include(i => i.Customer).FirstOrDefaultAsync(i => i.Id == id)
            ?? throw new ApiException(404, "Fatura bulunamadı.");
        var tenant = await db.Tenants.FindAsync(db.CurrentTenantId!.Value);
        var bytes = pdf.Generate("FATURA", inv.InvoiceNumber ?? $"#{inv.Id}", tenant!, inv.Customer?.Name ?? "-",
            inv.Items, inv.Subtotal ?? 0, inv.TaxRate, inv.TaxAmount ?? 0, inv.Discount, inv.Total ?? 0, inv.IssueDate);
        return File(bytes, "application/pdf", $"{inv.InvoiceNumber}.pdf");
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var inv = await db.Invoices.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Fatura bulunamadı.");
        inv.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Fatura silindi." });
    }
}
