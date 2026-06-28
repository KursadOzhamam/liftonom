<?php
// app/Http/Controllers/Api/ReportController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashboxTransaction;
use App\Models\FaultReport;
use App\Models\MaintenanceRecord;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ReportController extends Controller
{
    /** Günlük özet: o günün bakım, tahsilat, arıza sayıları. */
    public function dailySummary(Request $request)
    {
        $date = $request->date('date') ?? today();

        return response()->json([
            'date'            => Carbon::parse($date)->toDateString(),
            'maintenance'     => MaintenanceRecord::whereDate('planned_date', $date)->count(),
            'completed'       => MaintenanceRecord::whereDate('completed_at', $date)->count(),
            'new_faults'      => FaultReport::whereDate('created_at', $date)->count(),
            'collections'     => (float) CashboxTransaction::where('source_type', 'collection')
                ->whereDate('created_at', $date)->sum('amount'),
            'cash_in'         => (float) CashboxTransaction::where('source_type', '!=', 'transfer')
                ->where('type', 'in')->whereDate('created_at', $date)->sum('amount'),
            'cash_out'        => (float) CashboxTransaction::where('source_type', '!=', 'transfer')
                ->where('type', 'out')->whereDate('created_at', $date)->sum('amount'),
        ]);
    }

    /** Tahsilat özeti: ödeme yöntemine göre gruplama. */
    public function collectionSummary(Request $request)
    {
        [$start, $end] = $this->range($request);

        $rows = \App\Models\AccountTransaction::query()
            ->where('source_type', 'collection')
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw('payment_method, COUNT(*) as count, SUM(amount) as total')
            ->groupBy('payment_method')->get();

        return response()->json([
            'start' => $start->toDateString(),
            'end'   => $end->toDateString(),
            'total' => (float) $rows->sum('total'),
            'by_method' => $rows,
        ]);
    }

    /** Personel performansı: tamamlanan bakım / kapatılan arıza. */
    public function staffPerformance(Request $request)
    {
        [$start, $end] = $this->range($request);

        $users = User::where('tenant_id', $request->user()->tenant_id)
            ->where('role', 'technician')->get(['id', 'name', 'surname']);

        $data = $users->map(function ($u) use ($start, $end) {
            return [
                'user'              => trim($u->name . ' ' . $u->surname),
                'completed_maint'   => MaintenanceRecord::whereJsonContains('assigned_users', $u->id)
                    ->whereBetween('completed_at', [$start, $end])->where('status', 'completed')->count(),
                'resolved_faults'   => FaultReport::where('assigned_user_id', $u->id)
                    ->whereBetween('resolved_at', [$start, $end])->count(),
            ];
        });

        return response()->json(['start' => $start->toDateString(), 'end' => $end->toDateString(), 'data' => $data]);
    }

    /** Stok hareketleri raporu. */
    public function inventoryMovements(Request $request)
    {
        [$start, $end] = $this->range($request);

        $q = StockMovement::query()->whereBetween('created_at', [$start, $end]);
        if ($request->filled('product_id')) {
            $q->where('product_id', $request->integer('product_id'));
        }

        return response()->json([
            'start' => $start->toDateString(),
            'end'   => $end->toDateString(),
            'in'    => (float) (clone $q)->where('type', 'in')->sum('quantity'),
            'out'   => (float) (clone $q)->where('type', 'out')->sum('quantity'),
            'items' => $q->orderByDesc('id')->limit(500)->get(),
        ]);
    }

    private function range(Request $request): array
    {
        $start = $request->date('start') ?? now()->startOfMonth();
        $end   = $request->date('end') ?? now()->endOfMonth();

        return [Carbon::parse($start)->startOfDay(), Carbon::parse($end)->endOfDay()];
    }
}
