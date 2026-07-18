using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/whatsapp")]
public class WhatsAppController(AppDbContext db) : ControllerBase
{
    [HttpGet("history")]
    public async Task<IActionResult> History([FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1) =>
        Ok(await db.WhatsAppLogs.OrderByDescending(w => w.Id).ToPagedAsync(page, perPage));

    // ─────────── Mesaj şablonları ───────────
    public record TemplateDto(string? Name, string? Body);

    [HttpGet("templates")]
    public async Task<IActionResult> Templates() =>
        Ok(await db.WhatsAppTemplates.OrderByDescending(t => t.Id)
            .Select(t => new { t.Id, t.Name, t.Body }).ToListAsync());

    [HttpPost("templates")]
    public async Task<IActionResult> CreateTemplate(TemplateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) throw new ApiException(422, "Şablon adı zorunludur.");
        if (string.IsNullOrWhiteSpace(dto.Body)) throw new ApiException(422, "Mesaj metni zorunludur.");
        var now = DateTime.UtcNow;
        var t = new WhatsAppTemplate
        {
            TenantId = db.CurrentTenantId!.Value, Name = dto.Name!.Trim(), Body = dto.Body!,
            CreatedAt = now, UpdatedAt = now,
        };
        db.WhatsAppTemplates.Add(t);
        await db.SaveChangesAsync();
        return StatusCode(201, new { t.Id });
    }

    [HttpPut("templates/{id:long}")]
    public async Task<IActionResult> UpdateTemplate(long id, TemplateDto dto)
    {
        var t = await db.WhatsAppTemplates.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Şablon bulunamadı.");
        if (!string.IsNullOrWhiteSpace(dto.Name)) t.Name = dto.Name!.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Body)) t.Body = dto.Body!;
        t.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { t.Id });
    }

    [HttpDelete("templates/{id:long}")]
    public async Task<IActionResult> DeleteTemplate(long id)
    {
        var t = await db.WhatsAppTemplates.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Şablon bulunamadı.");
        t.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Şablon silindi." });
    }
}
