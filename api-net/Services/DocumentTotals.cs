namespace LiftOtonom.Api.Services;

public record LineItem(string? Description, decimal? Quantity, decimal? UnitPrice);

public static class DocumentTotals
{
    public record Totals(decimal Subtotal, decimal TaxRate, decimal TaxAmount, decimal Discount, decimal Total);

    public static Totals Compute(IEnumerable<LineItem>? items, decimal taxRate = 20, decimal discount = 0)
    {
        decimal subtotal = 0;
        if (items != null)
            foreach (var i in items)
                subtotal += (i.Quantity ?? 1) * (i.UnitPrice ?? 0);

        var taxAmount = Math.Round((subtotal - discount) * taxRate / 100, 2);
        var total = Math.Round(subtotal - discount + taxAmount, 2);
        return new Totals(Math.Round(subtotal, 2), taxRate, taxAmount, Math.Round(discount, 2), total);
    }
}
