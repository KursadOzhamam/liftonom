using System.Net;
using System.Net.Mail;
using Liftonom.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Services;

public record EmailAttachment(string FileName, byte[] Data, string ContentType);
public record EmailResult(bool Sent, string? Error);

public interface IEmailSender
{
    Task<EmailResult> SendAsync(string to, string subject, string htmlBody, EmailAttachment? attachment = null);
}

/// <summary>
/// SMTP tabanlı e-posta gönderici. Yapılandırma önce <b>Süper Admin → Global Ayarlar</b>
/// (platform_settings.smtp_*), yoksa config <c>Smtp:*</c> anahtarlarından okunur. Host yoksa
/// <b>gerçekten göndermez</b>, log'a yazar ve <c>Sent=false</c> döner.
/// </summary>
public class SmtpEmailSender(AppDbContext db, IConfiguration config, ILogger<SmtpEmailSender> logger) : IEmailSender
{
    public async Task<EmailResult> SendAsync(string to, string subject, string htmlBody, EmailAttachment? attachment = null)
    {
        var s = await db.PlatformSettings.FirstOrDefaultAsync();
        var host = FirstNonEmpty(s?.SmtpHost, config["Smtp:Host"]);
        if (string.IsNullOrWhiteSpace(host))
        {
            logger.LogInformation("[Email:log] SMTP yapılandırılmamış — gönderilmedi. To={To} Subject={Subject}", to, subject);
            return new EmailResult(false, "SMTP yapılandırılmamış (Süper Admin → Global Ayarlar → SMTP).");
        }
        try
        {
            var port = s?.SmtpPort ?? (int.TryParse(config["Smtp:Port"], out var p) ? p : 587);
            var user = FirstNonEmpty(s?.SmtpUser, config["Smtp:User"]);
            var pass = FirstNonEmpty(s?.SmtpPassword, config["Smtp:Password"]);
            var from = FirstNonEmpty(s?.SmtpFrom, config["Smtp:From"], user, "no-reply@liftonom.com")!;
            var fromName = FirstNonEmpty(s?.SmtpFromName, config["Smtp:FromName"], "Liftonom")!;
            var ssl = s?.SmtpSsl ?? (!bool.TryParse(config["Smtp:Ssl"], out var cs) || cs);
            using var msg = new MailMessage
            {
                From = new MailAddress(from, fromName),
                Subject = subject, Body = htmlBody, IsBodyHtml = true,
            };
            msg.To.Add(to);
            if (attachment != null)
                msg.Attachments.Add(new Attachment(new MemoryStream(attachment.Data), attachment.FileName, attachment.ContentType));

            using var client = new SmtpClient(host, port)
            {
                EnableSsl = ssl,
                Credentials = new NetworkCredential(user, pass),
            };
            await client.SendMailAsync(msg);
            logger.LogInformation("[Email] gönderildi -> {To}", to);
            return new EmailResult(true, null);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[Email] gönderilemedi -> {To}", to);
            return new EmailResult(false, ex.Message);
        }
    }

    private static string? FirstNonEmpty(params string?[] vals)
    {
        foreach (var v in vals) if (!string.IsNullOrWhiteSpace(v)) return v;
        return null;
    }
}
