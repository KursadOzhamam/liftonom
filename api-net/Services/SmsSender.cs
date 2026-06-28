using LiftOtonom.Api.Data;
using LiftOtonom.Api.Models;

namespace LiftOtonom.Api.Services;

public interface ISmsSender
{
    Task<string?> SendAsync(string phone, string message, string? triggerType = null);
}

/// <summary>Yerel/geliştirme: gerçekten göndermez, log'a yazar (OTP terminalde görünür) ve
/// tenant bağlamı varsa sms_logs tablosuna kaydeder.</summary>
public class LogSmsSender(ILogger<LogSmsSender> logger, AppDbContext db, ITenantContext tenant) : ISmsSender
{
    public async Task<string?> SendAsync(string phone, string message, string? triggerType = null)
    {
        logger.LogInformation("[SMS:log] -> {Phone}: {Message}", phone, message);
        var providerId = "log-" + Guid.NewGuid().ToString("N")[..8];

        if (tenant.TenantId is { } tid)
        {
            db.SmsLogs.Add(new SmsLog
            {
                TenantId = tid, Recipient = phone, Message = message, Status = "logged",
                TriggerType = triggerType, Cost = 0, SentAt = DateTime.UtcNow,
            });
            await db.SaveChangesAsync();
        }

        return providerId;
    }
}
