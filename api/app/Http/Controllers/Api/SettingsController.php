<?php
// app/Http/Controllers/Api/SettingsController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    /** Firma bilgileri + abonelik durumu. */
    public function show(Request $request)
    {
        $tenant = $request->user()->tenant;

        return response()->json([
            'name'        => $tenant->name,
            'slug'        => $tenant->slug,
            'phone'       => $tenant->phone,
            'email'       => $tenant->email,
            'address'     => $tenant->address,
            'tax_number'  => $tenant->tax_number,
            'tax_office'  => $tenant->tax_office,
            'logo_url'    => $tenant->logo_url,
            'plan'        => $tenant->plan,
            'plan_expires_at' => $tenant->plan_expires_at,
            'sms_balance' => $tenant->sms_balance,
        ]);
    }

    /** Firma bilgilerini güncelle (yalnızca yönetici). */
    public function update(Request $request)
    {
        $data = $request->validate([
            'name'       => ['sometimes', 'string', 'max:255'],
            'phone'      => ['nullable', 'string', 'max:20'],
            'email'      => ['nullable', 'email', 'max:255'],
            'address'    => ['nullable', 'string'],
            'tax_number' => ['nullable', 'string', 'max:20'],
            'tax_office' => ['nullable', 'string', 'max:100'],
        ]);

        $tenant = $request->user()->tenant;
        $tenant->update($data);

        return response()->json(['message' => 'Firma bilgileri güncellendi.']);
    }
}
