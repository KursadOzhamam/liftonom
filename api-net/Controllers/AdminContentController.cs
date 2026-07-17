using System.Text.RegularExpressions;
using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

/// <summary>Süper Admin: içerik sayfaları (çözüm/şehir/blog/yasal) yönetimi.</summary>
[ApiController]
[Authorize(Policy = "Admin")]
[Route("api/v1/admin/content")]
public class AdminContentController(AppDbContext db) : ControllerBase
{
    public record ContentDto(string? Type, string? Slug, string? Title, string? Excerpt, string? Body,
        string? CoverUrl, string? Icon, int SortOrder, bool IsPublished, DateOnly? PublishedAt);

    [HttpGet("")]
    public async Task<IActionResult> List()
    {
        var rows = await db.ContentPages.OrderBy(c => c.Type).ThenBy(c => c.SortOrder).ThenBy(c => c.Id)
            .Select(c => new { c.Id, c.Type, c.Slug, c.Title, c.Excerpt, c.Body, c.CoverUrl, c.Icon, c.SortOrder, c.IsPublished, c.PublishedAt })
            .ToListAsync();
        return Ok(rows);
    }

    [HttpPost("")]
    public async Task<IActionResult> Create(ContentDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Type)) throw new ApiException(422, "Tür zorunludur.");
        if (string.IsNullOrWhiteSpace(dto.Title)) throw new ApiException(422, "Başlık zorunludur.");
        var now = DateTime.UtcNow;
        var slug = await UniqueSlug(string.IsNullOrWhiteSpace(dto.Slug) ? dto.Title! : dto.Slug!, null);
        var c = new ContentPage
        {
            Type = dto.Type!, Slug = slug, Title = dto.Title!.Trim(), Excerpt = dto.Excerpt, Body = dto.Body,
            CoverUrl = dto.CoverUrl, Icon = dto.Icon, SortOrder = dto.SortOrder, IsPublished = dto.IsPublished,
            PublishedAt = dto.PublishedAt, CreatedAt = now, UpdatedAt = now,
        };
        db.ContentPages.Add(c);
        await db.SaveChangesAsync();
        return StatusCode(201, new { c.Id, c.Slug });
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, ContentDto dto)
    {
        var c = await db.ContentPages.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Bulunamadı.");
        if (!string.IsNullOrWhiteSpace(dto.Type)) c.Type = dto.Type!;
        if (!string.IsNullOrWhiteSpace(dto.Title)) c.Title = dto.Title!.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Slug)) c.Slug = await UniqueSlug(dto.Slug!, id);
        c.Excerpt = dto.Excerpt;
        c.Body = dto.Body;
        c.CoverUrl = dto.CoverUrl;
        c.Icon = dto.Icon;
        c.SortOrder = dto.SortOrder;
        c.IsPublished = dto.IsPublished;
        c.PublishedAt = dto.PublishedAt;
        c.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { c.Id, c.Slug });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        var c = await db.ContentPages.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Bulunamadı.");
        c.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Silindi." });
    }

    private async Task<string> UniqueSlug(string input, long? excludeId)
    {
        var s = input.ToLowerInvariant().Trim()
            .Replace('ı', 'i').Replace('ğ', 'g').Replace('ü', 'u').Replace('ş', 's').Replace('ö', 'o').Replace('ç', 'c');
        s = Regex.Replace(s, "[^a-z0-9]+", "-").Trim('-');
        if (string.IsNullOrEmpty(s)) s = "sayfa";
        var slug = s;
        var i = 1;
        while (await db.ContentPages.AnyAsync(c => c.Slug == slug && (excludeId == null || c.Id != excludeId)))
            slug = $"{s}-{++i}";
        return slug;
    }
}
