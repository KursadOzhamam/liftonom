namespace Liftonom.Api.Models;

public class AccountTransaction
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long AccountId { get; set; }
    public string Type { get; set; } = "";   // debit|credit
    public decimal Amount { get; set; }
    public decimal? BalanceAfter { get; set; }
    public string? Description { get; set; }
    public string? SourceType { get; set; }
    public long? SourceId { get; set; }
    public long? CashboxId { get; set; }
    public string? PaymentMethod { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}
