using System.Text.Json;
using Liftonom.Api.Services;

namespace Liftonom.Api.Middleware;

public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
{
    public async Task Invoke(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (ApiException ex)
        {
            await WriteJson(context, ex.StatusCode, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Beklenmeyen hata");
            // GEÇİCİ TANI: gerçek hatayı yanıtta göster (teşhis sonrası geri alınacak).
            var detail = ex.GetType().Name + ": " + ex.Message +
                (ex.InnerException != null ? " || INNER " + ex.InnerException.GetType().Name + ": " + ex.InnerException.Message : "");
            await WriteJson(context, 500, detail);
        }
    }

    private static async Task WriteJson(HttpContext context, int status, string message)
    {
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new { message }));
    }
}
