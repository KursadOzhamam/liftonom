using Microsoft.EntityFrameworkCore;

namespace LiftOtonom.Api.Services;

public record PageMeta(int CurrentPage, int LastPage, int Total, int PerPage);
public record PagedResponse<T>(List<T> Data, PageMeta Meta);

public static class Pagination
{
    public static async Task<PagedResponse<T>> ToPagedAsync<T>(
        this IQueryable<T> query, int page, int perPage = 25)
    {
        page = page < 1 ? 1 : page;
        perPage = Math.Clamp(perPage, 1, 100);

        var total = await query.CountAsync();
        var lastPage = (int)Math.Ceiling(total / (double)perPage);
        var data = await query.Skip((page - 1) * perPage).Take(perPage).ToListAsync();

        return new PagedResponse<T>(data, new PageMeta(page, Math.Max(lastPage, 1), total, perPage));
    }
}
