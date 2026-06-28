using Liftonom.Api.Data;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

[ApiController]
[Route("api/v1/admin")]
public class AdminAuthController(AppDbContext db, TokenService tokens) : ControllerBase
{
    public record LoginDto(string Email, string Password);

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var admin = await db.PlatformAdmins.FirstOrDefaultAsync(a => a.Email == dto.Email && a.IsActive)
            ?? throw new ApiException(422, "E-posta veya şifre hatalı.");
        if (!BCrypt.Net.BCrypt.Verify(dto.Password, admin.Password))
            throw new ApiException(422, "E-posta veya şifre hatalı.");

        admin.LastLoginAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(new { token = tokens.CreateAdmin(admin), admin = new { admin.Id, admin.Name, admin.Email } });
    }

    [Authorize(Policy = "Admin")]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var aid = long.Parse(User.FindFirst("aid")!.Value);
        var admin = await db.PlatformAdmins.FindAsync(aid) ?? throw new ApiException(404, "Bulunamadı.");
        return Ok(new { admin.Id, admin.Name, admin.Email });
    }
}
