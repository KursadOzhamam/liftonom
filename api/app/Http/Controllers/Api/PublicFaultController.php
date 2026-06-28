<?php
// app/Http/Controllers/Api/PublicFaultController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Elevator;
use App\Models\FaultReport;
use App\Support\TenantContext;
use Illuminate\Http\Request;

/**
 * QR kod ile GİRİŞSİZ arıza bildirimi (v1.1 26.9).
 * Asansör qr_token'dan çözülür; tenant ona göre belirlenir.
 */
class PublicFaultController extends Controller
{
    /** QR açılış: asansör/bina bilgisi (girişsiz görünür). */
    public function show(string $qrToken)
    {
        $elevator = Elevator::withoutGlobalScopes()
            ->with('building:id,name,address')
            ->where('qr_token', $qrToken)
            ->firstOrFail();

        return response()->json([
            'elevator' => [
                'id'    => $elevator->id,
                'name'  => $elevator->name,
                'brand' => $elevator->brand,
            ],
            'building' => $elevator->building ? [
                'name'    => $elevator->building->name,
                'address' => $elevator->building->address,
            ] : null,
        ]);
    }

    /** Girişsiz arıza kaydı oluştur. */
    public function store(Request $request, string $qrToken)
    {
        $data = $request->validate([
            'reporter_name'  => ['nullable', 'string', 'max:255'],
            'reporter_phone' => ['nullable', 'string', 'max:20'],
            'description'    => ['required', 'string', 'max:2000'],
        ]);

        $elevator = Elevator::withoutGlobalScopes()
            ->where('qr_token', $qrToken)
            ->firstOrFail();

        // tenant'ı asansörden belirle ki kayıt doğru firmaya düşsün
        TenantContext::setId($elevator->tenant_id);

        $fault = FaultReport::create([
            'tenant_id'        => $elevator->tenant_id,
            'elevator_id'      => $elevator->id,
            'reported_by_type' => 'qr',
            'priority'         => 'normal',
            'status'           => 'new',
            'description'      => trim(
                ($data['reporter_name'] ?? '') . ' ' .
                ($data['reporter_phone'] ?? '') . ' — ' . $data['description']
            ),
        ]);

        return response()->json([
            'message'   => 'Arıza talebiniz alındı. Ekibimiz en kısa sürede ilgilenecek.',
            'report_id' => $fault->id,
        ], 201);
    }
}
