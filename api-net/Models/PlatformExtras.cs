namespace Liftonom.Api.Models;

/// <summary>Süper Admin: platform ile firma (tenant) arasındaki abonelik sözleşmesi.</summary>
public class SubscriptionContract
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public string Title { get; set; } = "";
    public string? Plan { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "TRY";
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string Status { get; set; } = "active"; // active | expired | cancelled
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Tenant? Tenant { get; set; }
}

/// <summary>Platform geneli ayarlar (tek satır).</summary>
public class PlatformSetting
{
    public long Id { get; set; }
    public string? PlatformName { get; set; }
    public string? SupportEmail { get; set; }
    public string? DefaultPlan { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
