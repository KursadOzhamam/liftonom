using LiftOtonom.Api.Models;
using LiftOtonom.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace LiftOtonom.Api.Data;

public class AppDbContext : DbContext
{
    private readonly ITenantContext _tenant;

    public AppDbContext(DbContextOptions<AppDbContext> options, ITenantContext tenant)
        : base(options)
    {
        _tenant = tenant;
    }

    /// <summary>EF query filter'ları çalışma anında bunu okur (per-request tenant).</summary>
    public long? CurrentTenantId => _tenant.TenantId;

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<User> Users => Set<User>();
    public DbSet<OtpCode> OtpCodes => Set<OtpCode>();
    public DbSet<Plan> Plans => Set<Plan>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<SmsPreference> SmsPreferences => Set<SmsPreference>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        // Soft delete (Laravel deleted_at)
        b.Entity<Tenant>().HasQueryFilter(t => t.DeletedAt == null);
        b.Entity<User>().HasQueryFilter(u => u.DeletedAt == null);

        // OtpCode: timestamps yok (created_at hariç)
        b.Entity<OtpCode>().Property(o => o.CreatedAt).HasDefaultValueSql("now()");

        base.OnModelCreating(b);
    }
}
