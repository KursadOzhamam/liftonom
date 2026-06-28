namespace LiftOtonom.Api.Models;

public class FaultReport
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long? ElevatorId { get; set; }
    public string ReportedByType { get; set; } = "user";
    public string Priority { get; set; } = "normal";
    public string Status { get; set; } = "new";
    public string? Description { get; set; }
    public string? ResolutionNote { get; set; }
    public long? AssignedUserId { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public string? EstimatedRepair { get; set; }
    public DateTime? DispatchedAt { get; set; }
    public DateTime? DiagnosedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Elevator? Elevator { get; set; }
    public User? AssignedUser { get; set; }
}
