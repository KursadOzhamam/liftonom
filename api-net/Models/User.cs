namespace Liftonom.Api.Models;

public class User
{
    public long Id { get; set; }
    public long TenantId { get; set; }
    public string Name { get; set; } = "";
    public string? Surname { get; set; }
    public string Phone { get; set; } = "";
    public string? Email { get; set; }
    public DateTime? EmailVerifiedAt { get; set; }
    public string Password { get; set; } = "";
    public string Role { get; set; } = "office";
    public long? RegionId { get; set; }
    public string? AvatarUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }
    public double? LastLat { get; set; }
    public double? LastLng { get; set; }
    public DateTime? LocationUpdatedAt { get; set; }
    public string? RememberToken { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Tenant? Tenant { get; set; }

    public const string RoleManager = "manager";
    public const string RoleOffice = "office";
    public const string RoleTechnician = "technician";
    public const string RoleAccounting = "accounting";
    public const string RoleViewer = "viewer";
}
