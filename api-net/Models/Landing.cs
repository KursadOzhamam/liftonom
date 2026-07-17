namespace Liftonom.Api.Models;

/// <summary>Landing (tanıtım) sayfası içerik öğesi — süper adminden yönetilir.</summary>
public class LandingItem
{
    public long Id { get; set; }
    public string Section { get; set; } = "feature"; // feature | module | step | compare_old | compare_new
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public string? Icon { get; set; }   // lucide ikon adı (feature/module/step için)
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>Landing sayfası genel ayarları (tek satır).</summary>
public class LandingSetting
{
    public long Id { get; set; }
    public string? HeroBadge { get; set; }
    public string? HeroTitle { get; set; }
    public string? HeroTitleAccent { get; set; }
    public string? HeroSubtitle { get; set; }
    public bool ShowPricing { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
