<?php
// app/Http/Controllers/Api/PayrollController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payroll;
use App\Services\LedgerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PayrollController extends Controller
{
    public function index(Request $request)
    {
        $q = Payroll::query()->with('user:id,name,surname');
        if ($request->filled('user_id')) {
            $q->where('user_id', $request->integer('user_id'));
        }
        if ($request->filled('period')) {
            $q->where('period', $request->string('period'));
        }

        return $q->orderByDesc('id')->paginate(min((int) $request->integer('per_page', 25), 100));
    }

    /** Bordro kaydı + (kasa verilirse) ödeme kasadan düşülür. */
    public function store(Request $request, LedgerService $ledger)
    {
        $data = $request->validate([
            'user_id'     => ['required', 'integer', 'exists:users,id'],
            'period'      => ['required', 'string', 'max:7'],
            'base_salary' => ['required', 'numeric', 'min:0'],
            'bonus'       => ['nullable', 'numeric'],
            'deduction'   => ['nullable', 'numeric'],
            'cashbox_id'  => ['nullable', 'integer', 'exists:cashboxes,id'],
        ]);

        $net = (float) $data['base_salary'] + (float) ($data['bonus'] ?? 0) - (float) ($data['deduction'] ?? 0);

        // Ödeme ve kayıt atomik: kasada bakiye yoksa bordro da oluşmaz
        $payroll = DB::transaction(function () use ($data, $net, $ledger, $request) {
            $payroll = Payroll::create([
                'user_id'     => $data['user_id'],
                'period'      => $data['period'],
                'base_salary' => $data['base_salary'],
                'bonus'       => $data['bonus'] ?? 0,
                'deduction'   => $data['deduction'] ?? 0,
                'net_paid'    => $net,
                'cashbox_id'  => $data['cashbox_id'] ?? null,
                'created_by'  => $request->user()->id,
            ]);

            if (! empty($data['cashbox_id'])) {
                $ledger->cashOut($data['cashbox_id'], $net, "Maaş ödemesi ({$data['period']})", 'payroll', $payroll->id, $request->user()->id);
                $payroll->update(['paid_at' => now()]);
            }

            return $payroll;
        });

        return response()->json($payroll->fresh()->load('user:id,name,surname'), 201);
    }
}
