<?php
// app/Services/Sms/LogSmsSender.php

namespace App\Services\Sms;

use App\Models\SmsLog;
use App\Support\TenantContext;
use Illuminate\Support\Facades\Log;

/**
 * Yerel/geliştirme SMS sürücüsü: gerçekten göndermez, log'a yazar ve
 * sms_logs tablosuna kaydeder. OTP kodları terminalde görünür.
 */
class LogSmsSender implements SmsSender
{
    public function send(string $phone, string $message, ?string $triggerType = null): ?string
    {
        Log::info("[SMS:log] -> {$phone}: {$message}");

        if (TenantContext::id() !== null) {
            SmsLog::create([
                'tenant_id'    => TenantContext::id(),
                'recipient'    => $phone,
                'message'      => $message,
                'status'       => 'logged',
                'trigger_type' => $triggerType,
                'cost'         => 0,
            ]);
        }

        return 'log-' . uniqid();
    }
}
