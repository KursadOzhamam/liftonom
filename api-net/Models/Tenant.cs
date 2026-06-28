namespace LiftOtonom.Api.Models;

public class Tenant
{
    public long Id { get; set; }
    public string Name { get; set; } = "";
    public string Slug { get; set; } = "";
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? TaxNumber { get; set; }
    public string? TaxOffice { get; set; }
    public string? LogoUrl { get; set; }
    public string Plan { get; set; } = "trial";
    public DateTime? PlanExpiresAt { get; set; }
    public int SmsBalance { get; set; } = 100;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public bool IsUsable() => IsActive && (PlanExpiresAt == null || PlanExpiresAt > DateTime.UtcNow);
}
