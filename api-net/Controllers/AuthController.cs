using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController(
    AppDbContext db,
    OtpService otp,
    TokenService tokens,
    IConfiguration config,
    IHostEnvironment env) : ControllerBase
{
    public record LoginDto(string Phone, string Password, long? TenantId);
    public record VerifyDto(string Phone, string Code);
    public record PhoneDto(string Phone);

    private bool Debug => env.IsDevelopment();
    // SMS OTP kapatılabilir (Otp:Disabled=true) → login doğrudan token verir (SMS maliyeti yok).
    private bool OtpDisabled => config.GetValue<bool>("Otp:Disabled");

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var phone = PhoneHelper.Normalize(dto.Phone);

        var candidates = await db.Users
            .Include(u => u.Tenant)
            .Where(u => u.Phone == phone && u.IsActive)
            .ToListAsync();

        candidates = candidates.Where(u => BCrypt.Net.BCrypt.Verify(dto.Password, u.Password)).ToList();
        if (dto.TenantId is { } tid)
            candidates = candidates.Where(u => u.TenantId == tid).ToList();

        if (candidates.Count == 0)
            throw new ApiException(422, "Telefon veya şifre hatalı.");

        if (candidates.Count > 1)
        {
            return Conflict(new
            {
                requires_tenant = true,
                message = "Bu telefon birden çok firmada kayıtlı. Lütfen firma seçin.",
                tenants = candidates.Select(u => new { tenant_id = u.TenantId, name = u.Tenant!.Name }),
            });
        }

        var user = candidates[0];

        // OTP kapalıysa doğrudan token ver (verify-otp ile aynı yanıt biçimi) — SMS gerektirmez.
        if (OtpDisabled)
        {
            user.LastLoginAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Ok(new
            {
                token = tokens.Create(user),
                user = UserPayload(user),
                tenant = new { id = user.Tenant!.Id, name = user.Tenant.Name, slug = user.Tenant.Slug, plan = user.Tenant.Plan },
            });
        }

        var code = await otp.GenerateAsync(phone, user.TenantId, "login");

        return Ok(new
        {
            requires_otp = true,
            message = "Doğrulama kodu telefonunuza gönderildi.",
            phone,
            dev_code = Debug ? code : null,
        });
    }

    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp(VerifyDto dto)
    {
        var phone = PhoneHelper.Normalize(dto.Phone);
        var otpRow = await otp.VerifyAsync(phone, dto.Code, "login");

        var user = await db.Users
            .Include(u => u.Tenant)
            .FirstOrDefaultAsync(u => u.Phone == phone && u.TenantId == otpRow.TenantId && u.IsActive)
            ?? throw new ApiException(404, "Kullanıcı bulunamadı.");

        user.LastLoginAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(new
        {
            token = tokens.Create(user),
            user = UserPayload(user),
            tenant = new { id = user.Tenant!.Id, name = user.Tenant.Name, slug = user.Tenant.Slug, plan = user.Tenant.Plan },
        });
    }

    [HttpPost("resend-otp")]
    public async Task<IActionResult> ResendOtp(PhoneDto dto)
    {
        var phone = PhoneHelper.Normalize(dto.Phone);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Phone == phone && u.IsActive)
            ?? throw new ApiException(422, "Kullanıcı bulunamadı.");

        var code = await otp.GenerateAsync(phone, user.TenantId, "login");
        return Ok(new { message = "Yeni doğrulama kodu gönderildi.", dev_code = Debug ? code : null });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var uid = long.Parse(User.FindFirst("uid")!.Value);
        var user = await db.Users.FindAsync(uid) ?? throw new ApiException(404, "Kullanıcı bulunamadı.");
        return Ok(UserPayload(user));
    }

    public record ProfileDto(string? Name, string? Surname, string? Email);
    public record PasswordDto(string CurrentPassword, string NewPassword);
    public record LocationDto(double Lat, double Lng);
    public record DeviceTokenDto(string Token, string? Platform);

    /// <summary>FCM cihaz token'ı kaydet (push bildirimleri için).</summary>
    [Authorize]
    [HttpPost("device-token")]
    public async Task<IActionResult> RegisterDeviceToken(DeviceTokenDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Token)) throw new ApiException(422, "Token zorunludur.");
        var uid = long.Parse(User.FindFirst("uid")!.Value);
        var now = DateTime.UtcNow;
        var existing = await db.DeviceTokens.IgnoreQueryFilters().FirstOrDefaultAsync(d => d.Token == dto.Token);
        if (existing != null)
        {
            existing.UserId = uid; existing.TenantId = db.CurrentTenantId!.Value;
            existing.Platform = dto.Platform; existing.UpdatedAt = now;
        }
        else
        {
            db.DeviceTokens.Add(new Models.DeviceToken
            {
                TenantId = db.CurrentTenantId!.Value, UserId = uid, Token = dto.Token,
                Platform = dto.Platform, CreatedAt = now, UpdatedAt = now,
            });
        }
        await db.SaveChangesAsync();
        return Ok(new { message = "Cihaz kaydedildi." });
    }

    [Authorize]
    [HttpDelete("device-token")]
    public async Task<IActionResult> DeleteDeviceToken(DeviceTokenDto dto)
    {
        var rows = await db.DeviceTokens.IgnoreQueryFilters().Where(d => d.Token == dto.Token).ToListAsync();
        db.DeviceTokens.RemoveRange(rows);
        await db.SaveChangesAsync();
        return Ok(new { message = "Cihaz kaydı silindi." });
    }

    /// <summary>Kendi konumunu güncelle (saha personeli / mobil).</summary>
    [Authorize]
    [HttpPost("location")]
    public async Task<IActionResult> UpdateLocation(LocationDto dto)
    {
        var uid = long.Parse(User.FindFirst("uid")!.Value);
        var user = await db.Users.FindAsync(uid) ?? throw new ApiException(404, "Kullanıcı bulunamadı.");
        user.LastLat = dto.Lat; user.LastLng = dto.Lng; user.LocationUpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Konum güncellendi." });
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile(ProfileDto dto)
    {
        var uid = long.Parse(User.FindFirst("uid")!.Value);
        var user = await db.Users.FindAsync(uid) ?? throw new ApiException(404, "Kullanıcı bulunamadı.");
        if (!string.IsNullOrWhiteSpace(dto.Name)) user.Name = dto.Name;
        user.Surname = dto.Surname; user.Email = dto.Email;
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(UserPayload(user));
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(PasswordDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
            throw new ApiException(422, "Yeni şifre en az 6 karakter olmalıdır.");
        var uid = long.Parse(User.FindFirst("uid")!.Value);
        var user = await db.Users.FindAsync(uid) ?? throw new ApiException(404, "Kullanıcı bulunamadı.");
        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.Password))
            throw new ApiException(422, "Mevcut şifre hatalı.");
        user.Password = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Şifre güncellendi." });
    }

    [Authorize]
    [HttpPost("logout")]
    public IActionResult Logout() => Ok(new { message = "Çıkış yapıldı." });

    private static object UserPayload(User u) => new
    {
        id = u.Id,
        name = u.Name,
        surname = u.Surname,
        phone = u.Phone,
        email = u.Email,
        role = u.Role,
    };
}
