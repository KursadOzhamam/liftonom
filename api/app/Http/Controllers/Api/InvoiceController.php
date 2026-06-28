<?php
// app/Http/Controllers/Api/InvoiceController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Quote;
use App\Services\LedgerService;
use App\Support\DocumentTotals;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $q = Invoice::query()->with('customer:id,name');
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
        $data = $request->validate([
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'type'        => ['nullable', 'in:e-fatura,e-archive'],
            'issue_date'  => ['nullable', 'date'],
            'due_date'    => ['nullable', 'date'],
            'items'       => ['nullable', 'array'],
            'tax_rate'    => ['nullable', 'numeric'],
            'discount'    => ['nullable', 'numeric'],
            'notes'       => ['nullable', 'string'],
        ]);
        $totals = DocumentTotals::compute($data['items'] ?? [], (float) ($data['tax_rate'] ?? 20), (float) ($data['discount'] ?? 0));
        $invoice = Invoice::create(array_merge($data, $totals, [
            'status'     => 'draft',
            'issue_date' => $data['issue_date'] ?? now()->toDateString(),
            'created_by' => $request->user()->id,
        ]));
        $invoice->update(['invoice_number' => 'FTR-' . str_pad((string) $invoice->id, 6, '0', STR_PAD_LEFT)]);

        return response()->json($invoice->fresh()->load('customer:id,name'), 201);
    }

    /** Tekliften fatura oluştur. */
    public function fromQuote(Request $request, Quote $quote)
    {
        $invoice = Invoice::create([
            'customer_id' => $quote->customer_id,
            'status'      => 'draft',
            'issue_date'  => now()->toDateString(),
            'items'       => $quote->items,
            'subtotal'    => $quote->subtotal,
            'tax_rate'    => $quote->tax_rate,
            'tax_amount'  => $quote->tax_amount,
            'discount'    => $quote->discount,
            'total'       => $quote->total,
            'source_type' => 'quote',
            'source_id'   => $quote->id,
            'created_by'  => $request->user()->id,
        ]);
        $invoice->update(['invoice_number' => 'FTR-' . str_pad((string) $invoice->id, 6, '0', STR_PAD_LEFT)]);

        return response()->json($invoice->fresh(), 201);
    }

    public function show(Invoice $invoice)
    {
        return $invoice->load('customer:id,name');
    }

    public function update(Request $request, Invoice $invoice)
    {
        $data = $request->validate([
            'due_date' => ['nullable', 'date'],
            'items'    => ['nullable', 'array'],
            'tax_rate' => ['nullable', 'numeric'],
            'discount' => ['nullable', 'numeric'],
            'notes'    => ['nullable', 'string'],
        ]);
        if (isset($data['items'])) {
            $data = array_merge($data, DocumentTotals::compute($data['items'], (float) ($data['tax_rate'] ?? $invoice->tax_rate), (float) ($data['discount'] ?? $invoice->discount)));
        }
        $invoice->update($data);

        return $invoice->fresh();
    }

    public function destroy(Invoice $invoice)
    {
        $invoice->delete();

        return response()->json(['message' => 'Fatura silindi.']);
    }

    public function send(Invoice $invoice)
    {
        $invoice->update(['status' => 'sent']);

        return $invoice->fresh();
    }

    /** Fatura ödemesi — ledger'a tahsilat işler. */
    public function pay(Request $request, Invoice $invoice, LedgerService $ledger)
    {
        $data = $request->validate([
            'amount'         => ['required', 'numeric', 'min:0.01'],
            'cashbox_id'     => ['required', 'integer', 'exists:cashboxes,id'],
            'payment_method' => ['required', 'in:cash,card,transfer,check'],
        ]);

        $ledger->collect(
            $invoice->customer_id,
            (float) $data['amount'],
            $data['payment_method'],
            $data['cashbox_id'],
            "Fatura {$invoice->invoice_number} ödemesi",
            $request->user()->id,
        );

        $invoice->paid_amount = (float) $invoice->paid_amount + (float) $data['amount'];
        if ((float) $invoice->paid_amount >= (float) $invoice->total) {
            $invoice->status = 'paid';
        }
        $invoice->save();

        return $invoice->fresh();
    }
}
