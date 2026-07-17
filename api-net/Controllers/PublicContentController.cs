using Liftonom.Api.Data;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

/// <summary>Herkese açık içerik: çözümler, şehirler, blog (rehber), yasal sayfalar.</summary>
[ApiController]
[AllowAnonymous]
[Route("api/v1/public")]
public class PublicContentController(AppDbContext db) : ControllerBase
{
    [HttpGet("content")]
    public async Task<IActionResult> List([FromQuery] string? type)
    {
        var q = db.ContentPages.Where(c => c.IsPublished);
        if (!string.IsNullOrWhiteSpace(type)) q = q.Where(c => c.Type == type);
        var rows = await q
            .OrderBy(c => c.SortOrder).ThenByDescending(c => c.PublishedAt).ThenByDescending(c => c.Id)
            .Select(c => new { c.Id, c.Type, c.Slug, c.Title, c.Excerpt, c.CoverUrl, c.Icon, c.PublishedAt })
            .ToListAsync();
        return Ok(rows);
    }

    [HttpGet("content/{slug}")]
    public async Task<IActionResult> One(string slug)
    {
        var c = await db.ContentPages.Where(x => x.IsPublished && x.Slug == slug)
            .Select(x => new { x.Id, x.Type, x.Slug, x.Title, x.Excerpt, x.Body, x.CoverUrl, x.Icon, x.PublishedAt })
            .FirstOrDefaultAsync()
            ?? throw new ApiException(404, "Sayfa bulunamadı.");
        return Ok(c);
    }
}
