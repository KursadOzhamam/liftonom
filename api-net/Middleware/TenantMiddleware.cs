using LiftOtonom.Api.Services;

namespace LiftOtonom.Api.Middleware;

/// <summary>Kimliği doğrulanmış istekte JWT 'tid' claim'inden tenant'ı bağlama yazar.</summary>
public class TenantMiddleware(RequestDelegate next)
{
    public async Task Invoke(HttpContext context, ITenantContext tenant)
    {
        var tid = context.User.FindFirst("tid")?.Value;
        if (long.TryParse(tid, out var tenantId))
            tenant.TenantId = tenantId;

        await next(context);
    }
}
