namespace Liftonom.Api.Models;

public class Product
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long? SupplierId { get; set; }
    public string? Code { get; set; }
    public string Name { get; set; } = "";
    public string? Category { get; set; }
    public string? Unit { get; set; }
    public decimal StockQuantity { get; set; }
    public decimal MinStock { get; set; }
    public decimal? UnitPrice { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Supplier? Supplier { get; set; }
}

public class StockMovement
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long ProductId { get; set; }
    public string Type { get; set; } = "";
    public decimal Quantity { get; set; }
    public decimal? UnitPrice { get; set; }
    public decimal? TotalPrice { get; set; }
    public string? ReferenceType { get; set; }
    public long? ReferenceId { get; set; }
    public string? Note { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class Supplier
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public string Name { get; set; } = "";
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? TaxNumber { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}

public class Project
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long? CustomerId { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string Status { get; set; } = "planning";
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public int Progress { get; set; }
    public string? AssignedUsers { get; set; } = "[]";  // jsonb
    public string? Tasks { get; set; } = "[]";           // jsonb
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Customer? Customer { get; set; }
}
