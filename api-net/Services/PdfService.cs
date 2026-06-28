using System.Text.Json;
using Liftonom.Api.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Liftonom.Api.Services;

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

                page.Footer().AlignCenter().Text("Liftonom ile oluşturulmuştur").FontSize(8).FontColor("#94A3B8");
            });
        });

        return document.GeneratePdf();
    }

    private record CheckItem(string Item, string Status, string? Note);

    private static List<CheckItem> ParseChecklist(string? json)
    {
        var list = new List<CheckItem>();
        if (string.IsNullOrWhiteSpace(json)) return list;
        try
        {
            using var doc = JsonDocument.Parse(json);
            foreach (var el in doc.RootElement.EnumerateArray())
                list.Add(new CheckItem(
                    el.TryGetProperty("item", out var i) ? i.GetString() ?? "" : "",
                    el.TryGetProperty("status", out var s) ? s.GetString() ?? "" : "",
                    el.TryGetProperty("note", out var n) ? n.GetString() : null));
        }
        catch { /* boş */ }
        return list;
    }

    /// <summary>Bakım/servis raporu PDF'i (imza alanlı).</summary>
    public byte[] GenerateMaintenanceReport(MaintenanceRecord m, Tenant tenant, string elevatorName,
        string? buildingName, string? checklistJson)
    {
        var checklist = ParseChecklist(checklistJson);
        var typeNames = new Dictionary<string, string>
        { ["periodic"] = "Periyodik", ["fault"] = "Arıza", ["revision"] = "Revizyon", ["annual"] = "Yıllık" };

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
                    });
                    row.ConstantItem(200).Column(c =>
                    {
                        c.Item().AlignRight().Text("BAKIM SERVİS FORMU").Bold().FontSize(16);
                        c.Item().AlignRight().Text($"#{m.Id}").FontSize(11).FontColor("#64748B");
                        c.Item().AlignRight().Text((m.CompletedAt ?? m.PlannedDate ?? DateTime.UtcNow).ToString("dd.MM.yyyy")).FontSize(9).FontColor("#64748B");
                    });
                });

                page.Content().PaddingVertical(20).Column(col =>
                {
                    col.Item().PaddingBottom(4).Row(r =>
                    {
                        r.RelativeItem().Text(t => { t.Span("Asansör: ").SemiBold(); t.Span(elevatorName); });
                        r.RelativeItem().Text(t => { t.Span("Bina: ").SemiBold(); t.Span(buildingName ?? "-"); });
                    });
                    col.Item().PaddingBottom(12).Row(r =>
                    {
                        r.RelativeItem().Text(t => { t.Span("Bakım Tipi: ").SemiBold(); t.Span(typeNames.GetValueOrDefault(m.Type ?? "", m.Type ?? "-")); });
                        r.RelativeItem().Text(t => { t.Span("Durum: ").SemiBold(); t.Span(m.Status == "completed" ? "Tamamlandı" : m.Status); });
                    });

                    if (checklist.Count > 0)
                    {
                        col.Item().PaddingBottom(6).Text("Kontrol Listesi").Bold().FontSize(12);
                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(cd => { cd.RelativeColumn(4); cd.RelativeColumn(2); cd.RelativeColumn(3); });
                            table.Header(h =>
                            {
                                void HC(string s) => h.Cell().Background("#F1F5F9").Padding(6).Text(s).SemiBold().FontSize(9);
                                HC("Madde"); HC("Durum"); HC("Not");
                            });
                            foreach (var it in checklist)
                            {
                                table.Cell().BorderBottom(0.5f).BorderColor("#E2E8F0").Padding(6).Text(it.Item);
                                table.Cell().BorderBottom(0.5f).BorderColor("#E2E8F0").Padding(6).Text(it.Status);
                                table.Cell().BorderBottom(0.5f).BorderColor("#E2E8F0").Padding(6).Text(it.Note ?? "-");
                            }
                        });
                    }

                    if (!string.IsNullOrEmpty(m.TechnicianNote))
                    {
                        col.Item().PaddingTop(12).Text("Teknisyen Notu").Bold().FontSize(12);
                        col.Item().PaddingTop(4).Text(m.TechnicianNote!);
                    }

                    // İmza alanları
                    col.Item().PaddingTop(40).Row(r =>
                    {
                        r.RelativeItem().Column(c =>
                        {
                            c.Item().BorderTop(1).BorderColor("#1E293B").PaddingTop(4).AlignCenter().Text("Teknisyen İmza").FontSize(9);
                        });
                        r.ConstantItem(40);
                        r.RelativeItem().Column(c =>
                        {
                            c.Item().BorderTop(1).BorderColor("#1E293B").PaddingTop(4).AlignCenter().Text("Müşteri / Yönetici İmza").FontSize(9);
                        });
                    });
                });

                page.Footer().AlignCenter().Text("Liftonom ile oluşturulmuştur").FontSize(8).FontColor("#94A3B8");
            });
        });

        return document.GeneratePdf();
    }
}
