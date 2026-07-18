namespace Liftonom.Api.Models;

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
    public string? AssignedUsers { get; set; } = "[]";   // jsonb: [user_id]
    public string? Checklist { get; set; } = "[]";        // jsonb
    public string? MaterialsUsed { get; set; } = "[]";    // jsonb
    public string? TechnicianNote { get; set; }
    public bool IsCritical { get; set; }
    public string? Description { get; set; }
    public string? Notes { get; set; }
    public string? CustomerSignatureUrl { get; set; }
    public string? Photos { get; set; } = "[]";           // jsonb
    public bool IsRecurring { get; set; }
    public string? RecurringPeriod { get; set; }
    public long? ParentId { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Elevator? Elevator { get; set; }
}
