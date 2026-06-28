<?php
// app/Http/Controllers/Api/SmsController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SmsLog;
use App\Models\SmsPreference;
use App\Services\Sms\SmsSender;
use App\Support\Phone;
use App\Support\TenantContext;
use Illuminate\Http\Request;

class SmsController extends Controller
{
    public function balance(Request $request)
    {
        $tenant = $request->user()->tenant;

        return response()->json([
            'balance'   => $tenant->sms_balance,
            'sent_total' => SmsLog::count(),
        ]);
    }

    public function history(Request $request)
    {
        return SmsLog::query()->orderByDesc('id')
            ->paginate(min((int) $request->integer('per_page', 25), 100));
    }

    public function send(Request $request, SmsSender $sms)
    {
        $data = $request->validate([
            'phone'   => ['required', 'string'],
            'message' => ['required', 'string', 'max:600'],
        ]);

        $tenant = $request->user()->tenant;
        abort_if($tenant->sms_balance <= 0, 402, 'SMS bakiyeniz yetersiz.');

        $phone = Phone::normalize($data['phone']);
        $sms->send($phone, $data['message'], 'manual');

        $tenant->decrement('sms_balance');

        return response()->json(['message' => 'SMS gönderildi.', 'remaining' => $tenant->fresh()->sms_balance]);
    }

    public function getPreferences(Request $request)
    {
        $pref = SmsPreference::firstOrCreate(['tenant_id' => $request->user()->tenant_id]);

        return response()->json($pref);
    }

    public function updatePreferences(Request $request)
    {
        $data = $request->validate([
            'maintenance_reminder'  => ['nullable', 'boolean'],
            'maintenance_completed' => ['nullable', 'boolean'],
            'new_fault'             => ['nullable', 'boolean'],
            'fault_resolved'        => ['nullable', 'boolean'],
            'invoice_created'       => ['nullable', 'boolean'],
            'payment_received'      => ['nullable', 'boolean'],
            'tse_expiry'            => ['nullable', 'boolean'],
            'reminder_days_before'  => ['nullable', 'integer', 'min:0', 'max:30'],
        ]);

        $pref = SmsPreference::firstOrCreate(['tenant_id' => $request->user()->tenant_id]);
        $pref->update($data);

        return response()->json($pref->fresh());
    }
}
