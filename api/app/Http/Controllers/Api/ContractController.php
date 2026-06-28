<?php
// app/Http/Controllers/Api/ContractController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contract;
use Illuminate\Http\Request;

class ContractController extends Controller
{
    public function index(Request $request)
    {
        $q = Contract::query()->with('customer:id,name');
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }

        return $q->orderByDesc('id')->paginate(min((int) $request->integer('per_page', 25), 100));
    }

    public function store(Request $request)
    {
        $c = Contract::create($this->validateData($request));
        $c->update(['contract_number' => 'SZL-' . str_pad((string) $c->id, 6, '0', STR_PAD_LEFT)]);

        return response()->json($c->fresh()->load('customer:id,name'), 201);
    }

    public function show(Contract $contract)
    {
        return $contract->load('customer:id,name');
    }

    public function update(Request $request, Contract $contract)
    {
        $contract->update($this->validateData($request, $contract));

        return $contract->fresh();
    }

    public function destroy(Contract $contract)
    {
        $contract->delete();

        return response()->json(['message' => 'Sözleşme silindi.']);
    }

    public function renew(Request $request, Contract $contract)
    {
        $months = (int) $request->integer('months', 12);
        $contract->update([
            'start_date' => $contract->end_date ?? now(),
            'end_date'   => ($contract->end_date ?? now())->copy()->addMonths($months),
            'status'     => 'active',
        ]);

        return $contract->fresh();
    }

    private function validateData(Request $request, ?Contract $contract = null): array
    {
        return $request->validate([
            'customer_id' => [$contract ? 'sometimes' : 'required', 'integer', 'exists:customers,id'],
            'type'        => ['nullable', 'in:maintenance,installation,mixed'],
            'start_date'  => ['nullable', 'date'],
            'end_date'    => ['nullable', 'date'],
            'monthly_fee' => ['nullable', 'numeric'],
            'auto_renew'  => ['nullable', 'boolean'],
            'status'      => ['nullable', 'string', 'max:50'],
            'elevators'   => ['nullable', 'array'],
            'notes'       => ['nullable', 'string'],
        ]);
    }
}
