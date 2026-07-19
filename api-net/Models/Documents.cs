namespace Liftonom.Api.Models;

public class Quote
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long? CustomerId { get; set; }
    public long? TemplateId { get; set; }
    public string? QuoteNumber { get; set; }
    public string Type { get; set; } = "standard";    // standard | revision (revizyon teklifi)
    public string Status { get; set; } = "draft";
    public string DocumentStatus { get; set; } = "draft"; // belge durumu: draft | sent | approved
    public string? Title { get; set; }                // konu/başlık
    public string? CustomerName { get; set; }         // serbest müşteri adı (kayıttan bağımsız)
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string Currency { get; set; } = "TRY";
    public DateOnly? ValidUntil { get; set; }
    public string? Items { get; set; } = "[]";        // jsonb
    public decimal? Subtotal { get; set; }
    public decimal TaxRate { get; set; } = 20;
    public decimal? TaxAmount { get; set; }
    public decimal Discount { get; set; }
    public decimal? Total { get; set; }
    public string? Terms { get; set; }                // serbest şartlar (şablon yoksa)
    public string? PublicToken { get; set; }
    public DateTime? SentAt { get; set; }
    public string? Notes { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Customer? Customer { get; set; }
    public QuoteTemplate? Template { get; set; }
}

// Teklif şablonu — standart şart maddeleri + değişkenler (ContractTemplate ile aynı desen).
public class QuoteTemplate
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public string Name { get; set; } = "";
    public string Type { get; set; } = "Teklif";
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;
    public string Clauses { get; set; } = "[]";       // jsonb: [{title,body,active}]
    public string Variables { get; set; } = "[]";     // jsonb: [{key,label}]
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}

public class Contract
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long? CustomerId { get; set; }
    public long? BuildingId { get; set; }
    public long? TemplateId { get; set; }
    public string? ContractNumber { get; set; }
    public string? Type { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public decimal? MonthlyFee { get; set; }          // sözleşme tutarı
    public string Currency { get; set; } = "TRY";
    public string? Period { get; set; }               // Aylık | 3 Aylık | 6 Aylık | Yıllık
    public int? AnnualVisits { get; set; }            // yıllık ziyaret sayısı
    public int RenewalNoticeDays { get; set; } = 30;  // yenileme bildirimi (gün)
    public bool AutoRenew { get; set; }
    public string Status { get; set; } = "active";    // yaşam döngüsü: draft | active | expired | cancelled
    public string DocumentStatus { get; set; } = "draft"; // belge durumu: draft | sent | approved
    // Sözleşmedeki serbest müşteri bilgileri (müşteri kaydından bağımsız kilitlenmiş)
    public string? CustomerName { get; set; }
    public string? RepName { get; set; }              // müşteri temsilcisi
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Terms { get; set; }                // serbest sözleşme şartları (şablon yoksa)
    public string? Clauses { get; set; } = "[]";      // jsonb: doldurulmuş madde anlık görüntüsü [{title,body}]
    public string? Elevators { get; set; } = "[]";    // jsonb
    public string? PublicToken { get; set; }          // müşteri public link token'ı
    public string? CompanySignature { get; set; }     // firma kaşe/imza (data URL)
    public string? CustomerSignature { get; set; }    // müşteri imzası (public sayfadan)
    public DateTime? SentAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? DocumentUrl { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Customer? Customer { get; set; }
    public Building? Building { get; set; }
    public ContractTemplate? Template { get; set; }
}

// Bakım sözleşmesi şablonu — mevzuat maddeleri + değişkenler. Sözleşme oluştururken
// maddeler müşteri/bina bilgileriyle otomatik doldurulur.
public class ContractTemplate
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public string Name { get; set; } = "";
    public string Type { get; set; } = "Bakım Sözleşmesi";
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;
    public string Clauses { get; set; } = "[]";       // jsonb: [{title,body,active}]
    public string Variables { get; set; } = "[]";     // jsonb: [{key,label}]
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}
