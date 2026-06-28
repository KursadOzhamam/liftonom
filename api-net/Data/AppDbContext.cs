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

    // Auth
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<User> Users => Set<User>();
    public DbSet<OtpCode> OtpCodes => Set<OtpCode>();
    public DbSet<Plan> Plans => Set<Plan>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<SmsPreference> SmsPreferences => Set<SmsPreference>();

    // Çekirdek
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Building> Buildings => Set<Building>();
    public DbSet<Elevator> Elevators => Set<Elevator>();
    public DbSet<MaintenanceRecord> MaintenanceRecords => Set<MaintenanceRecord>();
    public DbSet<FaultReport> FaultReports => Set<FaultReport>();
    public DbSet<Region> Regions => Set<Region>();
    public DbSet<WorkOrder> WorkOrders => Set<WorkOrder>();
    public DbSet<FaultReportComment> FaultReportComments => Set<FaultReportComment>();

    // Finans
    public DbSet<Cashbox> Cashboxes => Set<Cashbox>();
    public DbSet<CashboxTransaction> CashboxTransactions => Set<CashboxTransaction>();
    public DbSet<CurrentAccount> CurrentAccounts => Set<CurrentAccount>();
    public DbSet<Invoice> Invoices => Set<Invoice>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        // Auth: User & Tenant yalnızca soft-delete (tenant filtresi YOK — login firmalar arası arar)
        b.Entity<Tenant>().HasQueryFilter(t => t.DeletedAt == null);
        b.Entity<User>().HasQueryFilter(u => u.DeletedAt == null);

        // Tenant-izole + soft-delete
        b.Entity<Customer>().HasQueryFilter(e => e.DeletedAt == null && e.TenantId == CurrentTenantId);
        b.Entity<Building>().HasQueryFilter(e => e.DeletedAt == null && e.TenantId == CurrentTenantId);
        b.Entity<Elevator>().HasQueryFilter(e => e.DeletedAt == null && e.TenantId == CurrentTenantId);
        b.Entity<MaintenanceRecord>().HasQueryFilter(e => e.DeletedAt == null && e.TenantId == CurrentTenantId);
        b.Entity<FaultReport>().HasQueryFilter(e => e.DeletedAt == null && e.TenantId == CurrentTenantId);
        b.Entity<Cashbox>().HasQueryFilter(e => e.DeletedAt == null && e.TenantId == CurrentTenantId);
        b.Entity<CurrentAccount>().HasQueryFilter(e => e.DeletedAt == null && e.TenantId == CurrentTenantId);
        b.Entity<Invoice>().HasQueryFilter(e => e.DeletedAt == null && e.TenantId == CurrentTenantId);

        b.Entity<WorkOrder>().HasQueryFilter(e => e.DeletedAt == null && e.TenantId == CurrentTenantId);

        // Ledger / soft-delete'siz — sadece tenant
        b.Entity<CashboxTransaction>().HasQueryFilter(e => e.TenantId == CurrentTenantId);
        b.Entity<Region>().HasQueryFilter(e => e.TenantId == CurrentTenantId);

        // jsonb kolonlar (string olarak ham JSON tutulur)
        b.Entity<MaintenanceRecord>(e =>
        {
            e.Property(m => m.AssignedUsers).HasColumnType("jsonb");
            e.Property(m => m.Checklist).HasColumnType("jsonb");
            e.Property(m => m.MaterialsUsed).HasColumnType("jsonb");
            e.Property(m => m.Photos).HasColumnType("jsonb");
        });

        b.Entity<OtpCode>().Property(o => o.CreatedAt).HasDefaultValueSql("now()");

        base.OnModelCreating(b);
    }
}
