namespace Liftonom.Api.Models;

/// <summary>Çek & Senet portföyü.</summary>
public class Check
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long? CustomerId { get; set; }
    public string Type { get; set; } = "cek";          // cek | senet
    public string Direction { get; set; } = "received"; // received (alınan/portföy) | given (verilen)
    public decimal Amount { get; set; }
    public string? Bank { get; set; }
    public string? SerialNo { get; set; }
    public DateOnly? DueDate { get; set; }
    public string Status { get; set; } = "portfolio";   // portfolio | collected | paid | bounced | endorsed
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Customer? Customer { get; set; }
}

/// <summary>Bakım ücreti tanımı (müşteri/bina bazlı periyodik tutar).</summary>
public class MaintenanceFee
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long? CustomerId { get; set; }
    public long? BuildingId { get; set; }
    public decimal Amount { get; set; }
    public string Period { get; set; } = "monthly";    // monthly | quarterly | yearly
    public DateOnly? ValidFrom { get; set; }
    public DateOnly? ValidTo { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Customer? Customer { get; set; }
    public Building? Building { get; set; }
}

/// <summary>Saha aracı (araç takip).</summary>
public class Vehicle
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public string Plate { get; set; } = "";
    public string? Brand { get; set; }
    public string? Model { get; set; }
    public long? AssignedUserId { get; set; }
    public string Status { get; set; } = "active";     // active | maintenance | idle
    public double? LastLat { get; set; }
    public double? LastLng { get; set; }
    public DateTime? LocationUpdatedAt { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public User? AssignedUser { get; set; }
}

/// <summary>Kullanıcı bildirimi (uygulama içi bildirim merkezi).</summary>
public class Notification
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long? UserId { get; set; }
    public string Title { get; set; } = "";
    public string? Body { get; set; }
    public string? Type { get; set; }                   // info | warning | fault | maintenance | finance
    public string? Link { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>Stok lokasyonu (depo / raf).</summary>
public class StockLocation
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public string Name { get; set; } = "";
    public string? Code { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}

/// <summary>Cihaz push token'ı (FCM) — kullanıcıya gerçek push bildirimi için.</summary>
public class DeviceToken
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public long UserId { get; set; }
    public string Token { get; set; } = "";
    public string? Platform { get; set; }   // ios | android
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>Genel belge formu — Kurtarma Formu (rescue) & Eğitim Tutanağı (training).</summary>
public class DocumentForm
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public string Kind { get; set; } = "rescue";        // rescue | training
    public long? CustomerId { get; set; }
    public long? BuildingId { get; set; }
    public long? ElevatorId { get; set; }
    public string? Title { get; set; }
    public string? FormData { get; set; } = "{}";       // jsonb
    public string Status { get; set; } = "draft";
    public long? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Customer? Customer { get; set; }
    public Elevator? Elevator { get; set; }
}
