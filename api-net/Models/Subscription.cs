namespace LiftOtonom.Api.Models;

public class Subscription
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long? PlanId { get; set; }
    public string Status { get; set; } = "trialing";
    public DateTime? StartedAt { get; set; }
    public DateTime? CurrentPeriodEnd { get; set; }
    public bool CancelAtPeriodEnd { get; set; }
    public string? IyzicoSubscriptionRef { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
