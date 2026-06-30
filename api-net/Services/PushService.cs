using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Google.Apis.Auth.OAuth2;
using Liftonom.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Services;

/// <summary>
/// Firebase Cloud Messaging (HTTP v1) ile gerçek push gönderimi.
/// Service account JSON yapılandırılmamışsa sessizce devre dışı kalır
/// (bildirimler yine oluşturulur, mobil yoklama yedeği çalışır).
/// </summary>
public class PushService(AppDbContext db, IConfiguration config, IHttpClientFactory httpFactory, ILogger<PushService> log)
{
    private const string Scope = "https://www.googleapis.com/auth/firebase.messaging";
    private string? SaPath => config["Fcm:ServiceAccountPath"];
    private string? ProjectId => config["Fcm:ProjectId"];

    public bool Enabled => !string.IsNullOrEmpty(SaPath) && File.Exists(SaPath) && !string.IsNullOrEmpty(ProjectId);

    /// <summary>Kullanıcının tüm cihazlarına push gönderir. Hata fırlatmaz.</summary>
    public async Task SendToUserAsync(long userId, string title, string body, Dictionary<string, string>? data = null)
    {
        if (!Enabled) return;
        try
        {
            var tokens = await db.DeviceTokens.IgnoreQueryFilters()
                .Where(t => t.UserId == userId).Select(t => t.Token).ToListAsync();
            if (tokens.Count == 0) return;

            var accessToken = await GetAccessTokenAsync();
            var client = httpFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            var url = $"https://fcm.googleapis.com/v1/projects/{ProjectId}/messages:send";

            foreach (var token in tokens)
            {
                var message = new
                {
                    message = new
                    {
                        token,
                        notification = new { title, body },
                        data = data ?? new Dictionary<string, string>(),
                        android = new { priority = "high" },
                        apns = new { payload = new { aps = new { sound = "default" } } },
                    },
                };
                var content = new StringContent(JsonSerializer.Serialize(message), Encoding.UTF8, "application/json");
                var res = await client.PostAsync(url, content);
                if (!res.IsSuccessStatusCode)
                {
                    var status = (int)res.StatusCode;
                    // Geçersiz/silinmiş token → temizle
                    if (status is 404 or 400)
                    {
                        var dead = await db.DeviceTokens.IgnoreQueryFilters().Where(t => t.Token == token).ToListAsync();
                        db.DeviceTokens.RemoveRange(dead);
                        await db.SaveChangesAsync();
                    }
                    log.LogWarning("FCM push başarısız ({Status}) token={Token}", status, token[..Math.Min(12, token.Length)]);
                }
            }
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "FCM push gönderilemedi (uid={UserId})", userId);
        }
    }

    private async Task<string> GetAccessTokenAsync()
    {
        var credential = GoogleCredential.FromFile(SaPath!).CreateScoped(Scope);
        return await credential.UnderlyingCredential.GetAccessTokenForRequestAsync();
    }
}
