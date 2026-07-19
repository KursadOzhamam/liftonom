using Liftonom.Api.Data;
using Liftonom.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Liftonom.Api.Services;

/// <summary>Para hareketleri tek DB transaction'ında atomik yazılır (Laravel LedgerService karşılığı).</summary>
public class LedgerService(AppDbContext db)
{
    public record CollectResult(decimal AccountBalance, decimal CashboxBalance, long TransactionId);

    /// <summary>İşi bir transaction içinde çalıştırır; çağıran zaten bir transaction açtıysa onu kullanır.</summary>
    private async Task<T> RunAsync<T>(Func<Task<T>> work)
    {
        if (db.Database.CurrentTransaction != null) return await work();
        await using var tx = await db.Database.BeginTransactionAsync();
        var result = await work();
        await tx.CommitAsync();
        return result;
    }

    /// <summary>Tahsilat: cari borç azalır + kasaya giriş.</summary>
    public Task<CollectResult> CollectAsync(long customerId, decimal amount, string paymentMethod,
        long cashboxId, string? description, long? userId) => RunAsync(async () =>
    {
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

        return new CollectResult(account.Balance, cashbox.Balance, accTx.Id);
    });

    /// <summary>Kasalar arası transfer.</summary>
    public Task<(decimal FromBalance, decimal ToBalance)> TransferAsync(long fromId, long toId, decimal amount, long? userId)
    {
        if (fromId == toId) throw new ApiException(422, "Aynı kasaya transfer yapılamaz.");
        return RunAsync(async () =>
        {
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
            return (from.Balance, to.Balance);
        });
    }

    /// <summary>Kasadan çıkış (gider/maaş).</summary>
    public Task<decimal> CashOutAsync(long cashboxId, decimal amount, string? description, string sourceType, long? sourceId, long? userId)
        => RunAsync(async () =>
    {
        var cashbox = await db.Cashboxes.FirstOrDefaultAsync(c => c.Id == cashboxId) ?? throw new ApiException(404, "Kasa bulunamadı.");
        if (cashbox.Balance < amount) throw new ApiException(422, "Kasada yeterli bakiye yok.");

        cashbox.Balance -= amount; cashbox.UpdatedAt = DateTime.UtcNow;
        db.CashboxTransactions.Add(new CashboxTransaction { TenantId = db.CurrentTenantId!.Value, CashboxId = cashbox.Id,
            Type = "out", Amount = amount, BalanceAfter = cashbox.Balance, Description = description,
            SourceType = sourceType, SourceId = sourceId, CreatedBy = userId, CreatedAt = DateTime.UtcNow });

        await db.SaveChangesAsync();
        return cashbox.Balance;
    });

    /// <summary>Tahsilat iptali/iadesi: cari +tutar (ters debit), kasa −tutar (out). Çift iade engellenir.</summary>
    public Task<CollectResult> ReverseCollectionAsync(long accountTxId, long? userId) => RunAsync(async () =>
    {
        var orig = await db.AccountTransactions.FirstOrDefaultAsync(t => t.Id == accountTxId)
            ?? throw new ApiException(404, "Tahsilat hareketi bulunamadı.");
        if (orig.SourceType != "collection") throw new ApiException(422, "Bu hareket bir tahsilat değil.");
        if (await db.AccountTransactions.AnyAsync(t => t.SourceType == "collection_reversal" && t.SourceId == orig.Id))
            throw new ApiException(422, "Bu tahsilat zaten iade edilmiş.");

        var account = await db.CurrentAccounts.FirstOrDefaultAsync(a => a.Id == orig.AccountId)
            ?? throw new ApiException(404, "Cari hesap bulunamadı.");
        var now = DateTime.UtcNow;
        var tid = db.CurrentTenantId!.Value;

        account.Balance += orig.Amount; account.UpdatedAt = now;
        db.AccountTransactions.Add(new AccountTransaction
        {
            TenantId = tid, AccountId = account.Id, Type = "debit", Amount = orig.Amount, BalanceAfter = account.Balance,
            Description = $"Tahsilat iadesi (#{orig.Id})", SourceType = "collection_reversal", SourceId = orig.Id,
            CashboxId = orig.CashboxId, PaymentMethod = orig.PaymentMethod, CreatedBy = userId, CreatedAt = now,
        });

        decimal cashboxBalance = 0;
        if (orig.CashboxId is { } cbId)
        {
            var cb = await db.Cashboxes.FirstOrDefaultAsync(c => c.Id == cbId);
            if (cb != null)
            {
                cb.Balance -= orig.Amount; cb.UpdatedAt = now;
                db.CashboxTransactions.Add(new CashboxTransaction
                {
                    TenantId = tid, CashboxId = cb.Id, Type = "out", Amount = orig.Amount, BalanceAfter = cb.Balance,
                    Description = $"Tahsilat iadesi (#{orig.Id})", SourceType = "collection_reversal", SourceId = orig.Id,
                    CreatedBy = userId, CreatedAt = now,
                });
                cashboxBalance = cb.Balance;
            }
        }
        await db.SaveChangesAsync();
        return new CollectResult(account.Balance, cashboxBalance, orig.Id);
    });
}
