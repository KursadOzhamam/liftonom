using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/contracts")]
public class ContractController(AppDbContext db) : ControllerBase
{
    public record ContractDto(long? CustomerId, string? Type, DateOnly? StartDate, DateOnly? EndDate,
        decimal? MonthlyFee, bool? AutoRenew, string? Status, string? Notes);
    public record RenewDto(int? Months);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string? status, [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var q = db.Contracts.AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(c => c.Status == status);
        var projected = q.OrderByDescending(c => c.Id).Select(c => new
        {
            c.Id, c.ContractNumber, c.Type, c.StartDate, c.EndDate, c.MonthlyFee, c.Status,
            Customer = c.CustomerId == null ? null : new { c.Customer!.Name },
        });
        return Ok(await projected.ToPagedAsync(page, perPage));
    }

    [HttpPost]
    public async Task<IActionResult> Store(ContractDto dto)
    {
        if (dto.CustomerId == null) throw new ApiException(422, "Müşteri zorunludur.");
        var now = DateTime.UtcNow;
        var c = new Contract
        {
            TenantId = db.CurrentTenantId!.Value, CustomerId = dto.CustomerId, Type = dto.Type,
            StartDate = dto.StartDate, EndDate = dto.EndDate, MonthlyFee = dto.MonthlyFee,
            AutoRenew = dto.AutoRenew ?? false, Status = dto.Status ?? "active", Notes = dto.Notes,
            CreatedAt = now, UpdatedAt = now,
        };
        db.Contracts.Add(c);
        await db.SaveChangesAsync();
        c.ContractNumber = $"SZL-{c.Id:D6}";
        await db.SaveChangesAsync();
        return StatusCode(201, c);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Show(long id) =>
        Ok(await db.Contracts.Include(c => c.Customer).FirstOrDefaultAsync(c => c.Id == id) ?? throw new ApiException(404, "Sözleşme bulunamadı."));

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, ContractDto dto)
    {
        var c = await db.Contracts.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Sözleşme bulunamadı.");
        if (dto.CustomerId is { } cid) c.CustomerId = cid;
        c.Type = dto.Type; c.StartDate = dto.StartDate; c.EndDate = dto.EndDate; c.MonthlyFee = dto.MonthlyFee;
        if (dto.AutoRenew is { } ar) c.AutoRenew = ar;
        if (dto.Status != null) c.Status = dto.Status;
        c.Notes = dto.Notes; c.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(c);
    }

    [HttpPost("{id:long}/renew")]
    public async Task<IActionResult> Renew(long id, RenewDto dto)
    {
        var c = await db.Contracts.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Sözleşme bulunamadı.");
        var months = dto.Months ?? 12;
        var baseDate = c.EndDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        c.StartDate = baseDate;
        c.EndDate = baseDate.AddMonths(months);
        c.Status = "active"; c.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(c);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var c = await db.Contracts.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Sözleşme bulunamadı.");
        c.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Sözleşme silindi." });
    }
}
