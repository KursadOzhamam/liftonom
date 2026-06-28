namespace Liftonom.Api.Services;

/// <summary>İstek başına aktif tenant. Middleware JWT'den set eder, DbContext okur.</summary>
public interface ITenantContext
{
    long? TenantId { get; set; }
}

public class TenantContext : ITenantContext
{
    public long? TenantId { get; set; }
}
