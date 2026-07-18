using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Liftonom.Api.Models;

public class Elevator
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long? BuildingId { get; set; }
    public string? Code { get; set; }
    public string? Name { get; set; }
    public string? Type { get; set; }
    public string? Brand { get; set; }
    public string? Model { get; set; }
    public int? CapacityKg { get; set; }
    public int? CapacityPersons { get; set; }
    public int? StopCount { get; set; }
    public string? ServedFloors { get; set; }
    public decimal? SpeedMs { get; set; }
    public string? DoorType { get; set; }
    public string? SerialNumber { get; set; }
    public string? RegistrationNo { get; set; }
    public int? ManufactureYear { get; set; }
    public DateOnly? InstallationDate { get; set; }
    public string? TseCertificateNo { get; set; }
    public DateOnly? TseStartDate { get; set; }
    public DateOnly? TseEndDate { get; set; }
    public string? TseLabelColor { get; set; }
    public string? TseLabelNote { get; set; }
    public bool HasEmergencyPhone { get; set; }
    public bool HasUps { get; set; }
    public bool HasFireSystem { get; set; }
    public bool HasEarthquakeSensor { get; set; }
    public string Status { get; set; } = "active";
    public DateTime? LastMaintenanceAt { get; set; }
    public DateTime? NextMaintenanceAt { get; set; }
    public int MaintenancePeriod { get; set; } = 30;
    public string? QrToken { get; set; }
    public string? Notes { get; set; }
    public bool IsSample { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Building? Building { get; set; }

    [NotMapped]
    public string TseLabel
    {
        get
        {
            if (TseEndDate is null) return "gray";
            var days = TseEndDate.Value.DayNumber - DateOnly.FromDateTime(DateTime.UtcNow).DayNumber;
            if (days < 0) return "red";
            return days <= 30 ? "yellow" : "green";
        }
    }
}
