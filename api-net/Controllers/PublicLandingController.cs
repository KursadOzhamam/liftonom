using Liftonom.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

/// <summary>Herkese açık landing (tanıtım) içeriği + planlar.</summary>
[ApiController]
[AllowAnonymous]
[Route("api/v1/public")]
public class PublicLandingController(AppDbContext db) : ControllerBase
{
    [HttpGet("landing")]
    public async Task<IActionResult> Landing()
    {
        var s = await db.LandingSettings.FirstOrDefaultAsync();
        var items = await db.LandingItems.Where(i => i.IsActive)
            .OrderBy(i => i.SortOrder).ThenBy(i => i.Id)
            .Select(i => new { i.Id, i.Section, i.Title, i.Description, i.Icon })
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
            features = items.Where(i => i.Section == "feature"),
            modules = items.Where(i => i.Section == "module"),
            steps = items.Where(i => i.Section == "step"),
            compare_old = items.Where(i => i.Section == "compare_old"),
            compare_new = items.Where(i => i.Section == "compare_new"),
        });
    }

    [HttpGet("plans")]
    public async Task<IActionResult> Plans()
    {
        var plans = await db.Plans.Where(p => p.IsActive)
            .OrderBy(p => p.MonthlyPrice)
            .Select(p => new { p.Id, p.Code, p.Name, p.MonthlyPrice, p.MaxUsers, p.MaxElevators })
            .ToListAsync();
        return Ok(plans);
    }
}
