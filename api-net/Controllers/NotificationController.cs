using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/notifications")]
public class NotificationController(AppDbContext db) : ControllerBase
{
    public record NotificationDto(string Title, string? Body, string? Type, string? Link, long? UserId);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] bool mine = false,
        [FromQuery(Name = "per_page")] int perPage = 30, [FromQuery] int page = 1)
    {
        var q = db.Notifications.AsQueryable();
        if (mine) { var uid = long.Parse(User.FindFirst("uid")!.Value); q = q.Where(n => n.UserId == uid || n.UserId == null); }
        return Ok(await q.OrderByDescending(n => n.Id).ToPagedAsync(page, perPage));
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount([FromQuery] bool mine = false)
    {
        var q = db.Notifications.Where(n => !n.IsRead);
        if (mine) { var uid = long.Parse(User.FindFirst("uid")!.Value); q = q.Where(n => n.UserId == uid || n.UserId == null); }
        return Ok(new { count = await q.CountAsync() });
    }

    [HttpPost]
    public async Task<IActionResult> Store(NotificationDto dto)
    {
        var n = new Notification
        {
            TenantId = db.CurrentTenantId!.Value, UserId = dto.UserId, Title = dto.Title,
            Body = dto.Body, Type = dto.Type, Link = dto.Link, IsRead = false, CreatedAt = DateTime.UtcNow,
        };
        db.Notifications.Add(n);
        await db.SaveChangesAsync();
        return StatusCode(201, n);
    }

    [HttpPost("{id:long}/read")]
    public async Task<IActionResult> MarkRead(long id)
    {
        var n = await db.Notifications.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Bildirim bulunamadı.");
        n.IsRead = true;
        await db.SaveChangesAsync();
        return Ok(new { message = "Okundu." });
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        await db.Notifications.Where(n => !n.IsRead).ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
        return Ok(new { message = "Tümü okundu." });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var n = await db.Notifications.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Bildirim bulunamadı.");
        db.Notifications.Remove(n);
        await db.SaveChangesAsync();
        return Ok(new { message = "Silindi." });
    }
}
