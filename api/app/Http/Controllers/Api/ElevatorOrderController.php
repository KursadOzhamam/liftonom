<?php
// app/Http/Controllers/Api/ElevatorOrderController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ElevatorOrder;
use Illuminate\Http\Request;

class ElevatorOrderController extends Controller
{
    public function index(Request $request)
    {
        $q = ElevatorOrder::query()->with('customer:id,name');
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }

        return $q->orderByDesc('id')->paginate(min((int) $request->integer('per_page', 25), 100));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_id'   => ['required', 'integer', 'exists:customers,id'],
            'elevator_type' => ['nullable', 'string', 'max:50'],
            'quantity'      => ['nullable', 'integer', 'min:1'],
            'amount'        => ['nullable', 'numeric'],
            'notes'         => ['nullable', 'string'],
        ]);
        $data['status'] = 'quote';

        $order = ElevatorOrder::create($data);
        $order->update(['order_number' => 'SIP-' . str_pad((string) $order->id, 6, '0', STR_PAD_LEFT)]);

        return response()->json($order->fresh()->load('customer:id,name'), 201);
    }

    public function show(ElevatorOrder $elevatorOrder)
    {
        return $elevatorOrder->load('customer:id,name');
    }

    public function update(Request $request, ElevatorOrder $elevatorOrder)
    {
        $elevatorOrder->update($request->validate([
            'elevator_type' => ['nullable', 'string', 'max:50'],
            'quantity'      => ['nullable', 'integer', 'min:1'],
            'amount'        => ['nullable', 'numeric'],
            'status'        => ['sometimes', 'in:' . implode(',', ElevatorOrder::STATUSES)],
            'notes'         => ['nullable', 'string'],
        ]));

        return $elevatorOrder->fresh();
    }

    public function destroy(ElevatorOrder $elevatorOrder)
    {
        $elevatorOrder->delete();

        return response()->json(['message' => 'Sipariş silindi.']);
    }
}
