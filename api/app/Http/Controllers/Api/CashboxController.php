<?php
// app/Http/Controllers/Api/CashboxController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cashbox;
use App\Services\LedgerService;
use Illuminate\Http\Request;

class CashboxController extends Controller
{
    public function index()
    {
        $boxes = Cashbox::where('is_active', true)->orderBy('name')->get();

        return response()->json([
            'data'  => $boxes,
            'total' => $boxes->sum(fn ($b) => (float) $b->balance),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'type'     => ['required', 'in:cash,bank'],
            'balance'  => ['nullable', 'numeric'],
            'currency' => ['nullable', 'string', 'size:3'],
        ]);

        return response()->json(Cashbox::create($data)->fresh(), 201);
    }

    public function show(Request $request, Cashbox $cashbox)
    {
        return response()->json([
            'cashbox'      => $cashbox,
            'transactions' => $cashbox->transactions()
                ->orderByDesc('id')
                ->paginate(min((int) $request->integer('per_page', 25), 100)),
        ]);
    }

    public function update(Request $request, Cashbox $cashbox)
    {
        $cashbox->update($request->validate([
            'name'      => ['sometimes', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
        ]));

        return $cashbox->fresh();
    }

    public function transfer(Request $request, LedgerService $ledger)
    {
        $data = $request->validate([
            'from_id' => ['required', 'integer', 'exists:cashboxes,id'],
            'to_id'   => ['required', 'integer', 'exists:cashboxes,id'],
            'amount'  => ['required', 'numeric', 'min:0.01'],
        ]);

        $result = $ledger->transfer($data['from_id'], $data['to_id'], (float) $data['amount'], $request->user()->id);

        return response()->json(['message' => 'Transfer tamamlandı.', ...$result]);
    }
}
