namespace LiftOtonom.Api.Models;

public class Quote
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long? CustomerId { get; set; }
    public string? QuoteNumber { get; set; }
    public string Status { get; set; } = "draft";
    public DateOnly? ValidUntil { get; set; }
    public string? Items { get; set; } = "[]";        // jsonb
    public decimal? Subtotal { get; set; }
    public decimal TaxRate { get; set; } = 20;
    public decimal? TaxAmount { get; set; }
    public decimal Discount { get; set; }
    public decimal? Total { get; set; }
    public string? Notes { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Customer? Customer { get; set; }
}

public class Contract
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long? CustomerId { get; set; }
    public string? ContractNumber { get; set; }
    public string? Type { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public decimal? MonthlyFee { get; set; }
    public bool AutoRenew { get; set; }
    public string Status { get; set; } = "active";
    public string? Elevators { get; set; } = "[]";    // jsonb
    public string? DocumentUrl { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Customer? Customer { get; set; }
}
