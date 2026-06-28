<?php
// app/Http/Controllers/Api/CurrentAccountController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountTransaction;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CurrentAccountController extends Controller
{
    /** Cari listesi: müşteri + bakiye + son işlem. */
    public function index(Request $request)
    {
        $q = Customer::query()
            ->leftJoin('current_accounts', 'current_accounts.customer_id', '=', 'customers.id')
            ->select(
                'customers.id',
                'customers.name',
                'customers.phone',
                DB::raw('COALESCE(current_accounts.balance, 0) as balance'),
                'current_accounts.updated_at as last_activity'
            );

        if ($search = $request->string('search')->trim()->value()) {
            $q->where('customers.name', 'ilike', "%{$search}%");
        }

        return $q->orderByDesc('balance')->paginate(min((int) $request->integer('per_page', 25), 100));
    }

    /** Cari detay: özet + işlem geçmişi. */
    public function show(Request $request, Customer $customer)
    {
        $account = $customer->currentAccount;

        $tx = $account
            ? AccountTransaction::where('account_id', $account->id)
                ->orderByDesc('id')
                ->paginate(min((int) $request->integer('per_page', 25), 100))
            : [];

        return response()->json([
            'customer'     => ['id' => $customer->id, 'name' => $customer->name],
            'balance'      => $account ? (float) $account->balance : 0,
            'transactions' => $tx,
        ]);
    }
}
