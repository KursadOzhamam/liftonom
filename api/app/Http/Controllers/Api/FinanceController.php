<?php
// app/Http/Controllers/Api/FinanceController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cashbox;
use App\Models\CashboxTransaction;
use Illuminate\Support\Facades\DB;

class FinanceController extends Controller
{
    /** Finans özeti: kasa toplamları + bugün/bu ay giriş-çıkış. */
    public function summary()
    {
        $boxes = Cashbox::where('is_active', true)->get();

        // Virman (transfer) hariç — gerçek giriş/çıkış
        $real = fn () => CashboxTransaction::where('source_type', '!=', 'transfer');
        $todayIn  = (clone $real())->whereDate('created_at', today())->where('type', 'in')->sum('amount');
        $todayOut = (clone $real())->whereDate('created_at', today())->where('type', 'out')->sum('amount');
        $monthIn  = (clone $real())->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])->where('type', 'in')->sum('amount');
        $monthOut = (clone $real())->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])->where('type', 'out')->sum('amount');

        return response()->json([
            'total_balance' => (float) $boxes->sum(fn ($b) => (float) $b->balance),
            'cash_total'    => (float) $boxes->where('type', 'cash')->sum(fn ($b) => (float) $b->balance),
            'bank_total'    => (float) $boxes->where('type', 'bank')->sum(fn ($b) => (float) $b->balance),
            'today'         => ['in' => (float) $todayIn, 'out' => (float) $todayOut],
            'this_month'    => ['in' => (float) $monthIn, 'out' => (float) $monthOut],
        ]);
    }

    /** Son 12 ay aylık giriş/çıkış (grafik için). */
    public function monthly()
    {
        $rows = CashboxTransaction::query()
            ->where('created_at', '>=', now()->subMonths(11)->startOfMonth())
            ->selectRaw("to_char(created_at, 'YYYY-MM') as month")
            ->selectRaw("SUM(CASE WHEN type='in' THEN amount ELSE 0 END) as income")
            ->selectRaw("SUM(CASE WHEN type='out' THEN amount ELSE 0 END) as expense")
            ->groupBy('month')->orderBy('month')->get();

        return response()->json($rows);
    }
}
