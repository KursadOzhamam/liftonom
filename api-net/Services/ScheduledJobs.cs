using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Services;

/// <summary>Laravel scheduled command'lerinin karşılığı. Scope içinde çağrılır.</summary>
public class ScheduledJobs(AppDbContext db, ISmsSender sms, ITenantContext tenant)
{
    private static readonly Dictionary<string, int> PeriodDays = new()
    {
        ["weekly"] = 7, ["monthly"] = 30, ["3monthly"] = 90, ["6monthly"] = 180, ["annual"] = 365,
    };

    /// <summary>Tamamlanmış tekrarlayan bakımların bir sonraki örneğini oluşturur.</summary>
    public async Task<int> CreateRecurringMaintenanceAsync()
    {
        var created = 0;
        foreach (var t in await ActiveTenants())
        {
            tenant.TenantId = t;
            var recurring = await db.MaintenanceRecords
                .Where(m => m.IsRecurring && m.Status == "completed" && m.RecurringPeriod != null)
                .ToListAsync();

            foreach (var m in recurring)
            {
                if (await db.MaintenanceRecords.AnyAsync(x => x.ParentId == m.Id)) continue;
                var days = PeriodDays.GetValueOrDefault(m.RecurringPeriod!, 30);
                db.MaintenanceRecords.Add(new MaintenanceRecord
                {
                    TenantId = t, ElevatorId = m.ElevatorId, Type = m.Type,
                    PlannedDate = (m.CompletedAt ?? DateTime.UtcNow).AddDays(days), Status = "pending",
                    AssignedUsers = m.AssignedUsers, IsRecurring = true, RecurringPeriod = m.RecurringPeriod,
                    ParentId = m.Id, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
                });
                created++;
            }
            await db.SaveChangesAsync();
        }
        tenant.TenantId = null;
        return created;
    }

    /// <summary>TSE vadesi 30 gün içinde dolacak asansörler için SMS uyarısı.</summary>
    public async Task<int> SendTseWarningsAsync()
    {
        var sent = 0;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var in30 = today.AddDays(30);

        foreach (var t in await ActiveTenants())
        {
            tenant.TenantId = t;
            var pref = await db.SmsPreferences.FirstOrDefaultAsync(p => p.TenantId == t);
            var tenantRow = await db.Tenants.FindAsync(t);
            if (pref is { TseExpiry: false } || tenantRow!.SmsBalance <= 0) continue;

            var elevators = await db.Elevators.Include(e => e.Building)
                .Where(e => e.TseEndDate != null && e.TseEndDate >= today && e.TseEndDate <= in30).ToListAsync();

            foreach (var e in elevators)
            {
                var phone = e.Building?.ManagerPhone;
                if (string.IsNullOrEmpty(phone) || tenantRow.SmsBalance <= 0) continue;
                await sms.SendAsync(phone, $"TSE muayene tarihi yaklaşıyor: {e.Name} ({e.TseEndDate:dd.MM.yyyy}). Liftonom", "tse_expiry");
                tenantRow.SmsBalance--;
                sent++;
            }
            await db.SaveChangesAsync();
        }
        tenant.TenantId = null;
        return sent;
    }

    /// <summary>Yaklaşan planlı bakımlar için müşteriye SMS hatırlatması.</summary>
    public async Task<int> SendMaintenanceRemindersAsync()
    {
        var sent = 0;
        foreach (var t in await ActiveTenants())
        {
            tenant.TenantId = t;
            var pref = await db.SmsPreferences.FirstOrDefaultAsync(p => p.TenantId == t);
            var tenantRow = await db.Tenants.FindAsync(t);
            if (pref is { MaintenanceReminder: false } || tenantRow!.SmsBalance <= 0) continue;

            var target = DateTime.UtcNow.Date.AddDays(pref?.ReminderDaysBefore ?? 3);
            var records = await db.MaintenanceRecords.Include(m => m.Elevator)!.ThenInclude(e => e!.Building)
                .Where(m => m.Status == "pending" && m.PlannedDate!.Value.Date == target).ToListAsync();

            foreach (var m in records)
            {
                var phone = m.Elevator?.Building?.ManagerPhone;
                if (string.IsNullOrEmpty(phone) || tenantRow.SmsBalance <= 0) continue;
                await sms.SendAsync(phone, $"Bakım hatırlatması: {m.Elevator!.Name} için {m.PlannedDate:dd.MM.yyyy} tarihinde bakım planlandı. Liftonom", "maintenance_reminder");
                tenantRow.SmsBalance--;
                sent++;
            }
            await db.SaveChangesAsync();
        }
        tenant.TenantId = null;
        return sent;
    }

    private Task<List<long>> ActiveTenants() =>
        db.Tenants.IgnoreQueryFilters().Where(t => t.IsActive && t.DeletedAt == null).Select(t => t.Id).ToListAsync();
}
