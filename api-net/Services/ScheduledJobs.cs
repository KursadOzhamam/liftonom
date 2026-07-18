using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Services;

/// <summary>Günlük zamanlanmış işler. Scope içinde çağrılır. (SMS YOK — uygulama içi bildirim üretir.)</summary>
public class ScheduledJobs(AppDbContext db, ITenantContext tenant)
{
    private static readonly Dictionary<string, int> PeriodDays = new()
    {
        ["weekly"] = 7, ["monthly"] = 30, ["3monthly"] = 90, ["6monthly"] = 180, ["annual"] = 365,
    };

    // TSE vadesine kaç gün kala bildirim üretilecek (0 = vade günü).
    private static readonly int[] TseThresholds = [30, 7, 3, 1, 0];

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

    /// <summary>TSE muayene vadesi yaklaşan asansörler için panel bildirimi (30/7/3/1/0 gün kala).</summary>
    public async Task<int> SendTseWarningsAsync()
    {
        var sent = 0;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var today0 = DateTime.UtcNow.Date;

        foreach (var t in await ActiveTenants())
        {
            tenant.TenantId = t;
            var elevators = await db.Elevators.Include(e => e.Building)
                .Where(e => e.TseEndDate != null && e.TseEndDate >= today).ToListAsync();

            foreach (var e in elevators)
            {
                var daysLeft = e.TseEndDate!.Value.DayNumber - today.DayNumber;
                if (!TseThresholds.Contains(daysLeft)) continue;

                var link = $"/elevators/{e.Id}";
                // Aynı gün aynı asansör için tekrar üretme (idempotent).
                if (await db.Notifications.AnyAsync(n => n.Type == "warning" && n.Link == link && n.CreatedAt >= today0)) continue;

                var when = e.TseEndDate.Value.ToString("dd.MM.yyyy");
                db.Notifications.Add(new Notification
                {
                    TenantId = t, UserId = null, Type = "warning", Link = link, IsRead = false,
                    Title = daysLeft == 0 ? "TSE muayene vadesi bugün doldu" : $"TSE muayenesine {daysLeft} gün kaldı",
                    Body = $"{e.Name ?? "Asansör"} — {e.Building?.Name ?? "—"} · Vade: {when}",
                    CreatedAt = DateTime.UtcNow,
                });
                sent++;
            }
            await db.SaveChangesAsync();
        }
        tenant.TenantId = null;
        return sent;
    }

    /// <summary>Yaklaşan planlı bakımlar için panel bildirimi (3 gün kala).</summary>
    public async Task<int> SendMaintenanceRemindersAsync()
    {
        var sent = 0;
        var today0 = DateTime.UtcNow.Date;
        var target = today0.AddDays(3);

        foreach (var t in await ActiveTenants())
        {
            tenant.TenantId = t;
            var records = await db.MaintenanceRecords.Include(m => m.Elevator)!.ThenInclude(e => e!.Building)
                .Where(m => m.Status == "pending" && m.PlannedDate!.Value.Date == target).ToListAsync();

            foreach (var m in records)
            {
                var link = $"/maintenance/{m.Id}";
                if (await db.Notifications.AnyAsync(n => n.Type == "maintenance" && n.Link == link && n.CreatedAt >= today0)) continue;

                db.Notifications.Add(new Notification
                {
                    TenantId = t, UserId = null, Type = "maintenance", Link = link, IsRead = false,
                    Title = "Yaklaşan bakım (3 gün)",
                    Body = $"{m.Elevator?.Name ?? "Asansör"} — {m.Elevator?.Building?.Name ?? "—"} · {m.PlannedDate:dd.MM.yyyy}",
                    CreatedAt = DateTime.UtcNow,
                });
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
