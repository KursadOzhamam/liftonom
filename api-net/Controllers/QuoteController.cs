using System.Text.Json;
using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/quotes")]
public class QuoteController(AppDbContext db, PdfService pdf, IEmailSender email, IConfiguration config) : ControllerBase
{
    private static readonly JsonSerializerOptions J = new(JsonSerializerDefaults.Web);
    // Kalemler DB'de snake_case saklanır (description/quantity/unit_price) — PdfService & Render böyle okur.
    private static readonly JsonSerializerOptions SnakeJson = new() { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

    public record QuoteDto(long? CustomerId, long? ElevatorId, long? TemplateId, string? Type, string? Title,
        string? CustomerName, string? ContactName, string? Email, string? Phone, string? Address, string? Currency,
        DateOnly? ValidUntil, DateOnly? IssueDate, List<LineItem>? Items, decimal? TaxRate, decimal? Discount,
        decimal? LaborTotal, decimal? MaterialTotal, bool? PriceVisible, string? Terms, string? Notes,
        string? InternalNotes, string? QuoteNumber);
    public record TemplateDto(string Name, string? Kind, string? Type, bool? IsDefault, bool? IsActive,
        JsonElement? Clauses, JsonElement? Variables);
    public record SendDto(bool? SendEmail, string? Signature);

    // ───────────────────────────── Teklifler ─────────────────────────────

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string? status, [FromQuery] string? type,
        [FromQuery] string? search, [FromQuery] string? sort, [FromQuery(Name = "customer_id")] long? customerId,
        [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var q = db.Quotes.AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(x => x.Status == status);
        if (!string.IsNullOrEmpty(type)) q = q.Where(x => x.Type == type);
        if (customerId is { } cid) q = q.Where(x => x.CustomerId == cid);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(x => (x.QuoteNumber != null && EF.Functions.ILike(x.QuoteNumber, $"%{s}%"))
                || (x.CustomerName != null && EF.Functions.ILike(x.CustomerName, $"%{s}%"))
                || (x.Customer != null && EF.Functions.ILike(x.Customer.Name, $"%{s}%"))
                || (x.Title != null && EF.Functions.ILike(x.Title, $"%{s}%")));
        }
        q = sort switch
        {
            "valid_asc" => q.OrderBy(x => x.ValidUntil),
            "amount_desc" => q.OrderByDescending(x => x.Total),
            "amount_asc" => q.OrderBy(x => x.Total),
            _ => q.OrderByDescending(x => x.Id),
        };
        var projected = q.Select(x => new
        {
            x.Id, x.QuoteNumber, x.Type, x.Status, x.Total, x.Subtotal, x.Currency, x.ValidUntil, x.CreatedAt, x.Title,
            CustomerName = x.CustomerName ?? (x.Customer == null ? null : x.Customer.Name),
            ElevatorName = x.Elevator == null ? null : x.Elevator.Name,
            TemplateName = x.Template == null ? null : x.Template.Name,
        });
        return Ok(await projected.ToPagedAsync(page, perPage));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Show(long id)
    {
        var qte = await db.Quotes.Include(x => x.Customer).Include(x => x.Template)
            .Include(x => x.Elevator!).ThenInclude(e => e.Building!).ThenInclude(b => b.Customer)
            .FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Teklif bulunamadı.");
        return Ok(await Render(qte));
    }

    [HttpPost]
    public async Task<IActionResult> Store(QuoteDto dto)
    {
        var now = DateTime.UtcNow;
        var isRev = dto.Type == "revision";
        var q = new Quote
        {
            TenantId = db.CurrentTenantId!.Value, CustomerId = dto.CustomerId, ElevatorId = dto.ElevatorId,
            TemplateId = dto.TemplateId, Status = "draft", Type = dto.Type ?? "standard", Title = dto.Title,
            CustomerName = dto.CustomerName, ContactName = dto.ContactName, Email = dto.Email, Phone = dto.Phone,
            Address = dto.Address, Currency = dto.Currency ?? "TRY", ValidUntil = dto.ValidUntil,
            PriceVisible = dto.PriceVisible ?? true, InternalNotes = dto.InternalNotes,
            Terms = dto.Terms, Notes = dto.Notes, PublicToken = Guid.NewGuid().ToString("N"),
            CreatedBy = long.Parse(User.FindFirst("uid")!.Value),
            CreatedAt = dto.IssueDate?.ToDateTime(TimeOnly.MinValue).ToUniversalTime() ?? now, UpdatedAt = now,
        };
        if (isRev)
        {
            q.LaborTotal = dto.LaborTotal ?? 0; q.MaterialTotal = dto.MaterialTotal ?? 0;
            q.Subtotal = q.LaborTotal + q.MaterialTotal; q.TaxRate = 0; q.TaxAmount = 0; q.Discount = 0;
            q.Total = q.Subtotal; q.Items = "[]";
        }
        else
        {
            var t = DocumentTotals.Compute(dto.Items, dto.TaxRate ?? 0, dto.Discount ?? 0);
            q.Items = JsonSerializer.Serialize(dto.Items ?? [], SnakeJson);
            q.Subtotal = t.Subtotal; q.TaxRate = t.TaxRate; q.TaxAmount = t.TaxAmount; q.Discount = t.Discount; q.Total = t.Total;
        }
        db.Quotes.Add(q);
        await db.SaveChangesAsync();
        q.QuoteNumber = string.IsNullOrWhiteSpace(dto.QuoteNumber)
            ? $"{(isRev ? "RT" : "TKL")}-{now:yyyyMMdd}-{q.Id:D4}" : dto.QuoteNumber!.Trim();
        await db.SaveChangesAsync();
        return StatusCode(201, new { q.Id });
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, QuoteDto dto)
    {
        var q = await db.Quotes.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Teklif bulunamadı.");
        q.CustomerId = dto.CustomerId; q.ElevatorId = dto.ElevatorId; q.TemplateId = dto.TemplateId; q.Title = dto.Title;
        q.CustomerName = dto.CustomerName; q.ContactName = dto.ContactName; q.Email = dto.Email; q.Phone = dto.Phone;
        q.Address = dto.Address;
        if (dto.Currency != null) q.Currency = dto.Currency;
        q.ValidUntil = dto.ValidUntil;
        if (dto.IssueDate is { } isd) q.CreatedAt = isd.ToDateTime(TimeOnly.MinValue).ToUniversalTime();
        if (dto.PriceVisible is { } pv) q.PriceVisible = pv;
        if (q.Type == "revision")
        {
            q.LaborTotal = dto.LaborTotal ?? q.LaborTotal ?? 0; q.MaterialTotal = dto.MaterialTotal ?? q.MaterialTotal ?? 0;
            q.Subtotal = q.LaborTotal + q.MaterialTotal; q.TaxRate = 0; q.TaxAmount = 0; q.Discount = 0; q.Total = q.Subtotal;
        }
        else if (dto.Items != null)
        {
            var t = DocumentTotals.Compute(dto.Items, dto.TaxRate ?? 0, dto.Discount ?? q.Discount);
            q.Items = JsonSerializer.Serialize(dto.Items, SnakeJson);
            q.Subtotal = t.Subtotal; q.TaxRate = t.TaxRate; q.TaxAmount = t.TaxAmount; q.Discount = t.Discount; q.Total = t.Total;
        }
        q.Terms = dto.Terms; q.Notes = dto.Notes; q.InternalNotes = dto.InternalNotes; q.UpdatedAt = DateTime.UtcNow;
        if (string.IsNullOrWhiteSpace(q.QuoteNumber) && !string.IsNullOrWhiteSpace(dto.QuoteNumber))
            q.QuoteNumber = dto.QuoteNumber!.Trim();
        await db.SaveChangesAsync();
        return Ok(new { q.Id });
    }

    // Firma kaşe/imza kaydet (göndermeden)
    [HttpPost("{id:long}/signature")]
    public async Task<IActionResult> Signature(long id, SendDto dto)
    {
        var q = await db.Quotes.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Teklif bulunamadı.");
        q.CompanySignature = dto.Signature; q.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "İmza kaydedildi." });
    }

    [HttpPost("{id:long}/approve")] public Task<IActionResult> Approve(long id) => SetStatus(id, "approved");
    [HttpPost("{id:long}/reject")] public Task<IActionResult> Reject(long id) => SetStatus(id, "rejected");

    private async Task<IActionResult> SetStatus(long id, string status)
    {
        var q = await db.Quotes.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Teklif bulunamadı.");
        q.Status = status; q.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(q);
    }

    // Gönder → status=sent; send_email=true ise müşteriye şablonlu + PDF ekli mail.
    [HttpPost("{id:long}/send")]
    public async Task<IActionResult> Send(long id, SendDto dto)
    {
        var q = await db.Quotes.Include(x => x.Customer).Include(x => x.Template)
            .Include(x => x.Elevator!).ThenInclude(e => e.Building!).ThenInclude(b => b.Customer)
            .FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Teklif bulunamadı.");
        if (!string.IsNullOrWhiteSpace(dto.Signature)) q.CompanySignature = dto.Signature;
        q.Status = "sent"; q.SentAt = DateTime.UtcNow; q.UpdatedAt = DateTime.UtcNow;
        if (string.IsNullOrEmpty(q.PublicToken)) q.PublicToken = Guid.NewGuid().ToString("N");
        await db.SaveChangesAsync();

        bool emailSent = false; string? emailError = null; string? recipient = null;
        if (dto.SendEmail == true)
        {
            recipient = !string.IsNullOrWhiteSpace(q.Email) ? q.Email : q.Customer?.Email ?? q.Elevator?.Building?.Customer?.Email;
            if (string.IsNullOrWhiteSpace(recipient))
                throw new ApiException(422, "Müşterinin e-posta adresi yok. Teklif veya müşteri kaydına e-posta ekleyin.");
            var tenant = await db.Tenants.IgnoreQueryFilters().FirstAsync(t => t.Id == q.TenantId);
            var (subject, body) = BuildEmail(q, tenant);
            byte[]? bytes = null;
            try { bytes = MakePdf(q, tenant); } catch { /* eksiz gönder */ }
            var att = bytes != null ? new EmailAttachment($"{q.QuoteNumber ?? q.Id.ToString()}.pdf", bytes, "application/pdf") : null;
            var res = await email.SendAsync(recipient!, subject, body, att);
            emailSent = res.Sent; emailError = res.Error;
        }
        return Ok(new { q.PublicToken, q.Status, email_sent = emailSent, email_error = emailError, recipient });
    }

    private byte[] MakePdf(Quote q, Tenant tenant)
    {
        var name = q.CustomerName ?? q.Customer?.Name ?? q.Elevator?.Building?.Customer?.Name ?? "-";
        return q.Type == "revision"
            ? pdf.GenerateRevisionQuote(q, tenant, name, q.Elevator?.Name, q.Elevator?.Building?.Name, RenderClauses(q, tenant))
            : pdf.GenerateQuote(q, tenant, name, RenderClauses(q, tenant));
    }

    [HttpGet("{id:long}/pdf")]
    public async Task<IActionResult> Pdf(long id)
    {
        var q = await db.Quotes.Include(x => x.Customer).Include(x => x.Template)
            .Include(x => x.Elevator!).ThenInclude(e => e.Building!).ThenInclude(b => b.Customer)
            .FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Teklif bulunamadı.");
        var tenant = await db.Tenants.IgnoreQueryFilters().FirstAsync(t => t.Id == q.TenantId);
        var bytes = MakePdf(q, tenant);
        return File(bytes, "application/pdf", $"{q.QuoteNumber ?? $"teklif-{q.Id}"}.pdf");
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var q = await db.Quotes.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Teklif bulunamadı.");
        q.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Teklif silindi." });
    }

    // ───────────────────────────── Şablonlar ─────────────────────────────

    [HttpGet("templates")]
    public async Task<IActionResult> Templates([FromQuery] string? search, [FromQuery] string? sort, [FromQuery] string? kind)
    {
        var k = kind == "revision" ? "revision" : "standard";
        await EnsureDefaultTemplate();
        var qy = db.QuoteTemplates.Where(t => t.Kind == k);
        if (!string.IsNullOrWhiteSpace(search)) qy = qy.Where(t => EF.Functions.ILike(t.Name, $"%{search.Trim()}%"));
        qy = sort == "za" ? qy.OrderByDescending(t => t.Name) : qy.OrderBy(t => t.Name);
        var rows = await qy.Select(t => new { t.Id, t.Name, t.Type, t.IsDefault, t.IsActive, t.Clauses }).ToListAsync();
        var data = rows.Select(t => new { t.Id, t.Name, t.Type, t.IsDefault, t.IsActive, ClauseCount = CountClauses(t.Clauses) });
        return Ok(new { data });
    }

    [HttpGet("templates/{id:long}")]
    public async Task<IActionResult> TemplateShow(long id) =>
        Ok(await db.QuoteTemplates.FirstOrDefaultAsync(t => t.Id == id) ?? throw new ApiException(404, "Şablon bulunamadı."));

    [HttpPost("templates")]
    public async Task<IActionResult> TemplateStore(TemplateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) throw new ApiException(422, "Şablon adı zorunludur.");
        var now = DateTime.UtcNow;
        var kind = dto.Kind == "revision" ? "revision" : "standard";
        var t = new QuoteTemplate
        {
            TenantId = db.CurrentTenantId!.Value, Name = dto.Name.Trim(), Kind = kind,
            Type = dto.Type ?? (kind == "revision" ? "Revizyon Teklifi" : "Teklif"),
            IsDefault = dto.IsDefault ?? false, IsActive = dto.IsActive ?? true,
            Clauses = dto.Clauses?.GetRawText() ?? "[]", Variables = dto.Variables?.GetRawText() ?? "[]",
            CreatedAt = now, UpdatedAt = now,
        };
        db.QuoteTemplates.Add(t);
        await db.SaveChangesAsync();
        if (t.IsDefault) { await ClearDefaults(t.Id, t.Kind); await db.SaveChangesAsync(); }
        return StatusCode(201, new { t.Id });
    }

    [HttpPut("templates/{id:long}")]
    public async Task<IActionResult> TemplateUpdate(long id, TemplateDto dto)
    {
        var t = await db.QuoteTemplates.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Şablon bulunamadı.");
        if (!string.IsNullOrWhiteSpace(dto.Name)) t.Name = dto.Name.Trim();
        if (dto.Type != null) t.Type = dto.Type;
        if (dto.IsDefault is { } d) t.IsDefault = d;
        if (dto.IsActive is { } a) t.IsActive = a;
        if (dto.Clauses is { } cl) t.Clauses = cl.GetRawText();
        if (dto.Variables is { } v) t.Variables = v.GetRawText();
        t.UpdatedAt = DateTime.UtcNow;
        if (t.IsDefault) await ClearDefaults(t.Id, t.Kind);
        await db.SaveChangesAsync();
        return Ok(new { t.Id });
    }

    [HttpDelete("templates/{id:long}")]
    public async Task<IActionResult> TemplateDestroy(long id)
    {
        var t = await db.QuoteTemplates.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Şablon bulunamadı.");
        t.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Şablon silindi." });
    }

    // ───────────────────────────── Yardımcılar ─────────────────────────────

    private async Task ClearDefaults(long keepId, string kind)
    {
        var others = await db.QuoteTemplates.Where(t => t.Id != keepId && t.IsDefault && t.Kind == kind).ToListAsync();
        foreach (var o in others) o.IsDefault = false;
    }

    private static int CountClauses(string clausesJson)
    {
        try { return JsonSerializer.Deserialize<List<JsonElement>>(clausesJson, J)?.Count ?? 0; }
        catch { return 0; }
    }

    private static Dictionary<string, string> BuildVars(Quote q, Tenant? tenant) => new()
    {
        ["firma_adi"] = tenant?.Name ?? "-",
        ["firma_vkn"] = tenant?.TaxNumber ?? "-",
        ["firma_adres"] = tenant?.Address ?? "-",
        ["firma_telefon"] = tenant?.Phone ?? "-",
        ["musteri_adi"] = q.CustomerName ?? q.Customer?.Name ?? q.Elevator?.Building?.Customer?.Name ?? "-",
        ["teklif_no"] = q.QuoteNumber ?? q.Id.ToString(),
        ["teklif_basligi"] = q.Title ?? "asansör bakım/revizyon",
        ["teklif_tarihi"] = q.CreatedAt.ToString("dd.MM.yyyy"),
        ["belge_tarihi"] = q.CreatedAt.ToString("dd.MM.yyyy"),
        ["gecerlilik"] = q.ValidUntil?.ToString("dd.MM.yyyy") ?? "-",
        ["tutar"] = q.Total is { } tot ? $"{tot:N2} {q.Currency}" : "-",
        ["asansor_no"] = q.Elevator?.Name ?? q.Elevator?.Code ?? "-",
        ["iscilik"] = q.LaborTotal is { } l ? $"{l:N2} {q.Currency}" : "-",
        ["malzeme"] = q.MaterialTotal is { } m ? $"{m:N2} {q.Currency}" : "-",
    };

    private static List<(string Title, string Body)> RenderClauses(Quote q, Tenant? tenant)
    {
        var vars = BuildVars(q, tenant);
        var list = new List<(string, string)>();
        if (q.Template != null)
            foreach (var el in ParseClauses(q.Template.Clauses))
            {
                if (el.active == false) continue;
                list.Add((Fill(el.title, vars), Fill(el.body, vars)));
            }
        return list;
    }

    private (string Subject, string Body) BuildEmail(Quote q, Tenant tenant)
    {
        var webBase = (config["Web:PublicUrl"] ?? "https://liftonom.rslabsdev.site").TrimEnd('/');
        var vars = BuildVars(q, tenant);
        vars["link"] = $"{webBase}/{(q.Type == "revision" ? "revizyon-teklifi" : "quote")}/{q.PublicToken}";
        var subjectTpl = "{{firma_adi}} — {{teklif_no}} numaralı teklifiniz";
        var body = Fill(DefaultEmailBody, vars).Replace("\n", "<br>");
        return (Fill(subjectTpl, vars), body);
    }

    private const string DefaultEmailBody =
        "Sayın {{musteri_adi}},\n\n" +
        "{{firma_adi}} tarafından hazırlanan {{teklif_no}} numaralı teklifimiz ekte PDF olarak yer almaktadır.\n\n" +
        "Teklifi çevrim içi görüntülemek için:\n{{link}}\n\n" +
        "Teklif tutarı: {{tutar}} · Geçerlilik: {{gecerlilik}}\n\n" +
        "Saygılarımızla,\n{{firma_adi}}\n{{firma_telefon}}";

    private async Task<object> Render(Quote q)
    {
        var tenant = await db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == q.TenantId);
        var rendered = RenderClauses(q, tenant).Select(x => new { title = x.Title, body = x.Body }).ToList();
        return new
        {
            q.Id, q.QuoteNumber, q.Type, q.Status, q.Title, q.CustomerId, q.ElevatorId, q.TemplateId, q.CustomerName,
            q.ContactName, q.Email, q.Phone, q.Address,
            q.Currency, q.ValidUntil, q.CreatedAt, q.Subtotal, q.TaxRate, q.TaxAmount, q.Discount, q.Total, q.Terms,
            q.Notes, q.InternalNotes, q.PublicToken, q.LaborTotal, q.MaterialTotal, q.PriceVisible,
            q.CompanySignature, q.CustomerSignature,
            Customer = q.Customer == null ? null : new { q.Customer.Name, q.Customer.Phone, q.Customer.Email },
            Elevator = q.Elevator == null ? null : new
            {
                q.Elevator.Name, q.Elevator.Code,
                Building = q.Elevator.Building == null ? null : new { q.Elevator.Building.Name, q.Elevator.Building.Address,
                    CustomerName = q.Elevator.Building.Customer == null ? null : q.Elevator.Building.Customer.Name },
            },
            Company = new { tenant?.Name, tenant?.Phone, tenant?.Email, tenant?.Address, tenant?.TaxNumber },
            Items = ParseItems(q.Items), RenderedClauses = rendered,
        };
    }

    private static List<object> ParseItems(string? json)
    {
        List<object> items = [];
        try
        {
            using var doc = JsonDocument.Parse(json ?? "[]");
            foreach (var el in doc.RootElement.EnumerateArray())
            {
                string desc = el.TryGetProperty("description", out var d) ? d.GetString() ?? "" : "";
                decimal qty = el.TryGetProperty("quantity", out var qv) && qv.TryGetDecimal(out var qd) ? qd : 1;
                decimal up = el.TryGetProperty("unit_price", out var pv) && pv.TryGetDecimal(out var pd) ? pd : 0;
                items.Add(new { description = desc, quantity = qty, unit_price = up, total = qty * up });
            }
        }
        catch { /* boş */ }
        return items;
    }

    private record ClauseEl(string title, string body, bool? active);
    private static IEnumerable<ClauseEl> ParseClauses(string json)
    {
        try { return JsonSerializer.Deserialize<List<ClauseEl>>(json, J) ?? []; }
        catch { return []; }
    }
    private static string Fill(string s, Dictionary<string, string> vars)
    {
        if (string.IsNullOrEmpty(s)) return s;
        foreach (var (k, v) in vars) s = s.Replace("{{" + k + "}}", v);
        return s;
    }

    private async Task EnsureDefaultTemplate()
    {
        var now = DateTime.UtcNow;
        var tid = db.CurrentTenantId!.Value;
        bool changed = false;
        if (!await db.QuoteTemplates.AnyAsync(t => t.Kind == "standard"))
        {
            db.QuoteTemplates.Add(new QuoteTemplate
            {
                TenantId = tid, Name = "Standart Teklif", Kind = "standard", Type = "Teklif",
                IsDefault = true, IsActive = true, CreatedAt = now, UpdatedAt = now,
                Clauses = JsonSerializer.Serialize(DefaultClauses, J), Variables = "[]",
            });
            changed = true;
        }
        if (!await db.QuoteTemplates.AnyAsync(t => t.Kind == "revision"))
        {
            db.QuoteTemplates.Add(new QuoteTemplate
            {
                TenantId = tid, Name = "Standart Revizyon Teklifi", Kind = "revision", Type = "Revizyon Teklifi",
                IsDefault = true, IsActive = true, CreatedAt = now, UpdatedAt = now,
                Clauses = JsonSerializer.Serialize(RevisionClauses, J), Variables = "[]",
            });
            changed = true;
        }
        if (changed) await db.SaveChangesAsync();
    }

    private static readonly object[] DefaultClauses =
    [
        new { title = "1. Teklif Kapsamı", active = true, body = "İşbu teklif, {{musteri_adi}} için {{teklif_basligi}} kapsamında yukarıda kalemler halinde belirtilen ürün/hizmetleri içerir. Kapsam dışı talepler ayrıca fiyatlandırılır." },
        new { title = "2. Geçerlilik Süresi", active = true, body = "Bu teklif {{teklif_tarihi}} tarihinde düzenlenmiş olup {{gecerlilik}} tarihine kadar geçerlidir. Bu tarihten sonra fiyatlar yeniden değerlendirilir." },
        new { title = "3. Fiyat ve Ödeme Koşulları", active = true, body = "Toplam teklif bedeli {{tutar}}'dir. Fiyatlara montaj/işçilik aksi belirtilmedikçe dahildir. Ödeme planı taraflarca yazılı olarak mutabık kalınarak belirlenir." },
        new { title = "4. Vergiler", active = true, body = "Belirtilen tutarlar yürürlükteki KDV ve diğer yasal vergiler dahil/hariç olarak teklifte açıkça gösterilir." },
        new { title = "5. Teslim ve Montaj Süresi", active = true, body = "İş, sözleşme/sipariş onayı ve avans tahsilatını takiben karşılıklı belirlenen sürede tamamlanır. Mücbir sebep halleri süreyi etkileyebilir." },
        new { title = "6. Garanti", active = true, body = "Sağlanan ürün ve hizmetler, ilgili mevzuat ve üretici koşulları çerçevesinde garanti kapsamındadır. Kullanım hatası ve harici müdahaleler garanti dışıdır." },
        new { title = "7. Standart ve Mevzuat Uygunluğu", active = true, body = "Yapılacak işler TS EN 81-20/50 ve Asansör İşletme, Bakım ve Periyodik Kontrol Yönetmeliği'ne uygun olarak gerçekleştirilir." },
        new { title = "Ek Şartlar", active = false, body = "" },
    ];

    private static readonly object[] RevisionClauses =
    [
        new { title = "1. Revizyon Kapsamı", active = true, body = "İşbu teklif, {{asansor_no}} asansörü için yapılacak revizyon/yenileme işlerini kapsar. Yukarıda belirtilen işçilik ve malzeme kalemleri dışındaki talepler ayrıca fiyatlandırılır." },
        new { title = "2. Fiyat ve Ödeme Koşulları", active = true, body = "İşçilik: {{iscilik}}, Malzeme: {{malzeme}}, Genel Toplam: {{tutar}}'dir. Ödeme planı taraflarca yazılı olarak mutabık kalınarak belirlenir." },
        new { title = "3. Geçerlilik Süresi", active = true, body = "Bu teklif {{belge_tarihi}} tarihinde düzenlenmiş olup {{gecerlilik}} tarihine kadar geçerlidir." },
        new { title = "4. Garanti", active = true, body = "Değiştirilen parçalar ve yapılan işçilik, ilgili mevzuat ve üretici koşulları çerçevesinde garanti kapsamındadır. Kullanım hatası ve harici müdahaleler garanti dışıdır." },
        new { title = "5. Standart ve Mevzuat Uygunluğu", active = true, body = "Revizyon işleri TS EN 81-20/50 ve Asansör İşletme, Bakım ve Periyodik Kontrol Yönetmeliği'ne uygun olarak gerçekleştirilir." },
        new { title = "Ek Şartlar", active = false, body = "" },
    ];
}

// ───────────────────────────── Public (müşteri linki) ─────────────────────────────

[ApiController]
[AllowAnonymous]
[Route("api/v1/public/quotes")]
public class PublicQuoteController(AppDbContext db) : ControllerBase
{
    private static readonly JsonSerializerOptions J = new(JsonSerializerDefaults.Web);

    [HttpGet("{token}")]
    public async Task<IActionResult> Show(string token)
    {
        var q = await db.Quotes.IgnoreQueryFilters().Include(x => x.Customer).Include(x => x.Template)
            .Include(x => x.Elevator!).ThenInclude(e => e.Building!).ThenInclude(b => b.Customer)
            .FirstOrDefaultAsync(x => x.PublicToken == token && x.DeletedAt == null)
            ?? throw new ApiException(404, "Teklif bulunamadı.");
        var tenant = await db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == q.TenantId);
        var vars = BuildVars(q, tenant);
        var rendered = new List<object>();
        if (q.Template != null)
            foreach (var el in ParseClauses(q.Template.Clauses))
            {
                if (el.active == false) continue;
                rendered.Add(new { title = Fill(el.title, vars), body = Fill(el.body, vars) });
            }
        List<object> items = [];
        try
        {
            using var doc = JsonDocument.Parse(q.Items ?? "[]");
            foreach (var el in doc.RootElement.EnumerateArray())
            {
                string desc = el.TryGetProperty("description", out var d) ? d.GetString() ?? "" : "";
                decimal qty = el.TryGetProperty("quantity", out var qv) && qv.TryGetDecimal(out var qd) ? qd : 1;
                decimal up = el.TryGetProperty("unit_price", out var pv) && pv.TryGetDecimal(out var pd) ? pd : 0;
                items.Add(new { description = desc, quantity = qty, unit_price = up, total = qty * up });
            }
        }
        catch { }
        var priceOn = q.PriceVisible;
        return Ok(new
        {
            q.QuoteNumber, q.Type, q.Status, q.Title, q.Currency, q.ValidUntil, q.CreatedAt, q.Terms, q.PriceVisible,
            Subtotal = priceOn ? q.Subtotal : null, Discount = priceOn ? q.Discount : (decimal?)null,
            Total = priceOn ? q.Total : null,
            LaborTotal = priceOn ? q.LaborTotal : null, MaterialTotal = priceOn ? q.MaterialTotal : null,
            q.CompanySignature, q.CustomerSignature,
            CustomerName = q.CustomerName ?? q.Customer?.Name ?? q.Elevator?.Building?.Customer?.Name,
            Elevator = q.Elevator == null ? null : new { q.Elevator.Name,
                Building = q.Elevator.Building == null ? null : new { q.Elevator.Building.Name, q.Elevator.Building.Address } },
            Company = new { tenant?.Name, tenant?.Phone, tenant?.Email, tenant?.Address },
            Items = priceOn ? items : [], RenderedClauses = rendered,
        });
    }

    public record ApproveDto(string? Signature);

    [HttpPost("{token}/approve")]
    public async Task<IActionResult> Approve(string token, ApproveDto dto)
    {
        var q = await db.Quotes.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.PublicToken == token && x.DeletedAt == null)
            ?? throw new ApiException(404, "Teklif bulunamadı.");
        if (!string.IsNullOrWhiteSpace(dto.Signature)) q.CustomerSignature = dto.Signature;
        q.Status = "approved"; q.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Teklif onaylandı." });
    }

    private static Dictionary<string, string> BuildVars(Quote q, Tenant? t) => new()
    {
        ["firma_adi"] = t?.Name ?? "-", ["firma_vkn"] = t?.TaxNumber ?? "-",
        ["firma_adres"] = t?.Address ?? "-", ["firma_telefon"] = t?.Phone ?? "-",
        ["musteri_adi"] = q.CustomerName ?? q.Customer?.Name ?? q.Elevator?.Building?.Customer?.Name ?? "-",
        ["teklif_no"] = q.QuoteNumber ?? q.Id.ToString(),
        ["teklif_basligi"] = q.Title ?? "asansör bakım/revizyon",
        ["teklif_tarihi"] = q.CreatedAt.ToString("dd.MM.yyyy"),
        ["belge_tarihi"] = q.CreatedAt.ToString("dd.MM.yyyy"),
        ["gecerlilik"] = q.ValidUntil?.ToString("dd.MM.yyyy") ?? "-",
        ["tutar"] = q.Total is { } tot ? $"{tot:N2} {q.Currency}" : "-",
        ["asansor_no"] = q.Elevator?.Name ?? q.Elevator?.Code ?? "-",
        ["iscilik"] = q.LaborTotal is { } l ? $"{l:N2} {q.Currency}" : "-",
        ["malzeme"] = q.MaterialTotal is { } m ? $"{m:N2} {q.Currency}" : "-",
    };
    private record ClauseEl(string title, string body, bool? active);
    private static IEnumerable<ClauseEl> ParseClauses(string json)
    {
        try { return JsonSerializer.Deserialize<List<ClauseEl>>(json, J) ?? []; }
        catch { return []; }
    }
    private static string Fill(string s, Dictionary<string, string> vars)
    {
        if (string.IsNullOrEmpty(s)) return s;
        foreach (var (k, v) in vars) s = s.Replace("{{" + k + "}}", v);
        return s;
    }
}
