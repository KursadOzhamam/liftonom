<?php
// app/Services/LedgerService.php

namespace App\Services;

use App\Models\AccountTransaction;
use App\Models\Cashbox;
use App\Models\CashboxTransaction;
use App\Models\CurrentAccount;
use Illuminate\Support\Facades\DB;

/**
 * Para hareketleri tek DB transaction'ında atomik yazılır (v1.1 26.5).
 * Bakiye kolonları cache'tir; gerçeklik hareket tablolarındadır.
 */
class LedgerService
{
    /**
     * Tahsilat: müşteri borcunu azaltır (cari credit) + kasaya giriş (cashbox in).
     */
    public function collect(int $customerId, float $amount, string $paymentMethod, int $cashboxId, ?string $description, ?int $userId): array
    {
        return DB::transaction(function () use ($customerId, $amount, $paymentMethod, $cashboxId, $description, $userId) {
            $account = CurrentAccount::firstOrCreate(['customer_id' => $customerId], ['balance' => 0]);
            $cashbox = Cashbox::lockForUpdate()->findOrFail($cashboxId);
            $account = CurrentAccount::lockForUpdate()->find($account->id);

            // Cari: borç azalır
            $account->balance = (float) $account->balance - $amount;
            $account->save();

            $accTx = AccountTransaction::create([
                'account_id'     => $account->id,
                'type'           => 'credit',
                'amount'         => $amount,
                'balance_after'  => $account->balance,
                'description'    => $description ?? 'Tahsilat',
                'source_type'    => 'collection',
                'cashbox_id'     => $cashboxId,
                'payment_method' => $paymentMethod,
                'created_by'     => $userId,
                'created_at'     => now(),
            ]);

            // Kasa: giriş
            $cashbox->balance = (float) $cashbox->balance + $amount;
            $cashbox->save();

            CashboxTransaction::create([
                'cashbox_id'    => $cashbox->id,
                'type'          => 'in',
                'amount'        => $amount,
                'balance_after' => $cashbox->balance,
                'description'   => $description ?? 'Tahsilat',
                'source_type'   => 'collection',
                'source_id'     => $accTx->id,
                'created_by'    => $userId,
                'created_at'    => now(),
            ]);

            return [
                'account_balance' => $account->balance,
                'cashbox_balance' => $cashbox->balance,
                'transaction_id'  => $accTx->id,
            ];
        });
    }

    /** Kasalar arası transfer (atomik). */
    public function transfer(int $fromId, int $toId, float $amount, ?int $userId): array
    {
        abort_if($fromId === $toId, 422, 'Aynı kasaya transfer yapılamaz.');

        return DB::transaction(function () use ($fromId, $toId, $amount, $userId) {
            // Kilit sırasını id'ye göre sabitle (deadlock önleme)
            [$firstId, $secondId] = $fromId < $toId ? [$fromId, $toId] : [$toId, $fromId];
            Cashbox::lockForUpdate()->whereIn('id', [$firstId, $secondId])->get();

            $from = Cashbox::findOrFail($fromId);
            $to   = Cashbox::findOrFail($toId);

            abort_if((float) $from->balance < $amount, 422, 'Kaynak kasada yeterli bakiye yok.');

            $from->balance = (float) $from->balance - $amount;
            $from->save();
            $to->balance = (float) $to->balance + $amount;
            $to->save();

            CashboxTransaction::create([
                'cashbox_id' => $from->id, 'type' => 'transfer', 'amount' => $amount,
                'balance_after' => $from->balance, 'description' => "Transfer → {$to->name}",
                'source_type' => 'transfer', 'transfer_to_id' => $to->id,
                'created_by' => $userId, 'created_at' => now(),
            ]);
            CashboxTransaction::create([
                'cashbox_id' => $to->id, 'type' => 'in', 'amount' => $amount,
                'balance_after' => $to->balance, 'description' => "Transfer ← {$from->name}",
                'source_type' => 'transfer', 'transfer_to_id' => $from->id,
                'created_by' => $userId, 'created_at' => now(),
            ]);

            return ['from_balance' => $from->balance, 'to_balance' => $to->balance];
        });
    }
}
