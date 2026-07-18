namespace Liftonom.Api.Models;

public class Building
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long? CustomerId { get; set; }
    public long? RegionId { get; set; }
    public string Name { get; set; } = "";
    public string? Type { get; set; }
    public string? Address { get; set; }
    public string? District { get; set; }
    public string? City { get; set; }
    public string? PostalCode { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public int? FloorCount { get; set; }
    public int? UnitCount { get; set; }
    public int? BuiltYear { get; set; }
    public string? ManagerName { get; set; }
    public string? ManagerPhone { get; set; }
    public string? ManagerEmail { get; set; }
    public long? DefaultTechnicianUserId { get; set; }
    public bool IsActive { get; set; } = true;
    public string? DoorCode { get; set; }      // teknisyene özel — gizli
    public string? AccessNote { get; set; }    // teknisyene özel — gizli
    public string? Notes { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public bool IsSample { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Customer? Customer { get; set; }
}
