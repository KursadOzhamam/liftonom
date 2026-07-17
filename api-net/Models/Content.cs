namespace Liftonom.Api.Models;

/// <summary>Süper adminden yönetilen içerik sayfası: solution (çözüm), city (şehir), blog (rehber), legal (yasal).</summary>
public class ContentPage
{
    public long Id { get; set; }
    public string Type { get; set; } = "blog"; // solution | city | blog | legal
    public string Slug { get; set; } = "";
    public string Title { get; set; } = "";
    public string? Excerpt { get; set; }
    public string? Body { get; set; }          // uzun metin (satır sonları paragraf)
    public string? CoverUrl { get; set; }
    public string? Icon { get; set; }          // çözümler için lucide ikon adı
    public int SortOrder { get; set; }
    public bool IsPublished { get; set; } = true;
    public DateOnly? PublishedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}
