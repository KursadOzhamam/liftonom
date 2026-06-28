namespace LiftOtonom.Api.Models;

public class OtpCode
{
    public long Id { get; set; }
    public long? TenantId { get; set; }
    public string Phone { get; set; } = "";
    public string Code { get; set; } = "";
    public string Purpose { get; set; } = "login";
    public short Attempts { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? ConsumedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
