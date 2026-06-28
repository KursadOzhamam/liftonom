namespace LiftOtonom.Api.Models;

public class MaintenanceRecord
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long? ElevatorId { get; set; }
    public string? Type { get; set; }
    public string Status { get; set; } = "pending";
    public DateTime? PlannedDate { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? TechnicianNote { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Elevator? Elevator { get; set; }
}
