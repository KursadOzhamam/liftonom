namespace Liftonom.Api.Models;

public class Cashbox
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public string Name { get; set; } = "";
    public string Type { get; set; } = "cash";
    public decimal Balance { get; set; }
    public string Currency { get; set; } = "TRY";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}

public class CashboxTransaction
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long CashboxId { get; set; }
    public string Type { get; set; } = "";
    public decimal Amount { get; set; }
    public decimal? BalanceAfter { get; set; }
    public string? Description { get; set; }
    public string? SourceType { get; set; }
    public long? SourceId { get; set; }
    public long? TransferToId { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CurrentAccount
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long CustomerId { get; set; }
    public decimal Balance { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}

public class Invoice
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long? CustomerId { get; set; }
    public string? InvoiceNumber { get; set; }
    public string Type { get; set; } = "e-archive";
    public string Status { get; set; } = "draft";
    public DateOnly? IssueDate { get; set; }
    public DateOnly? DueDate { get; set; }
    public string? Items { get; set; } = "[]";        // jsonb
    public decimal? Subtotal { get; set; }
    public decimal TaxRate { get; set; } = 20;
    public decimal? TaxAmount { get; set; }
    public decimal Discount { get; set; }
    public decimal? Total { get; set; }
    public decimal PaidAmount { get; set; }
    public string? Notes { get; set; }
    public string? SourceType { get; set; }
    public long? SourceId { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Customer? Customer { get; set; }
}
