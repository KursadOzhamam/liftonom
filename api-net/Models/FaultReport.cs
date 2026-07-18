namespace Liftonom.Api.Models;

public class FaultReport
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long? ElevatorId { get; set; }
    public string ReportedByType { get; set; } = "user";
    public string? Title { get; set; }
    public string? Type { get; set; }
    public string? Code { get; set; }
    public string Priority { get; set; } = "normal";
    public string Status { get; set; } = "reported";
    public string? ContactName { get; set; }
    public string? ContactPhone { get; set; }
    public string? Description { get; set; }
    public string? Symptoms { get; set; }
    public string? WorkDone { get; set; }
    public bool UnderWarranty { get; set; }
    public bool Billable { get; set; } = true;
    public string? Notes { get; set; }
    public string? ResolutionNote { get; set; }
    public long? AssignedUserId { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public string? EstimatedRepair { get; set; }
    public DateTime? DispatchedAt { get; set; }
    public DateTime? DiagnosedAt { get; set; }

    // 6-aşamalı yaşam döngüsü zaman damgaları
    public DateTime? AcknowledgedAt { get; set; }
    public DateTime? InspectedAt { get; set; }
    public DateTime? RepairStartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    // Kontrol (inspection) formu
    public string? FaultDiagnosis { get; set; }
    public bool NeedsPart { get; set; }
    public string? PartDetails { get; set; }

    // Servis elemanı canlı konumu (web tarafı Google Map izleme için)
    public double? TechnicianLat { get; set; }
    public double? TechnicianLng { get; set; }
    public DateTime? LocationUpdatedAt { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Elevator? Elevator { get; set; }
    public User? AssignedUser { get; set; }
}
