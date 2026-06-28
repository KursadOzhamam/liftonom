<?php
// app/Http/Controllers/Api/QuoteController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Quote;
use App\Support\DocumentTotals;
use Illuminate\Http\Request;

class QuoteController extends Controller
{
    public function index(Request $request)
    {
        $q = Quote::query()->with('customer:id,name');
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }
        if ($request->filled('customer_id')) {
            $q->where('customer_id', $request->integer('customer_id'));
        }

        return $q->orderByDesc('id')->paginate(min((int) $request->integer('per_page', 25), 100));
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request);
        $quote = Quote::create($this->withTotals($data));
        $quote->update(['quote_number' => 'TEK-' . str_pad((string) $quote->id, 6, '0', STR_PAD_LEFT)]);

        return response()->json($quote->fresh()->load('customer:id,name'), 201);
    }

    public function show(Quote $quote)
    {
        return $quote->load('customer:id,name');
    }

    public function update(Request $request, Quote $quote)
    {
        $data = $this->validateData($request, $quote);
        $quote->update($this->withTotals(array_merge($quote->toArray(), $data)));

        return $quote->fresh();
    }

    public function destroy(Quote $quote)
    {
        $quote->delete();

        return response()->json(['message' => 'Teklif silindi.']);
    }

    public function send(Quote $quote)
    {
        $quote->update(['status' => 'sent']);

        return $quote->fresh();
    }

    public function approve(Quote $quote)
    {
        $quote->update(['status' => 'approved']);

        return $quote->fresh();
    }

    public function reject(Quote $quote)
    {
        $quote->update(['status' => 'rejected']);

        return $quote->fresh();
    }

    private function validateData(Request $request, ?Quote $quote = null): array
    {
        return $request->validate([
            'customer_id'       => [$quote ? 'sometimes' : 'required', 'integer', 'exists:customers,id'],
            'valid_until'       => ['nullable', 'date'],
            'items'             => ['nullable', 'array'],
            'items.*.description' => ['nullable', 'string'],
            'items.*.quantity'  => ['nullable', 'numeric'],
            'items.*.unit_price' => ['nullable', 'numeric'],
            'tax_rate'          => ['nullable', 'numeric'],
            'discount'          => ['nullable', 'numeric'],
            'notes'             => ['nullable', 'string'],
        ]);
    }

    private function withTotals(array $data): array
    {
        $items = $data['items'] ?? [];
        $totals = DocumentTotals::compute($items, (float) ($data['tax_rate'] ?? 20), (float) ($data['discount'] ?? 0));

        return array_merge($data, $totals, ['items' => $items]);
    }
}
