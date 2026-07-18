namespace Liftonom.Api.Models;

public class Region
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public string Name { get; set; } = "";
    public string? Code { get; set; }
    public string? Description { get; set; }
    public long? ResponsibleUserId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class WorkOrder
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long? ElevatorId { get; set; }
    public string? SourceType { get; set; }
    public long? SourceId { get; set; }
    public long? AssignedUserId { get; set; }
    public DateTime? PlannedDate { get; set; }
    public string Status { get; set; } = "open";
    public string? Description { get; set; }
    public DateTime? CompletedAt { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Elevator? Elevator { get; set; }
    public User? AssignedUser { get; set; }
}
