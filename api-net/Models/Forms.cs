namespace LiftOtonom.Api.Models;

public class AtfForm
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long? CustomerId { get; set; }
    public long? BuildingId { get; set; }
    public string? FormData { get; set; } = "{}";       // jsonb
    public string Status { get; set; } = "draft";
    public string? Attachments { get; set; } = "[]";    // jsonb
    public long? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}

public class DtrReport
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long? ElevatorId { get; set; }
    public long? TechnicianId { get; set; }
    public string? ChecklistItems { get; set; } = "[]"; // jsonb
    public string? GeneralNote { get; set; }
    public string? Photos { get; set; } = "[]";          // jsonb
    public string? SignatureUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Elevator? Elevator { get; set; }
}

public class ElevatorOrder
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long? CustomerId { get; set; }
    public string? OrderNumber { get; set; }
    public string? ElevatorType { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal? Amount { get; set; }
    public string Status { get; set; } = "quote";
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Customer? Customer { get; set; }
}
