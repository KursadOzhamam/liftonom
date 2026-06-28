using LiftOtonom.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LiftOtonom.Api.Controllers;

[ApiController]
[Route("api/v1")]
public class HealthController(AppDbContext db, IHostEnvironment env) : ControllerBase
{
    [HttpGet("health")]
    public async Task<IActionResult> Health()
    {
        bool dbOk;
        int? tenants = null;
        try
        {
            tenants = await db.Tenants.IgnoreQueryFilters().CountAsync();
            dbOk = true;
        }
        catch
        {
            dbOk = false;
        }

        return Ok(new
        {
            status = "ok",
            app = "LiftOtonom",
            env = env.EnvironmentName.ToLower(),
            time = DateTimeOffset.UtcNow.ToString("o"),
            timezone = "Europe/Istanbul",
            database = dbOk ? "connected" : "error",
            tenants,
            version = ".NET " + Environment.Version,
            backend = "dotnet",
        });
    }
}
