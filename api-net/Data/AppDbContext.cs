using Liftonom.Api.Models;
using Liftonom.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Data;

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
    public DbSet<PlatformAdmin> PlatformAdmins => Set<PlatformAdmin>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<SubscriptionPayment> SubscriptionPayments => Set<SubscriptionPayment>();
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
    public DbSet<AccountTransaction> AccountTransactions => Set<AccountTransaction>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<Quote> Quotes => Set<Quote>();
    public DbSet<Contract> Contracts => Set<Contract>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Attendance> Attendances => Set<Attendance>();
    public DbSet<Payroll> Payrolls => Set<Payroll>();
    public DbSet<AtfForm> AtfForms => Set<AtfForm>();
    public DbSet<DtrReport> DtrReports => Set<DtrReport>();
    public DbSet<ElevatorOrder> ElevatorOrders => Set<ElevatorOrder>();
    public DbSet<SmsLog> SmsLogs => Set<SmsLog>();
    public DbSet<WhatsAppLog> WhatsAppLogs => Set<WhatsAppLog>();

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
        b.Entity<Quote>().HasQueryFilter(e => e.DeletedAt == null && e.TenantId == CurrentTenantId);
        b.Entity<Contract>().HasQueryFilter(e => e.DeletedAt == null && e.TenantId == CurrentTenantId);
        b.Entity<Product>().HasQueryFilter(e => e.DeletedAt == null && e.TenantId == CurrentTenantId);
        b.Entity<Supplier>().HasQueryFilter(e => e.DeletedAt == null && e.TenantId == CurrentTenantId);
        b.Entity<Project>().HasQueryFilter(e => e.DeletedAt == null && e.TenantId == CurrentTenantId);
        b.Entity<AtfForm>().HasQueryFilter(e => e.DeletedAt == null && e.TenantId == CurrentTenantId);
        b.Entity<DtrReport>().HasQueryFilter(e => e.DeletedAt == null && e.TenantId == CurrentTenantId);
        b.Entity<ElevatorOrder>().HasQueryFilter(e => e.DeletedAt == null && e.TenantId == CurrentTenantId);
        b.Entity<SmsLog>().HasQueryFilter(e => e.TenantId == CurrentTenantId);
        b.Entity<SmsPreference>().HasQueryFilter(e => e.TenantId == CurrentTenantId);
        b.Entity<WhatsAppLog>(e => { e.ToTable("whatsapp_logs"); e.HasQueryFilter(x => x.TenantId == CurrentTenantId); });
        b.Entity<SubscriptionPayment>(e => { e.Property(p => p.RawResponse).HasColumnType("jsonb"); e.HasQueryFilter(x => x.TenantId == CurrentTenantId); });
        b.Entity<Subscription>().HasQueryFilter(e => e.TenantId == CurrentTenantId);

        b.Entity<WorkOrder>().HasQueryFilter(e => e.DeletedAt == null && e.TenantId == CurrentTenantId);

        // Ledger / soft-delete'siz — sadece tenant
        b.Entity<CashboxTransaction>().HasQueryFilter(e => e.TenantId == CurrentTenantId);
        b.Entity<AccountTransaction>().HasQueryFilter(e => e.TenantId == CurrentTenantId);
        b.Entity<StockMovement>().HasQueryFilter(e => e.TenantId == CurrentTenantId);
        b.Entity<Region>().HasQueryFilter(e => e.TenantId == CurrentTenantId);

        // Tekil tablo adları + tenant filtresi
        b.Entity<Attendance>(e => { e.ToTable("attendance"); e.HasQueryFilter(x => x.TenantId == CurrentTenantId); });
        b.Entity<Payroll>(e => { e.ToTable("payroll"); e.HasQueryFilter(x => x.TenantId == CurrentTenantId); });

        // jsonb kolonlar (string olarak ham JSON tutulur)
        b.Entity<MaintenanceRecord>(e =>
        {
            e.Property(m => m.AssignedUsers).HasColumnType("jsonb");
            e.Property(m => m.Checklist).HasColumnType("jsonb");
            e.Property(m => m.MaterialsUsed).HasColumnType("jsonb");
            e.Property(m => m.Photos).HasColumnType("jsonb");
        });
        b.Entity<Quote>().Property(q => q.Items).HasColumnType("jsonb");
        b.Entity<Invoice>().Property(i => i.Items).HasColumnType("jsonb");
        b.Entity<Contract>().Property(c => c.Elevators).HasColumnType("jsonb");
        b.Entity<Project>(e =>
        {
            e.Property(p => p.AssignedUsers).HasColumnType("jsonb");
            e.Property(p => p.Tasks).HasColumnType("jsonb");
        });
        b.Entity<AtfForm>(e =>
        {
            e.Property(a => a.FormData).HasColumnType("jsonb");
            e.Property(a => a.Attachments).HasColumnType("jsonb");
        });
        b.Entity<DtrReport>(e =>
        {
            e.Property(d => d.ChecklistItems).HasColumnType("jsonb");
            e.Property(d => d.Photos).HasColumnType("jsonb");
        });

        b.Entity<OtpCode>().Property(o => o.CreatedAt).HasDefaultValueSql("now()");

        base.OnModelCreating(b);
    }
}
