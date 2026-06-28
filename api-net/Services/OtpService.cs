using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Services;

public class OtpService(AppDbContext db, ISmsSender sms, IConfiguration config)
{
    private int Length => config.GetValue("Otp:Length", 6);
    private int TtlMinutes => config.GetValue("Otp:TtlMinutes", 3);
    private int MaxAttempts => config.GetValue("Otp:MaxAttempts", 3);

    public async Task<string> GenerateAsync(string phone, long? tenantId, string purpose = "login")
    {
        // Bekleyen eski kodları tüket
        await db.OtpCodes
            .Where(o => o.Phone == phone && o.Purpose == purpose && o.ConsumedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.ConsumedAt, DateTime.UtcNow));

        var max = (int)Math.Pow(10, Length);
        var code = Random.Shared.Next(0, max).ToString().PadLeft(Length, '0');

        db.OtpCodes.Add(new OtpCode
        {
            TenantId = tenantId,
            Phone = phone,
            Code = code,
            Purpose = purpose,
            Attempts = 0,
            ExpiresAt = DateTime.UtcNow.AddMinutes(TtlMinutes),
        });
        await db.SaveChangesAsync();

        await sms.SendAsync(phone, $"Liftonom doğrulama kodunuz: {code}", "otp");
        return code;
    }

    public async Task<OtpCode> VerifyAsync(string phone, string code, string purpose = "login")
    {
        var otp = await db.OtpCodes
            .Where(o => o.Phone == phone && o.Purpose == purpose && o.ConsumedAt == null)
            .OrderByDescending(o => o.Id)
            .FirstOrDefaultAsync()
            ?? throw new ApiException(422, "Doğrulama kodu bulunamadı. Lütfen yeni kod isteyin.");

        if (otp.ExpiresAt < DateTime.UtcNow)
            throw new ApiException(422, "Doğrulama kodunun süresi doldu. Lütfen yeni kod isteyin.");

        if (otp.Attempts >= MaxAttempts)
            throw new ApiException(429, "Çok fazla hatalı deneme. Lütfen yeni kod isteyin.");

        if (otp.Code != code)
        {
            otp.Attempts++;
            await db.SaveChangesAsync();
            throw new ApiException(422, "Doğrulama kodu hatalı.");
        }

        otp.ConsumedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return otp;
    }
}
