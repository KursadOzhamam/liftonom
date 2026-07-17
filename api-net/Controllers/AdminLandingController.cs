using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

/// <summary>Süper Admin: landing (tanıtım) sayfası içerik yönetimi.</summary>
[ApiController]
[Authorize(Policy = "Admin")]
[Route("api/v1/admin/landing")]
public class AdminLandingController(AppDbContext db) : ControllerBase
{
    public record SettingsDto(string? HeroBadge, string? HeroTitle, string? HeroTitleAccent, string? HeroSubtitle, bool ShowPricing);
    public record ItemDto(string? Section, string? Title, string? Description, string? Icon, int SortOrder, bool IsActive);

    [HttpGet("")]
    public async Task<IActionResult> Get()
    {
        var s = await db.LandingSettings.FirstOrDefaultAsync();
        var items = await db.LandingItems.OrderBy(i => i.Section).ThenBy(i => i.SortOrder).ThenBy(i => i.Id)
            .Select(i => new { i.Id, i.Section, i.Title, i.Description, i.Icon, i.SortOrder, i.IsActive })
            .ToListAsync();
        return Ok(new
        {
            settings = new
            {
                hero_badge = s?.HeroBadge,
                hero_title = s?.HeroTitle,
                hero_title_accent = s?.HeroTitleAccent,
                hero_subtitle = s?.HeroSubtitle,
                show_pricing = s?.ShowPricing ?? true,
            },
            items,
        });
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings(SettingsDto dto)
    {
        var s = await db.LandingSettings.FirstOrDefaultAsync();
        if (s == null) { s = new LandingSetting { CreatedAt = DateTime.UtcNow }; db.LandingSettings.Add(s); }
        s.HeroBadge = dto.HeroBadge;
        s.HeroTitle = dto.HeroTitle;
        s.HeroTitleAccent = dto.HeroTitleAccent;
        s.HeroSubtitle = dto.HeroSubtitle;
        s.ShowPricing = dto.ShowPricing;
        s.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Kaydedildi." });
    }

    [HttpPost("items")]
    public async Task<IActionResult> Create(ItemDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Section)) throw new ApiException(422, "Bölüm zorunludur.");
        if (string.IsNullOrWhiteSpace(dto.Title)) throw new ApiException(422, "Başlık zorunludur.");
        var now = DateTime.UtcNow;
        var it = new LandingItem
        {
            Section = dto.Section!, Title = dto.Title!.Trim(), Description = dto.Description, Icon = dto.Icon,
            SortOrder = dto.SortOrder, IsActive = dto.IsActive, CreatedAt = now, UpdatedAt = now,
        };
        db.LandingItems.Add(it);
        await db.SaveChangesAsync();
        return StatusCode(201, new { it.Id });
    }

    [HttpPut("items/{id:long}")]
    public async Task<IActionResult> Update(long id, ItemDto dto)
    {
        var it = await db.LandingItems.FindAsync(id) ?? throw new ApiException(404, "Öğe bulunamadı.");
        if (!string.IsNullOrWhiteSpace(dto.Title)) it.Title = dto.Title!.Trim();
        it.Description = dto.Description;
        it.Icon = dto.Icon;
        it.SortOrder = dto.SortOrder;
        it.IsActive = dto.IsActive;
        it.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { it.Id });
    }

    [HttpDelete("items/{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        var it = await db.LandingItems.FindAsync(id) ?? throw new ApiException(404, "Öğe bulunamadı.");
        db.LandingItems.Remove(it);
        await db.SaveChangesAsync();
        return Ok(new { message = "Silindi." });
    }
}
