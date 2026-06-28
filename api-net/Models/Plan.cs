namespace Liftonom.Api.Models;

public class Plan
{
    public long Id { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public decimal MonthlyPrice { get; set; }
    public int? MaxUsers { get; set; }
    public int? MaxElevators { get; set; }
    public int? SmsQuota { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
