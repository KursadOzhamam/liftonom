using System.Text.Json;
using LiftOtonom.Api.Data;
using LiftOtonom.Api.Models;

namespace LiftOtonom.Api.Services;

public interface IWhatsAppSender
{
    Task SendAsync(long tenantId, string phone, string message, string? triggerType = null, long? faultReportId = null);
}

/// <summary>Yerel/dev: gerçekten göndermez, log'a yazar ve whatsapp_logs'a kaydeder.</summary>
public class LogWhatsAppSender(ILogger<LogWhatsAppSender> logger, AppDbContext db) : IWhatsAppSender
{
    public async Task SendAsync(long tenantId, string phone, string message, string? triggerType = null, long? faultReportId = null)
    {
        logger.LogInformation("[WhatsApp:log] -> {Phone}: {Message}", phone, message);
        db.WhatsAppLogs.Add(new WhatsAppLog
        {
            TenantId = tenantId, Recipient = phone, Message = message, TriggerType = triggerType,
            Status = "logged", FaultReportId = faultReportId, ProviderId = "log-" + Guid.NewGuid().ToString("N")[..8],
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }
}

/// <summary>Prod: WhatsApp Cloud API (Meta). Config: WhatsApp:PhoneNumberId, WhatsApp:Token.</summary>
public class MetaWhatsAppSender(ILogger<MetaWhatsAppSender> logger, AppDbContext db, IConfiguration config, IHttpClientFactory http) : IWhatsAppSender
{
    public async Task SendAsync(long tenantId, string phone, string message, string? triggerType = null, long? faultReportId = null)
    {
        var phoneNumberId = config["WhatsApp:PhoneNumberId"];
        var token = config["WhatsApp:Token"];
        var status = "failed";
        string? providerId = null;

        try
        {
            var client = http.CreateClient();
            client.DefaultRequestHeaders.Authorization = new("Bearer", token);
            // E.164, başında + olmadan (Meta formatı)
            var to = phone.TrimStart('+');
            var payload = new
            {
                messaging_product = "whatsapp",
                to,
                type = "text",
                text = new { body = message },
            };
            var res = await client.PostAsJsonAsync(
                $"https://graph.facebook.com/v21.0/{phoneNumberId}/messages", payload);
            if (res.IsSuccessStatusCode)
            {
                status = "sent";
                var body = await res.Content.ReadAsStringAsync();
                using var json = JsonDocument.Parse(body);
                providerId = json.RootElement.TryGetProperty("messages", out var m) && m.GetArrayLength() > 0
                    ? m[0].GetProperty("id").GetString() : null;
            }
            else
            {
                logger.LogWarning("[WhatsApp:meta] başarısız: {Status}", res.StatusCode);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[WhatsApp:meta] hata");
        }

        db.WhatsAppLogs.Add(new WhatsAppLog
        {
            TenantId = tenantId, Recipient = phone, Message = message, TriggerType = triggerType,
            Status = status, FaultReportId = faultReportId, ProviderId = providerId, CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }
}
