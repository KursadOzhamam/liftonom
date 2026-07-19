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
[Route("api/v1/contracts")]
public class ContractController(AppDbContext db) : ControllerBase
{
    private static readonly JsonSerializerOptions J = new(JsonSerializerDefaults.Web);

    public record ContractDto(long? CustomerId, long? BuildingId, long? TemplateId, string? Type,
        DateOnly? StartDate, DateOnly? EndDate, decimal? MonthlyFee, string? Currency, string? Period,
        int? AnnualVisits, int? RenewalNoticeDays, bool? AutoRenew, string? Status, string? CustomerName,
        string? RepName, string? Phone, string? Email, string? Terms, string? Notes, string? ContractNumber);
    public record RenewDto(int? Months);
    public record TemplateDto(string Name, string? Type, bool? IsDefault, bool? IsActive,
        JsonElement? Clauses, JsonElement? Variables);
    public record SignDto(string? Signature);

    // ───────────────────────────── Sözleşmeler ─────────────────────────────

    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] string? status, [FromQuery(Name = "document_status")] string? docStatus,
        [FromQuery] string? search, [FromQuery] string? sort, [FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1)
    {
        var q = db.Contracts.AsQueryable();
        if (!string.IsNullOrEmpty(status)) q = q.Where(c => c.Status == status);
        if (!string.IsNullOrEmpty(docStatus)) q = q.Where(c => c.DocumentStatus == docStatus);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(c => (c.ContractNumber != null && EF.Functions.ILike(c.ContractNumber, $"%{s}%"))
                || (c.CustomerName != null && EF.Functions.ILike(c.CustomerName, $"%{s}%"))
                || (c.Customer != null && EF.Functions.ILike(c.Customer.Name, $"%{s}%"))
                || (c.Type != null && EF.Functions.ILike(c.Type, $"%{s}%")));
        }
        q = sort switch
        {
            "end_asc" => q.OrderBy(c => c.EndDate),
            "amount_desc" => q.OrderByDescending(c => c.MonthlyFee),
            "amount_asc" => q.OrderBy(c => c.MonthlyFee),
            _ => q.OrderByDescending(c => c.Id),
        };
        var projected = q.Select(c => new
        {
            c.Id, c.ContractNumber, c.Type, c.StartDate, c.EndDate, c.MonthlyFee, c.Currency,
            c.Status, c.DocumentStatus,
            CustomerName = c.CustomerName ?? (c.Customer == null ? null : c.Customer.Name),
            TemplateName = c.Template == null ? null : c.Template.Name,
        });
        return Ok(await projected.ToPagedAsync(page, perPage));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Show(long id)
    {
        var c = await db.Contracts.Include(x => x.Customer).Include(x => x.Building).Include(x => x.Template)
            .FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Sözleşme bulunamadı.");
        return Ok(await Render(c));
    }

    [HttpPost]
    public async Task<IActionResult> Store(ContractDto dto)
    {
        var now = DateTime.UtcNow;
        var c = new Contract
        {
            TenantId = db.CurrentTenantId!.Value, CustomerId = dto.CustomerId, BuildingId = dto.BuildingId,
            TemplateId = dto.TemplateId, Type = dto.Type, StartDate = dto.StartDate, EndDate = dto.EndDate,
            MonthlyFee = dto.MonthlyFee, Currency = dto.Currency ?? "TRY", Period = dto.Period,
            AnnualVisits = dto.AnnualVisits, RenewalNoticeDays = dto.RenewalNoticeDays ?? 30,
            AutoRenew = dto.AutoRenew ?? false, Status = dto.Status ?? "draft", DocumentStatus = "draft",
            CustomerName = dto.CustomerName, RepName = dto.RepName, Phone = dto.Phone, Email = dto.Email,
            Terms = dto.Terms, Notes = dto.Notes, PublicToken = Guid.NewGuid().ToString("N"),
            CreatedAt = now, UpdatedAt = now,
        };
        db.Contracts.Add(c);
        await db.SaveChangesAsync();
        c.ContractNumber = string.IsNullOrWhiteSpace(dto.ContractNumber)
            ? $"SOZ-{now:yyyyMMdd}-{c.Id:D4}" : dto.ContractNumber!.Trim();
        await db.SaveChangesAsync();
        return StatusCode(201, new { c.Id });
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, ContractDto dto)
    {
        var c = await db.Contracts.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Sözleşme bulunamadı.");
        c.CustomerId = dto.CustomerId; c.BuildingId = dto.BuildingId; c.TemplateId = dto.TemplateId;
        c.Type = dto.Type; c.StartDate = dto.StartDate; c.EndDate = dto.EndDate; c.MonthlyFee = dto.MonthlyFee;
        if (dto.Currency != null) c.Currency = dto.Currency;
        c.Period = dto.Period; c.AnnualVisits = dto.AnnualVisits;
        if (dto.RenewalNoticeDays is { } rn) c.RenewalNoticeDays = rn;
        if (dto.AutoRenew is { } ar) c.AutoRenew = ar;
        if (dto.Status != null) c.Status = dto.Status;
        c.CustomerName = dto.CustomerName; c.RepName = dto.RepName; c.Phone = dto.Phone; c.Email = dto.Email;
        c.Terms = dto.Terms; c.Notes = dto.Notes; c.UpdatedAt = DateTime.UtcNow;
        if (string.IsNullOrWhiteSpace(c.ContractNumber) && !string.IsNullOrWhiteSpace(dto.ContractNumber))
            c.ContractNumber = dto.ContractNumber!.Trim();
        await db.SaveChangesAsync();
        return Ok(new { c.Id });
    }

    [HttpPost("{id:long}/renew")]
    public async Task<IActionResult> Renew(long id, RenewDto dto)
    {
        var c = await db.Contracts.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Sözleşme bulunamadı.");
        var months = dto.Months ?? 12;
        var baseDate = c.EndDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        c.StartDate = baseDate;
        c.EndDate = baseDate.AddMonths(months);
        c.Status = "active"; c.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(c);
    }

    // Firma imzasını bu sözleşmeye kaydet ve/veya müşteriye gönder (belge durumu → sent)
    [HttpPost("{id:long}/send")]
    public async Task<IActionResult> Send(long id, SignDto dto)
    {
        var c = await db.Contracts.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Sözleşme bulunamadı.");
        if (!string.IsNullOrWhiteSpace(dto.Signature)) c.CompanySignature = dto.Signature;
        c.DocumentStatus = "sent"; c.SentAt = DateTime.UtcNow; c.UpdatedAt = DateTime.UtcNow;
        if (string.IsNullOrEmpty(c.PublicToken)) c.PublicToken = Guid.NewGuid().ToString("N");
        await db.SaveChangesAsync();
        return Ok(new { c.PublicToken, c.DocumentStatus });
    }

    // Sadece firma kaşe/imza kaydet (göndermeden)
    [HttpPost("{id:long}/signature")]
    public async Task<IActionResult> Signature(long id, SignDto dto)
    {
        var c = await db.Contracts.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Sözleşme bulunamadı.");
        c.CompanySignature = dto.Signature; c.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "İmza kaydedildi." });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Destroy(long id)
    {
        var c = await db.Contracts.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Sözleşme bulunamadı.");
        c.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Sözleşme silindi." });
    }

    // ───────────────────────────── Şablonlar ─────────────────────────────

    [HttpGet("templates")]
    public async Task<IActionResult> Templates([FromQuery] string? search, [FromQuery] string? sort)
    {
        await EnsureDefaultTemplate();
        var q = db.ContractTemplates.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(t => EF.Functions.ILike(t.Name, $"%{search.Trim()}%"));
        q = sort == "za" ? q.OrderByDescending(t => t.Name) : q.OrderBy(t => t.Name);
        var rows = await q.Select(t => new
        {
            t.Id, t.Name, t.Type, t.IsDefault, t.IsActive, t.Clauses,
        }).ToListAsync();
        var data = rows.Select(t => new
        {
            t.Id, t.Name, t.Type, t.IsDefault, t.IsActive,
            ClauseCount = CountClauses(t.Clauses),
        });
        return Ok(new { data });
    }

    [HttpGet("templates/{id:long}")]
    public async Task<IActionResult> TemplateShow(long id) =>
        Ok(await db.ContractTemplates.FirstOrDefaultAsync(t => t.Id == id) ?? throw new ApiException(404, "Şablon bulunamadı."));

    [HttpPost("templates")]
    public async Task<IActionResult> TemplateStore(TemplateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) throw new ApiException(422, "Şablon adı zorunludur.");
        var now = DateTime.UtcNow;
        var t = new ContractTemplate
        {
            TenantId = db.CurrentTenantId!.Value, Name = dto.Name.Trim(), Type = dto.Type ?? "Bakım Sözleşmesi",
            IsDefault = dto.IsDefault ?? false, IsActive = dto.IsActive ?? true,
            Clauses = dto.Clauses?.GetRawText() ?? "[]", Variables = dto.Variables?.GetRawText() ?? "[]",
            CreatedAt = now, UpdatedAt = now,
        };
        db.ContractTemplates.Add(t);
        if (t.IsDefault) await ClearDefaults(0);
        await db.SaveChangesAsync();
        if (t.IsDefault) { await ClearDefaults(t.Id); await db.SaveChangesAsync(); }
        return StatusCode(201, new { t.Id });
    }

    [HttpPut("templates/{id:long}")]
    public async Task<IActionResult> TemplateUpdate(long id, TemplateDto dto)
    {
        var t = await db.ContractTemplates.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Şablon bulunamadı.");
        if (!string.IsNullOrWhiteSpace(dto.Name)) t.Name = dto.Name.Trim();
        if (dto.Type != null) t.Type = dto.Type;
        if (dto.IsDefault is { } d) t.IsDefault = d;
        if (dto.IsActive is { } a) t.IsActive = a;
        if (dto.Clauses is { } cl) t.Clauses = cl.GetRawText();
        if (dto.Variables is { } v) t.Variables = v.GetRawText();
        t.UpdatedAt = DateTime.UtcNow;
        if (t.IsDefault) await ClearDefaults(t.Id);
        await db.SaveChangesAsync();
        return Ok(new { t.Id });
    }

    [HttpDelete("templates/{id:long}")]
    public async Task<IActionResult> TemplateDestroy(long id)
    {
        var t = await db.ContractTemplates.FirstOrDefaultAsync(x => x.Id == id) ?? throw new ApiException(404, "Şablon bulunamadı.");
        t.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Şablon silindi." });
    }

    // ───────────────────────────── Yardımcılar ─────────────────────────────

    private async Task ClearDefaults(long keepId)
    {
        var others = await db.ContractTemplates.Where(t => t.Id != keepId && t.IsDefault).ToListAsync();
        foreach (var o in others) o.IsDefault = false;
    }

    private static int CountClauses(string clausesJson)
    {
        try { return JsonSerializer.Deserialize<List<JsonElement>>(clausesJson, J)?.Count ?? 0; }
        catch { return 0; }
    }

    // Şablon maddelerini + serbest şartları müşteri/bina bilgileriyle doldurup önizleme verisi döndürür.
    private async Task<object> Render(Contract c)
    {
        var tenant = await db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == c.TenantId);
        var vars = new Dictionary<string, string>
        {
            ["firma_adi"] = tenant?.Name ?? "-",
            ["firma_vkn"] = tenant?.TaxNumber ?? "-",
            ["firma_adres"] = tenant?.Address ?? "-",
            ["firma_telefon"] = tenant?.Phone ?? "-",
            ["musteri_adi"] = c.CustomerName ?? c.Customer?.Name ?? "-",
            ["bina_adi"] = c.Building?.Name ?? "-",
            ["bina_adres"] = c.Building?.Address ?? "-",
            ["yonetici_adi"] = c.RepName ?? c.Building?.ManagerName ?? "-",
            ["baslangic"] = c.StartDate?.ToString("dd.MM.yyyy") ?? "-",
            ["bitis"] = c.EndDate?.ToString("dd.MM.yyyy") ?? "-",
            ["sozlesme_no"] = c.ContractNumber ?? c.Id.ToString(),
            ["periyot"] = c.Period ?? "-",
            ["yillik_ziyaret"] = c.AnnualVisits?.ToString() ?? "-",
            ["tutar"] = c.MonthlyFee is { } f ? $"{f:N2} {c.Currency}" : "-",
            ["yenileme_gun"] = c.RenewalNoticeDays.ToString(),
        };
        var rendered = new List<object>();
        if (c.TemplateId != null)
        {
            var tpl = await db.ContractTemplates.FirstOrDefaultAsync(t => t.Id == c.TemplateId);
            if (tpl != null)
                foreach (var el in ParseClauses(tpl.Clauses))
                {
                    if (el.active == false) continue;
                    rendered.Add(new { title = Fill(el.title, vars), body = Fill(el.body, vars) });
                }
        }
        return new
        {
            c.Id, c.ContractNumber, c.Type, c.StartDate, c.EndDate, c.MonthlyFee, c.Currency, c.Period,
            c.AnnualVisits, c.RenewalNoticeDays, c.AutoRenew, c.Status, c.DocumentStatus, c.CustomerId,
            c.BuildingId, c.TemplateId, c.CustomerName, c.RepName, c.Phone, c.Email, c.Terms, c.Notes,
            c.PublicToken, c.CompanySignature, c.CustomerSignature,
            Customer = c.Customer == null ? null : new { c.Customer.Name, c.Customer.AuthorizedPerson, c.Customer.Phone, c.Customer.Email },
            Building = c.Building == null ? null : new { c.Building.Name, c.Building.Address, c.Building.ManagerName },
            Company = new { tenant?.Name, tenant?.Phone, tenant?.Email, tenant?.Address, tenant?.TaxNumber, tenant?.LogoUrl },
            RenderedClauses = rendered,
        };
    }

    private record ClauseEl(string title, string body, bool? active);
    private static IEnumerable<ClauseEl> ParseClauses(string json)
    {
        try
        {
            var list = JsonSerializer.Deserialize<List<ClauseEl>>(json, J);
            return list ?? [];
        }
        catch { return []; }
    }

    private static string Fill(string s, Dictionary<string, string> vars)
    {
        if (string.IsNullOrEmpty(s)) return s;
        foreach (var (k, v) in vars) s = s.Replace("{{" + k + "}}", v);
        return s;
    }

    // Her tenant için ilk erişimde varsayılan "Standart Bakım Sözleşmesi" şablonunu üretir.
    private async Task EnsureDefaultTemplate()
    {
        if (await db.ContractTemplates.AnyAsync()) return;
        var now = DateTime.UtcNow;
        db.ContractTemplates.Add(new ContractTemplate
        {
            TenantId = db.CurrentTenantId!.Value, Name = "Standart Bakım Sözleşmesi", Type = "Bakım Sözleşmesi",
            IsDefault = true, IsActive = true, CreatedAt = now, UpdatedAt = now,
            Clauses = JsonSerializer.Serialize(DefaultClauses, J),
            Variables = JsonSerializer.Serialize(DefaultVariables, J),
        });
        await db.SaveChangesAsync();
    }

    private static readonly object[] DefaultVariables =
    [
        new { key = "olay_tarihi", label = "Örnek değişken" },
    ];

    private static readonly object[] DefaultClauses =
    [
        new { title = "1. Taraflar", active = true, body = "İşbu sözleşme; bakım hizmetini veren {{firma_adi}} (VKN: {{firma_vkn}}, Adres: {{firma_adres}}, Tel: {{firma_telefon}}) ile hizmeti alan {{musteri_adi}} (Bina: {{bina_adi}}, Adres: {{bina_adres}}, Yetkili: {{yonetici_adi}}) arasında {{baslangic}} tarihinde {{sozlesme_no}} numarası ile akdedilmiştir." },
        new { title = "2. Sözleşmenin Konusu ve Kapsamı", active = true, body = "Sözleşme konusu; binada bulunan asansör(ler)in TS EN 81-20/50 ve Asansör İşletme, Bakım ve Periyodik Kontrol Yönetmeliği'ne uygun olarak periyodik bakımının yapılmasıdır. Bakım kapsamında kuyu dibi, kabin üstü ve mekanik kontroller, kabin içi ve kapı sistemleri ile makine dairesi/MRL kontrolleri yer alır." },
        new { title = "3. Hizmet Süresi ve Bakım Periyodu", active = true, body = "Bakım hizmeti {{periyot}} periyotla, yılda toplam {{yillik_ziyaret}} ziyaret olarak verilir. Sözleşme {{baslangic}} - {{bitis}} tarihleri arasında geçerlidir." },
        new { title = "4. Ücret ve Ödeme Şekli", active = true, body = "Bakım hizmeti bedeli {{tutar}}'dir. Ödeme periyodik olarak, fatura tarihini izleyen süre içinde yapılır. Gecikme halinde yasal gecikme faizi uygulanabilir." },
        new { title = "5. A Tipi Periyodik Kontrol Koordinasyonu", active = true, body = "Asansörün yıllık A tipi periyodik kontrolü, yönetmelik gereği bina sahibi/yöneticisinin yükümlülüğündedir. Firma, akredite muayene kuruluşu ile koordinasyonu sağlar; muayenede tespit edilen eksikliklerin giderilmesi ayrıca fiyatlandırılabilir." },
        new { title = "6. Arıza Müdahale Süreleri", active = true, body = "Firma, bildirilen arızalara mümkün olan en kısa sürede müdahale eder. İçeride insan mahsur kalması durumunda kurtarma önceliklidir ve ivedilikle müdahale edilir." },
        new { title = "7. Yedek Parça ve Ek İşler", active = true, body = "Periyodik bakım kapsamı dışındaki yedek parça, onarım ve modernizasyon işleri ayrıca teklif edilir ve bina yönetiminin onayı ile uygulanır." },
        new { title = "8. Kayıt ve Belge Saklama", active = true, body = "Bakım kayıtları yönetmelik gereği en az 10 yıl saklanır. Her bakım sonrası düzenlenen bakım föyü taraflarca imzalanır ve dijital ortamda arşivlenir." },
        new { title = "9. Sözleşme Süresi, Yenileme ve Fesih", active = true, body = "Sözleşme bitiş tarihinden {{yenileme_gun}} gün önce taraflarca yazılı fesih bildirimi yapılmazsa aynı şartlarla kendiliğinden yenilenir. Taraflar yükümlülüklerini ihlal ettiğinde karşı taraf sözleşmeyi feshetme hakkına sahiptir." },
        new { title = "10. Cezai Şart ve Gecikme", active = true, body = "Tarafların sözleşmeden doğan yükümlülüklerini yerine getirmemesi halinde uygulanacak cezai şart ve gecikme faizi tarafların mutabakatı ile belirlenir." },
        new { title = "11. Kişisel Verilerin Korunması (KVKK)", active = true, body = "Taraflar, sözleşme kapsamında elde ettikleri kişisel verileri 6698 sayılı KVKK'ya uygun olarak işler, saklar ve üçüncü kişilerle paylaşmaz. Veriler yalnızca hizmetin ifası amacıyla kullanılır." },
        new { title = "12. Mücbir Sebep", active = true, body = "Doğal afet, salgın, resmi makam kararları gibi tarafların kontrolü dışındaki mücbir sebep hallerinde, etkilenen taraf yükümlülüklerinin ifasından mücbir sebep süresince sorumlu tutulmaz." },
        new { title = "13. Uyuşmazlıkların Çözümü", active = true, body = "İşbu sözleşmeden doğabilecek uyuşmazlıklarda Türkiye Cumhuriyeti kanunları uygulanır; firmanın bulunduğu yer mahkemeleri ve icra daireleri yetkilidir." },
    ];
}

// ───────────────────────────── Public (müşteri linki) ─────────────────────────────

[ApiController]
[AllowAnonymous]
[Route("api/v1/public/contracts")]
public class PublicContractController(AppDbContext db) : ControllerBase
{
    private static readonly JsonSerializerOptions J = new(JsonSerializerDefaults.Web);

    [HttpGet("{token}")]
    public async Task<IActionResult> Show(string token)
    {
        var c = await db.Contracts.IgnoreQueryFilters()
            .Include(x => x.Customer).Include(x => x.Building).Include(x => x.Template)
            .FirstOrDefaultAsync(x => x.PublicToken == token && x.DeletedAt == null)
            ?? throw new ApiException(404, "Sözleşme bulunamadı.");
        var tenant = await db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == c.TenantId);
        var vars = BuildVars(c, tenant);
        var rendered = new List<object>();
        if (c.Template != null)
            foreach (var el in ParseClauses(c.Template.Clauses))
            {
                if (el.active == false) continue;
                rendered.Add(new { title = Fill(el.title, vars), body = Fill(el.body, vars) });
            }
        return Ok(new
        {
            c.ContractNumber, c.Type, c.StartDate, c.EndDate, c.MonthlyFee, c.Currency, c.Period,
            c.AnnualVisits, c.RenewalNoticeDays, c.DocumentStatus, c.Terms,
            c.CompanySignature, c.CustomerSignature,
            CustomerName = c.CustomerName ?? c.Customer?.Name,
            Building = c.Building == null ? null : new { c.Building.Name, c.Building.Address },
            Company = new { tenant?.Name, tenant?.Phone, tenant?.Email, tenant?.Address },
            RenderedClauses = rendered,
        });
    }

    public record ApproveDto(string? Signature);

    [HttpPost("{token}/approve")]
    public async Task<IActionResult> Approve(string token, ApproveDto dto)
    {
        var c = await db.Contracts.IgnoreQueryFilters()
            .FirstOrDefaultAsync(x => x.PublicToken == token && x.DeletedAt == null)
            ?? throw new ApiException(404, "Sözleşme bulunamadı.");
        if (!string.IsNullOrWhiteSpace(dto.Signature)) c.CustomerSignature = dto.Signature;
        c.DocumentStatus = "approved"; c.ApprovedAt = DateTime.UtcNow; c.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Sözleşme onaylandı." });
    }

    private static Dictionary<string, string> BuildVars(Contract c, Tenant? t) => new()
    {
        ["firma_adi"] = t?.Name ?? "-", ["firma_vkn"] = t?.TaxNumber ?? "-",
        ["firma_adres"] = t?.Address ?? "-", ["firma_telefon"] = t?.Phone ?? "-",
        ["musteri_adi"] = c.CustomerName ?? c.Customer?.Name ?? "-",
        ["bina_adi"] = c.Building?.Name ?? "-", ["bina_adres"] = c.Building?.Address ?? "-",
        ["yonetici_adi"] = c.RepName ?? c.Building?.ManagerName ?? "-",
        ["baslangic"] = c.StartDate?.ToString("dd.MM.yyyy") ?? "-",
        ["bitis"] = c.EndDate?.ToString("dd.MM.yyyy") ?? "-",
        ["sozlesme_no"] = c.ContractNumber ?? c.Id.ToString(),
        ["periyot"] = c.Period ?? "-", ["yillik_ziyaret"] = c.AnnualVisits?.ToString() ?? "-",
        ["tutar"] = c.MonthlyFee is { } f ? $"{f:N2} {c.Currency}" : "-",
        ["yenileme_gun"] = c.RenewalNoticeDays.ToString(),
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
