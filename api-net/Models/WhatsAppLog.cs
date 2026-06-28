namespace Liftonom.Api.Models;

public class WhatsAppLog
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public string Recipient { get; set; } = "";
    public string Message { get; set; } = "";
    public string? TriggerType { get; set; }
    public string? Status { get; set; }
    public long? FaultReportId { get; set; }
    public string? ProviderId { get; set; }
    public DateTime CreatedAt { get; set; }
}
