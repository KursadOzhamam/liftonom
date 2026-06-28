using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

[ApiController]
[Authorize(Roles = "manager")]
[Route("api/v1/users")]
public class UserController(AppDbContext db, ISmsSender sms) : ControllerBase
{
    private static readonly string[] Roles = ["manager", "office", "technician", "accounting", "viewer"];

    public record CreateDto(string Name, string? Surname, string Phone, string? Email, string Role, long? RegionId, string? Password);
    public record UpdateDto(string? Name, string? Surname, string? Email, string? Role, long? RegionId, bool? IsActive, string? Password);

    private long TenantId => db.CurrentTenantId!.Value;

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string? search, [FromQuery] string? role,
        [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var q = db.Users.Where(u => u.TenantId == TenantId);
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(u => EF.Functions.ILike(u.Name, $"%{search}%") ||
                             EF.Functions.ILike(u.Surname ?? "", $"%{search}%") ||
                             EF.Functions.ILike(u.Phone, $"%{search}%"));
        if (!string.IsNullOrEmpty(role)) q = q.Where(u => u.Role == role);

        var projected = q.OrderBy(u => u.Name).Select(u => new
        {
            u.Id, u.Name, u.Surname, u.Phone, u.Email, u.Role, u.IsActive, u.LastLoginAt,
        });
        return Ok(await projected.ToPagedAsync(page, perPage));
    }

    [HttpPost]
    public async Task<IActionResult> Store(CreateDto dto)
    {
        if (!Roles.Contains(dto.Role)) throw new ApiException(422, "Geçersiz rol.");
        var phone = PhoneHelper.Normalize(dto.Phone);
        if (await db.Users.AnyAsync(u => u.TenantId == TenantId && u.Phone == phone))
            throw new ApiException(422, "Bu telefon firmada zaten kayıtlı.");

        var plain = string.IsNullOrEmpty(dto.Password) ? Guid.NewGuid().ToString("N")[..8] : dto.Password;
        var now = DateTime.UtcNow;
        var u = new User
        {
            TenantId = TenantId, Name = dto.Name, Surname = dto.Surname, Phone = phone, Email = dto.Email,
            Role = dto.Role, RegionId = dto.RegionId, Password = BCrypt.Net.BCrypt.HashPassword(plain),
            IsActive = true, CreatedAt = now, UpdatedAt = now,
        };
        db.Users.Add(u);
        await db.SaveChangesAsync();
        await sms.SendAsync(phone, $"Liftonom hesabınız oluşturuldu. Şifreniz: {plain}", "staff_invite");
        return StatusCode(201, new { u.Id, u.Name, u.Surname, u.Phone, u.Email, u.Role, u.IsActive });
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Show(long id) => Ok(await Find(id));

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, UpdateDto dto)
    {
        var u = await Find(id);
        if (!string.IsNullOrWhiteSpace(dto.Name)) u.Name = dto.Name;
        u.Surname = dto.Surname; u.Email = dto.Email;
        if (dto.Role != null && Roles.Contains(dto.Role)) u.Role = dto.Role;
        u.RegionId = dto.RegionId;
        if (dto.IsActive is { } a) u.IsActive = a;
        if (!string.IsNullOrEmpty(dto.Password)) u.Password = BCrypt.Net.BCrypt.HashPassword(dto.Password);
        u.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { u.Id, u.Name, u.Surname, u.Phone, u.Email, u.Role, u.IsActive });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var u = await Find(id);
        if (u.Id == long.Parse(User.FindFirst("uid")!.Value)) throw new ApiException(422, "Kendinizi silemezsiniz.");
        u.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Personel silindi." });
    }

    private async Task<User> Find(long id)
    {
        var u = await db.Users.FirstOrDefaultAsync(x => x.Id == id);
        if (u == null || u.TenantId != TenantId) throw new ApiException(404, "Personel bulunamadı.");
        return u;
    }
}
