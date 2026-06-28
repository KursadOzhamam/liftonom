namespace LiftOtonom.Api.Models;

public class Building
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long? CustomerId { get; set; }
    public long? RegionId { get; set; }
    public string Name { get; set; } = "";
    public string? Address { get; set; }
    public string? District { get; set; }
    public string? City { get; set; }
    public int? FloorCount { get; set; }
    public string? ManagerName { get; set; }
    public string? ManagerPhone { get; set; }
    public string? Notes { get; set; }
    public bool IsSample { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Customer? Customer { get; set; }
}
