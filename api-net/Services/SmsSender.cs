namespace LiftOtonom.Api.Services;

public interface ISmsSender
{
    Task<string?> SendAsync(string phone, string message, string? triggerType = null);
}

/// <summary>Yerel/geliştirme: gerçekten göndermez, log'a yazar (OTP terminalde görünür).</summary>
public class LogSmsSender(ILogger<LogSmsSender> logger) : ISmsSender
{
    public Task<string?> SendAsync(string phone, string message, string? triggerType = null)
    {
        logger.LogInformation("[SMS:log] -> {Phone}: {Message}", phone, message);
        return Task.FromResult<string?>("log-" + Guid.NewGuid().ToString("N")[..8]);
    }
}
