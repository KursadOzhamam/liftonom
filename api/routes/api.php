<?php
// routes/api.php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BuildingController;
use App\Http\Controllers\Api\CashboxController;
use App\Http\Controllers\Api\CollectionController;
use App\Http\Controllers\Api\CurrentAccountController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\ElevatorController;
use App\Http\Controllers\Api\FaultReportController;
use App\Http\Controllers\Api\ContractController;
use App\Http\Controllers\Api\FinanceController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\QuoteController;
use App\Http\Controllers\Api\MaintenanceController;
use App\Http\Controllers\Api\PublicFaultController;
use App\Http\Controllers\Api\RegionController;
use App\Http\Controllers\Api\WorkOrderController;
use App\Http\Controllers\Api\RegisterController;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API v1
|--------------------------------------------------------------------------
*/
Route::prefix('v1')->group(function () {

    // Sağlık kontrolü — DB bağlantısı + temel bilgi
    Route::get('/health', function () {
        $dbOk = true;
        try {
            DB::connection()->getPdo();
        } catch (\Throwable $e) {
            $dbOk = false;
        }

        return response()->json([
            'status'   => 'ok',
            'app'      => config('app.name'),
            'env'      => config('app.env'),
            'time'     => now()->toIso8601String(),
            'timezone' => config('app.timezone'),
            'database' => $dbOk ? 'connected' : 'error',
            'tenants'  => $dbOk ? Tenant::count() : null,
            'version'  => app()->version(),
        ]);
    });

    // --- Auth (public) ---
    Route::prefix('auth')->group(function () {
        Route::post('/register',   [RegisterController::class, 'register']);
        Route::post('/login',      [AuthController::class, 'login']);
        Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
        Route::post('/resend-otp', [AuthController::class, 'resendOtp']);
    });

    // --- QR ile girişsiz arıza (public, rate-limited) ---
    Route::middleware('throttle:20,1')->prefix('public')->group(function () {
        Route::get('/qr/{qrToken}', [PublicFaultController::class, 'show']);
        Route::post('/fault-reports/{qrToken}', [PublicFaultController::class, 'store']);
    });

    // --- Kimlik doğrulamalı + tenant bağlamlı ---
    Route::middleware(['auth:sanctum', 'tenant'])->group(function () {
        Route::get('/auth/me',     [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/me', fn (Request $request) => $request->user());

        // --- PHASE 3: Çekirdek ---
        Route::apiResource('customers', CustomerController::class);
        Route::apiResource('buildings', BuildingController::class);
        Route::apiResource('regions', RegionController::class);

        // Asansör — özel rotalar apiResource'tan ÖNCE
        Route::get('elevators/tse-report', [ElevatorController::class, 'tseReport']);
        Route::get('elevators/{elevator}/qr', [ElevatorController::class, 'qr']);
        Route::apiResource('elevators', ElevatorController::class);

        // --- PHASE 4: Bakım ---
        Route::get('maintenance/calendar', [MaintenanceController::class, 'calendar']);
        Route::post('maintenance/{maintenance}/complete', [MaintenanceController::class, 'complete']);
        Route::apiResource('maintenance', MaintenanceController::class)->parameter('maintenance', 'maintenance');

        // --- PHASE 5: Arıza & İş Emri ---
        Route::get('fault-reports/kanban', [FaultReportController::class, 'kanban']);
        Route::post('fault-reports/{faultReport}/comments', [FaultReportController::class, 'addComment']);
        Route::put('fault-reports/{faultReport}/status', [FaultReportController::class, 'changeStatus']);
        Route::post('fault-reports/{faultReport}/assign', [FaultReportController::class, 'assign']);
        Route::post('fault-reports/{faultReport}/convert-to-work-order', [FaultReportController::class, 'convertToWorkOrder']);
        Route::apiResource('fault-reports', FaultReportController::class)->parameter('fault-reports', 'faultReport');

        Route::post('work-orders/{workOrder}/complete', [WorkOrderController::class, 'complete']);
        Route::apiResource('work-orders', WorkOrderController::class)->parameter('work-orders', 'workOrder');

        // --- PHASE 6: Cari & Kasa & Finans ---
        Route::get('cashboxes', [CashboxController::class, 'index']);
        Route::post('cashboxes', [CashboxController::class, 'store']);
        Route::post('cashboxes/transfer', [CashboxController::class, 'transfer']);
        Route::get('cashboxes/{cashbox}', [CashboxController::class, 'show']);
        Route::put('cashboxes/{cashbox}', [CashboxController::class, 'update']);

        Route::get('current-accounts', [CurrentAccountController::class, 'index']);
        Route::get('current-accounts/{customer}', [CurrentAccountController::class, 'show']);

        Route::post('collections', [CollectionController::class, 'store']);

        Route::get('finance/summary', [FinanceController::class, 'summary']);
        Route::get('finance/monthly', [FinanceController::class, 'monthly']);

        // --- PHASE 7: Teklif & Sözleşme & Fatura ---
        Route::post('quotes/{quote}/send', [QuoteController::class, 'send']);
        Route::post('quotes/{quote}/approve', [QuoteController::class, 'approve']);
        Route::post('quotes/{quote}/reject', [QuoteController::class, 'reject']);
        Route::apiResource('quotes', QuoteController::class);

        Route::post('contracts/{contract}/renew', [ContractController::class, 'renew']);
        Route::apiResource('contracts', ContractController::class);

        Route::post('invoices/from-quote/{quote}', [InvoiceController::class, 'fromQuote']);
        Route::post('invoices/{invoice}/send', [InvoiceController::class, 'send']);
        Route::post('invoices/{invoice}/pay', [InvoiceController::class, 'pay']);
        Route::apiResource('invoices', InvoiceController::class);
    });
});
