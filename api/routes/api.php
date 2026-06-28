<?php
// routes/api.php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BuildingController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\ElevatorController;
use App\Http\Controllers\Api\PublicFaultController;
use App\Http\Controllers\Api\RegionController;
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
    });
});
