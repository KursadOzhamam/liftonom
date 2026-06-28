using LiftOtonom.Api.Data;
using LiftOtonom.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LiftOtonom.Api.Services;

/// <summary>Para hareketleri tek DB transaction'ında atomik yazılır (Laravel LedgerService karşılığı).</summary>
public class LedgerService(AppDbContext db)
{
    public record CollectResult(decimal AccountBalance, decimal CashboxBalance, long TransactionId);

    /// <summary>Tahsilat: cari borç azalır + kasaya giriş.</summary>
    public async Task<CollectResult> CollectAsync(long customerId, decimal amount, string paymentMethod,
        long cashboxId, string? description, long? userId)
    {
        await using var tx = await db.Database.BeginTransactionAsync();

        var account = await db.CurrentAccounts.FirstOrDefaultAsync(a => a.CustomerId == customerId);
        if (account == null)
        {
            account = new CurrentAccount { TenantId = db.CurrentTenantId!.Value, CustomerId = customerId, Balance = 0,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
            db.CurrentAccounts.Add(account);
            await db.SaveChangesAsync();
        }

        var cashbox = await db.Cashboxes.FirstOrDefaultAsync(c => c.Id == cashboxId)
            ?? throw new ApiException(404, "Kasa bulunamadı.");

        account.Balance -= amount;
        account.UpdatedAt = DateTime.UtcNow;

        var accTx = new AccountTransaction
        {
            TenantId = db.CurrentTenantId!.Value, AccountId = account.Id, Type = "credit", Amount = amount,
            BalanceAfter = account.Balance, Description = description ?? "Tahsilat", SourceType = "collection",
            CashboxId = cashboxId, PaymentMethod = paymentMethod, CreatedBy = userId, CreatedAt = DateTime.UtcNow,
        };
        db.AccountTransactions.Add(accTx);

        cashbox.Balance += amount;
        cashbox.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        db.CashboxTransactions.Add(new CashboxTransaction
        {
            TenantId = db.CurrentTenantId!.Value, CashboxId = cashbox.Id, Type = "in", Amount = amount,
            BalanceAfter = cashbox.Balance, Description = description ?? "Tahsilat", SourceType = "collection",
            SourceId = accTx.Id, CreatedBy = userId, CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        return new CollectResult(account.Balance, cashbox.Balance, accTx.Id);
    }

    /// <summary>Kasalar arası transfer.</summary>
    public async Task<(decimal FromBalance, decimal ToBalance)> TransferAsync(long fromId, long toId, decimal amount, long? userId)
    {
        if (fromId == toId) throw new ApiException(422, "Aynı kasaya transfer yapılamaz.");
        await using var tx = await db.Database.BeginTransactionAsync();

        var from = await db.Cashboxes.FirstOrDefaultAsync(c => c.Id == fromId) ?? throw new ApiException(404, "Kaynak kasa bulunamadı.");
        var to = await db.Cashboxes.FirstOrDefaultAsync(c => c.Id == toId) ?? throw new ApiException(404, "Hedef kasa bulunamadı.");
        if (from.Balance < amount) throw new ApiException(422, "Kaynak kasada yeterli bakiye yok.");

        from.Balance -= amount; from.UpdatedAt = DateTime.UtcNow;
        to.Balance += amount; to.UpdatedAt = DateTime.UtcNow;
        var now = DateTime.UtcNow;

        db.CashboxTransactions.Add(new CashboxTransaction { TenantId = db.CurrentTenantId!.Value, CashboxId = from.Id,
            Type = "transfer", Amount = amount, BalanceAfter = from.Balance, Description = $"Transfer → {to.Name}",
            SourceType = "transfer", TransferToId = to.Id, CreatedBy = userId, CreatedAt = now });
        db.CashboxTransactions.Add(new CashboxTransaction { TenantId = db.CurrentTenantId!.Value, CashboxId = to.Id,
            Type = "in", Amount = amount, BalanceAfter = to.Balance, Description = $"Transfer ← {from.Name}",
            SourceType = "transfer", TransferToId = from.Id, CreatedBy = userId, CreatedAt = now });

        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return (from.Balance, to.Balance);
    }

    /// <summary>Kasadan çıkış (gider/maaş).</summary>
    public async Task<decimal> CashOutAsync(long cashboxId, decimal amount, string? description, string sourceType, long? sourceId, long? userId)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        var cashbox = await db.Cashboxes.FirstOrDefaultAsync(c => c.Id == cashboxId) ?? throw new ApiException(404, "Kasa bulunamadı.");
        if (cashbox.Balance < amount) throw new ApiException(422, "Kasada yeterli bakiye yok.");

        cashbox.Balance -= amount; cashbox.UpdatedAt = DateTime.UtcNow;
        db.CashboxTransactions.Add(new CashboxTransaction { TenantId = db.CurrentTenantId!.Value, CashboxId = cashbox.Id,
            Type = "out", Amount = amount, BalanceAfter = cashbox.Balance, Description = description,
            SourceType = sourceType, SourceId = sourceId, CreatedBy = userId, CreatedAt = DateTime.UtcNow });

        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return cashbox.Balance;
    }
}
