<?php
// app/Http/Controllers/Api/DashboardController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cashbox;
use App\Models\CashboxTransaction;
use App\Models\Customer;
use App\Models\Elevator;
use App\Models\FaultReport;
use App\Models\Invoice;
use App\Models\MaintenanceRecord;

class DashboardController extends Controller
{
    public function kpis()
    {
        $monthStart = now()->startOfMonth();

        return response()->json([
            'customers'        => Customer::count(),
            'active_elevators' => Elevator::where('status', 'active')->count(),
            'maintenance_month' => MaintenanceRecord::where('planned_date', '>=', $monthStart)->count(),
            'open_faults'      => FaultReport::whereNotIn('status', ['resolved', 'closed'])->count(),
            'revenue_month'    => (float) CashboxTransaction::where('source_type', '!=', 'transfer')
                ->where('type', 'in')->where('created_at', '>=', $monthStart)->sum('amount'),
            'unpaid'           => (float) Invoice::whereIn('status', ['sent', 'overdue'])
                ->get()->sum(fn ($i) => (float) $i->total - (float) $i->paid_amount),
        ]);
    }

    public function revenueChart()
    {
        $rows = CashboxTransaction::query()
            ->where('source_type', '!=', 'transfer')->where('type', 'in')
            ->where('created_at', '>=', now()->subMonths(5)->startOfMonth())
            ->selectRaw("to_char(created_at,'YYYY-MM') as month, SUM(amount) as total")
            ->groupBy('month')->orderBy('month')->get();

        return response()->json($rows);
    }

    public function upcomingMaintenance()
    {
        return MaintenanceRecord::with('elevator:id,name')
            ->where('status', 'pending')
            ->whereBetween('planned_date', [now(), now()->addDays(7)])
            ->orderBy('planned_date')->limit(10)->get();
    }

    public function openFaults()
    {
        return FaultReport::with('elevator:id,name')
            ->whereNotIn('status', ['resolved', 'closed'])
            ->orderByDesc('id')->limit(5)->get();
    }

    public function tseWarnings()
    {
        return Elevator::with('building:id,name')
            ->whereNotNull('tse_end_date')
            ->whereBetween('tse_end_date', [now()->toDateString(), now()->addDays(30)->toDateString()])
            ->orderBy('tse_end_date')->limit(20)->get(['id', 'name', 'building_id', 'tse_end_date']);
    }

    public function cashboxSummary()
    {
        return Cashbox::where('is_active', true)->get(['id', 'name', 'type', 'balance']);
    }
}
