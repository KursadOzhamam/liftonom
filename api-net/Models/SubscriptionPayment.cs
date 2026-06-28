namespace Liftonom.Api.Models;

public class SubscriptionPayment
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long? SubscriptionId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "TRY";
    public string Status { get; set; } = "pending";   // success|failed|pending|refunded
    public string? IyzicoPaymentId { get; set; }
    public string? RawResponse { get; set; }            // jsonb
    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
