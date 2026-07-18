namespace Liftonom.Api.Models;

/// <summary>Müşteriye gönderilecek WhatsApp mesaj şablonu (tenant'a özel).</summary>
public class WhatsAppTemplate
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public string Name { get; set; } = "";
    public string Body { get; set; } = "";   // {ad} {firma} gibi yer tutucular içerebilir
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}
