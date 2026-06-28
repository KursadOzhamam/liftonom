using Liftonom.Api.Data;
using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Liftonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/whatsapp")]
public class WhatsAppController(AppDbContext db) : ControllerBase
{
    [HttpGet("history")]
    public async Task<IActionResult> History([FromQuery(Name = "per_page")] int perPage = 25, [FromQuery] int page = 1) =>
        Ok(await db.WhatsAppLogs.OrderByDescending(w => w.Id).ToPagedAsync(page, perPage));
}
