namespace LiftOtonom.Api.Models;

public class Customer
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public string Type { get; set; } = "corporate";
    public string Name { get; set; } = "";
    public string? TaxNumber { get; set; }
    public string? TaxOffice { get; set; }
    public string? IdNumber { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? District { get; set; }
    public string? City { get; set; }
    public long? RegionId { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsSample { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public const string TypeIndividual = "individual";
    public const string TypeCorporate = "corporate";
}
