namespace Liftonom.Api.Models;

/// <summary>Ürün/stok kategorisi (tenant'a özel).</summary>
public class ProductCategory
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public string Name { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}
