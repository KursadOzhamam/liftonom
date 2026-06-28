using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Liftonom.Api.Controllers;

/// <summary>Zamanlanmış görevleri manuel tetikleme (yönetici) — test/operasyon için.</summary>
[ApiController]
[Authorize(Roles = "manager")]
[Route("api/v1/jobs")]
public class JobsController(ScheduledJobs jobs) : ControllerBase
{
    [HttpPost("run")]
    public async Task<IActionResult> Run()
    {
        return Ok(new
        {
            recurring_maintenance = await jobs.CreateRecurringMaintenanceAsync(),
            tse_warnings = await jobs.SendTseWarningsAsync(),
            maintenance_reminders = await jobs.SendMaintenanceRemindersAsync(),
        });
    }
}
