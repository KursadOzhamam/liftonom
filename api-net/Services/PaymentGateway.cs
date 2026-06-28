namespace LiftOtonom.Api.Services;

public record PaymentResult(bool Success, string? PaymentId, string? Raw);

public interface IPaymentGateway
{
    Task<PaymentResult> ChargeAsync(decimal amount, string currency, string description);
}

/// <summary>Yerel/dev: gerçek tahsilat yapmaz, başarı döner. iyzico anahtarı yokken kullanılır.</summary>
public class MockPaymentGateway : IPaymentGateway
{
    public Task<PaymentResult> ChargeAsync(decimal amount, string currency, string description) =>
        Task.FromResult(new PaymentResult(true, "mock-" + Guid.NewGuid().ToString("N")[..10],
            "{\"status\":\"success\",\"gateway\":\"mock\"}"));
}

/// <summary>Prod stub: iyzico (config Iyzico:ApiKey/SecretKey/BaseUrl). Gerçek entegrasyon eklenecek.</summary>
public class IyzicoPaymentGateway(IConfiguration config, ILogger<IyzicoPaymentGateway> logger) : IPaymentGateway
{
    public Task<PaymentResult> ChargeAsync(decimal amount, string currency, string description)
    {
        // TODO: iyzipay-dotnet ile gerçek tahsilat. Şimdilik config var ama çağrı yapılmıyor.
        logger.LogInformation("[iyzico] charge {Amount} {Currency} — {Desc} (base={Base})",
            amount, currency, description, config["Iyzico:BaseUrl"]);
        return Task.FromResult(new PaymentResult(true, "iyzico-pending", "{\"status\":\"pending\"}"));
    }
}
