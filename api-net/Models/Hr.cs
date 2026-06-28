namespace Liftonom.Api.Models;

public class Attendance
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long UserId { get; set; }
    public DateOnly Date { get; set; }
    public string Type { get; set; } = "";
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public User? User { get; set; }
}

public class Payroll
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long UserId { get; set; }
    public string Period { get; set; } = "";
    public decimal? BaseSalary { get; set; }
    public decimal Bonus { get; set; }
    public decimal Deduction { get; set; }
    public decimal? NetPaid { get; set; }
    public DateTime? PaidAt { get; set; }
    public long? CashboxId { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public User? User { get; set; }
}
