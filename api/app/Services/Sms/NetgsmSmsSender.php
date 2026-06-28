<?php
// app/Services/Sms/NetgsmSmsSender.php

namespace App\Services\Sms;

use App\Models\SmsLog;
use App\Support\TenantContext;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * netgsm üzerinden gerçek SMS gönderimi (prod).
 * Kimlik bilgileri config/services.php -> sms.netgsm.
 */
class NetgsmSmsSender implements SmsSender
{
    public function send(string $phone, string $message, ?string $triggerType = null): ?string
    {
        $cfg = config('services.sms.netgsm');

        // netgsm telefonu 5XXXXXXXXX bekler (başında 0/+90 olmadan)
        $gsm = preg_replace('/\D/', '', $phone);
        $gsm = preg_replace('/^(90)/', '', $gsm);
        $gsm = ltrim($gsm, '0');

        $status = 'failed';
        $providerId = null;

        try {
            $response = Http::asForm()->post('https://api.netgsm.com.tr/sms/send/get', [
                'usercode' => $cfg['user'],
                'password' => $cfg['password'],
                'gsmno'    => $gsm,
                'message'  => $message,
                'msgheader' => $cfg['msgheader'],
            ]);

            $body = trim($response->body());
            // netgsm başarıda "00 <id>" veya "01 <id>" döner
            if (preg_match('/^0[0-1]\s+(\d+)/', $body, $m)) {
                $status = 'sent';
                $providerId = $m[1];
            } else {
                Log::warning("[SMS:netgsm] beklenmeyen yanıt: {$body}");
            }
        } catch (\Throwable $e) {
            Log::error('[SMS:netgsm] hata: ' . $e->getMessage());
        }

        if (TenantContext::id() !== null) {
            SmsLog::create([
                'tenant_id'    => TenantContext::id(),
                'recipient'    => $phone,
                'message'      => $message,
                'status'       => $status,
                'provider_id'  => $providerId,
                'trigger_type' => $triggerType,
                'cost'         => 1,
            ]);
        }

        return $providerId;
    }
}
