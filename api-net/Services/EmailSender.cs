using System.Net;
using System.Net.Mail;

namespace Liftonom.Api.Services;

public record EmailAttachment(string FileName, byte[] Data, string ContentType);
public record EmailResult(bool Sent, string? Error);

public interface IEmailSender
{
    Task<EmailResult> SendAsync(string to, string subject, string htmlBody, EmailAttachment? attachment = null);
}

/// <summary>
/// SMTP tabanlı e-posta gönderici. Config (Smtp:Host) yoksa <b>gerçekten göndermez</b>, log'a yazar
/// ve <c>Sent=false</c> döner — çağıran taraf kullanıcıyı "SMTP yapılandırılmamış" diye bilgilendirir.
/// Config anahtarları: Smtp:Host, Smtp:Port (587), Smtp:User, Smtp:Password, Smtp:From, Smtp:FromName, Smtp:Ssl (true).
/// </summary>
public class SmtpEmailSender(IConfiguration config, ILogger<SmtpEmailSender> logger) : IEmailSender
{
    public async Task<EmailResult> SendAsync(string to, string subject, string htmlBody, EmailAttachment? attachment = null)
    {
        var host = config["Smtp:Host"];
        if (string.IsNullOrWhiteSpace(host))
        {
            logger.LogInformation("[Email:log] SMTP yapılandırılmamış — gönderilmedi. To={To} Subject={Subject}", to, subject);
            return new EmailResult(false, "SMTP yapılandırılmamış (Ayarlar → sunucu Smtp:* config).");
        }
        try
        {
            var port = int.TryParse(config["Smtp:Port"], out var p) ? p : 587;
            var from = config["Smtp:From"] ?? config["Smtp:User"] ?? "no-reply@liftonom.com";
            var fromName = config["Smtp:FromName"] ?? "Liftonom";
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
                EnableSsl = !bool.TryParse(config["Smtp:Ssl"], out var ssl) || ssl,
                Credentials = new NetworkCredential(config["Smtp:User"], config["Smtp:Password"]),
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
}
