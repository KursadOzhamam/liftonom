using LiftOtonom.Api.Data;
using LiftOtonom.Api.Models;
using LiftOtonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LiftOtonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/attendance")]
public class AttendanceController(AppDbContext db) : ControllerBase
{
    private static readonly string[] Types = ["present", "absent", "leave", "sick", "holiday"];
    public record AttendanceDto(long UserId, DateOnly Date, string Type, string? Note);

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery(Name = "user_id")] long? userId,
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to,
        [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var q = db.Attendances.AsQueryable();
        if (userId is { } u) q = q.Where(a => a.UserId == u);
        if (from is { } f) q = q.Where(a => a.Date >= f);
        if (to is { } t) q = q.Where(a => a.Date <= t);
        var projected = q.OrderByDescending(a => a.Date).Select(a => new
        {
            a.Id, a.UserId, a.Date, a.Type, a.Note,
            User = a.User == null ? null : new { a.User.Name, a.User.Surname },
        });
        return Ok(await projected.ToPagedAsync(page, perPage));
    }

    [HttpPost]
    public async Task<IActionResult> Store(AttendanceDto dto)
    {
        if (!Types.Contains(dto.Type)) throw new ApiException(422, "Geçersiz tip.");
        var now = DateTime.UtcNow;
        var a = new Attendance { TenantId = db.CurrentTenantId!.Value, UserId = dto.UserId, Date = dto.Date,
            Type = dto.Type, Note = dto.Note, CreatedAt = now, UpdatedAt = now };
        db.Attendances.Add(a);
        await db.SaveChangesAsync();
        return StatusCode(201, a);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var a = await db.Attendances.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Kayıt bulunamadı.");
        db.Attendances.Remove(a);
        await db.SaveChangesAsync();
        return Ok(new { message = "Kayıt silindi." });
    }
}
