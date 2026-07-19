using Liftonom.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Liftonom.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/collections")]
public class CollectionController(LedgerService ledger) : ControllerBase
{
    public record CollectDto(long CustomerId, decimal Amount, string PaymentMethod, long CashboxId, string? Description);

    [HttpPost]
    public async Task<IActionResult> Store(CollectDto dto)
    {
        if (dto.Amount <= 0) throw new ApiException(422, "Tutar 0'dan büyük olmalı.");
        var uid = long.Parse(User.FindFirst("uid")!.Value);
        var r = await ledger.CollectAsync(dto.CustomerId, dto.Amount, dto.PaymentMethod, dto.CashboxId, dto.Description, uid);
        return StatusCode(201, new
        {
            message = "Tahsilat alındı.",
            account_balance = r.AccountBalance,
            cashbox_balance = r.CashboxBalance,
            transaction_id = r.TransactionId,
        });
    }

    /// <summary>Tahsilat iptali/iadesi — kasa ve cari ters kayıtla düzeltilir.</summary>
    [HttpPost("{accountTxId:long}/reverse")]
    public async Task<IActionResult> Reverse(long accountTxId)
    {
        var uid = long.Parse(User.FindFirst("uid")!.Value);
        var r = await ledger.ReverseCollectionAsync(accountTxId, uid);
        return Ok(new { message = "Tahsilat iade edildi.", account_balance = r.AccountBalance, cashbox_balance = r.CashboxBalance });
    }
}
