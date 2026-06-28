namespace LiftOtonom.Api.Services;

/// <summary>Her gün 08:00 UTC civarı zamanlanmış görevleri çalıştırır (Laravel scheduler karşılığı).</summary>
public class DailyJobsHostedService(IServiceScopeFactory scopeFactory, ILogger<DailyJobsHostedService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var now = DateTime.UtcNow;
            var next = now.Date.AddHours(8);
            if (next <= now) next = next.AddDays(1);
            var delay = next - now;

            try { await Task.Delay(delay, stoppingToken); }
            catch (TaskCanceledException) { break; }

            try
            {
                using var scope = scopeFactory.CreateScope();
                var jobs = scope.ServiceProvider.GetRequiredService<ScheduledJobs>();
                var m = await jobs.CreateRecurringMaintenanceAsync();
                var tse = await jobs.SendTseWarningsAsync();
                var rem = await jobs.SendMaintenanceRemindersAsync();
                logger.LogInformation("[scheduled] recurring={M} tse={Tse} reminders={Rem}", m, tse, rem);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "[scheduled] hata");
            }
        }
    }
}
