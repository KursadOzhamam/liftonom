<?php
// app/Http/Controllers/Api/CollectionController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\LedgerService;
use Illuminate\Http\Request;

class CollectionController extends Controller
{
    /** Tahsilat al — cari + kasa atomik güncellenir. */
    public function store(Request $request, LedgerService $ledger)
    {
        $data = $request->validate([
            'customer_id'    => ['required', 'integer', 'exists:customers,id'],
            'amount'         => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', 'in:cash,card,transfer,check'],
            'cashbox_id'     => ['required', 'integer', 'exists:cashboxes,id'],
            'description'    => ['nullable', 'string', 'max:500'],
        ]);

        $result = $ledger->collect(
            $data['customer_id'],
            (float) $data['amount'],
            $data['payment_method'],
            $data['cashbox_id'],
            $data['description'] ?? null,
            $request->user()->id,
        );

        return response()->json([
            'message' => 'Tahsilat alındı.',
            ...$result,
        ], 201);
    }
}
