namespace LiftOtonom.Api.Models;

public class SmsLog
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public string Recipient { get; set; } = "";
    public string Message { get; set; } = "";
    public string? Status { get; set; }
    public string? ProviderId { get; set; }
    public string? TriggerType { get; set; }
    public int Cost { get; set; } = 1;
    public DateTime SentAt { get; set; }
}
