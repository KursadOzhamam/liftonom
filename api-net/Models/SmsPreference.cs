namespace Liftonom.Api.Models;

public class SmsPreference
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public bool MaintenanceReminder { get; set; } = true;
    public bool MaintenanceCompleted { get; set; } = true;
    public bool NewFault { get; set; } = true;
    public bool FaultResolved { get; set; } = true;
    public bool InvoiceCreated { get; set; }
    public bool PaymentReceived { get; set; } = true;
    public bool TseExpiry { get; set; } = true;
    public int ReminderDaysBefore { get; set; } = 3;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
