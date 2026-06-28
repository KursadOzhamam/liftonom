using System.Text.Json;
using LiftOtonom.Api.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace LiftOtonom.Api.Services;

public class PdfService
{
    private record Item(string Description, decimal Quantity, decimal UnitPrice)
    {
        public decimal Total => Quantity * UnitPrice;
    }

    private static List<Item> ParseItems(string? json)
    {
        var items = new List<Item>();
        if (string.IsNullOrWhiteSpace(json)) return items;
        try
        {
            using var doc = JsonDocument.Parse(json);
            foreach (var el in doc.RootElement.EnumerateArray())
            {
                items.Add(new Item(
                    el.TryGetProperty("description", out var d) ? d.GetString() ?? "" : "",
                    el.TryGetProperty("quantity", out var q) && q.TryGetDecimal(out var qv) ? qv : 1,
                    el.TryGetProperty("unit_price", out var p) && p.TryGetDecimal(out var pv) ? pv : 0));
            }
        }
        catch { /* boş bırak */ }
        return items;
    }

    private static string Money(decimal n) => n.ToString("#,##0.00") + " ₺";

    /// <summary>Fatura/teklif gibi finansal belge PDF'i üretir.</summary>
    public byte[] Generate(string docTitle, string number, Tenant tenant, string customerName,
        string? itemsJson, decimal subtotal, decimal taxRate, decimal taxAmount, decimal discount, decimal total,
        DateOnly? date)
    {
        var items = ParseItems(itemsJson);

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(40);
                page.DefaultTextStyle(x => x.FontSize(10).FontColor("#1E293B"));

                page.Header().Row(row =>
                {
                    row.RelativeItem().Column(c =>
                    {
                        c.Item().Text(tenant.Name).Bold().FontSize(16).FontColor("#2563EB");
                        if (!string.IsNullOrEmpty(tenant.Phone)) c.Item().Text(tenant.Phone).FontSize(9).FontColor("#64748B");
                        if (!string.IsNullOrEmpty(tenant.Email)) c.Item().Text(tenant.Email!).FontSize(9).FontColor("#64748B");
                        if (!string.IsNullOrEmpty(tenant.TaxNumber)) c.Item().Text($"VKN: {tenant.TaxNumber}").FontSize(9).FontColor("#64748B");
                    });
                    row.ConstantItem(180).Column(c =>
                    {
                        c.Item().AlignRight().Text(docTitle).Bold().FontSize(18);
                        c.Item().AlignRight().Text(number).FontSize(11).FontColor("#64748B");
                        c.Item().AlignRight().Text((date ?? DateOnly.FromDateTime(DateTime.UtcNow)).ToString("dd.MM.yyyy")).FontSize(9).FontColor("#64748B");
                    });
                });

                page.Content().PaddingVertical(20).Column(col =>
                {
                    col.Item().PaddingBottom(10).Text(t => { t.Span("Müşteri: ").SemiBold(); t.Span(customerName); });

                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(cd =>
                        {
                            cd.RelativeColumn(4);
                            cd.RelativeColumn(1);
                            cd.RelativeColumn(2);
                            cd.RelativeColumn(2);
                        });
                        table.Header(h =>
                        {
                            void HC(string s) => h.Cell().Background("#F1F5F9").Padding(6).Text(s).SemiBold().FontSize(9);
                            HC("Açıklama"); HC("Miktar"); HC("Birim Fiyat"); HC("Tutar");
                        });
                        foreach (var it in items)
                        {
                            table.Cell().BorderBottom(0.5f).BorderColor("#E2E8F0").Padding(6).Text(it.Description);
                            table.Cell().BorderBottom(0.5f).BorderColor("#E2E8F0").Padding(6).Text(it.Quantity.ToString("#,##0.##"));
                            table.Cell().BorderBottom(0.5f).BorderColor("#E2E8F0").Padding(6).Text(Money(it.UnitPrice));
                            table.Cell().BorderBottom(0.5f).BorderColor("#E2E8F0").Padding(6).AlignRight().Text(Money(it.Total));
                        }
                    });

                    col.Item().AlignRight().PaddingTop(15).Width(220).Column(t =>
                    {
                        void Line(string label, string val, bool bold = false)
                        {
                            t.Item().Row(r =>
                            {
                                r.RelativeItem().Text(label).FontSize(bold ? 12 : 10).SemiBold();
                                r.ConstantItem(110).AlignRight().Text(val).FontSize(bold ? 12 : 10).Bold();
                            });
                        }
                        Line("Ara Toplam", Money(subtotal));
                        if (discount > 0) Line("İndirim", "-" + Money(discount));
                        Line($"KDV (%{taxRate:#,##0.##})", Money(taxAmount));
                        t.Item().PaddingTop(4).BorderTop(1).BorderColor("#2563EB").PaddingTop(4);
                        Line("GENEL TOPLAM", Money(total), true);
                    });
                });

                page.Footer().AlignCenter().Text("LiftOtonom ile oluşturulmuştur").FontSize(8).FontColor("#94A3B8");
            });
        });

        return document.GeneratePdf();
    }
}
