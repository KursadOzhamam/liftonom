<?php
// app/Services/OtpService.php

namespace App\Services;

use App\Models\OtpCode;
use App\Services\Sms\SmsSender;
use Illuminate\Support\Carbon;

class OtpService
{
    public function __construct(private SmsSender $sms) {}

    /**
     * Yeni OTP üretir, kaydeder ve SMS ile gönderir.
     * Dönen kod yalnızca yerel/debug'da çağırana gösterilir.
     */
    public function generate(string $phone, ?int $tenantId = null, string $purpose = 'login'): string
    {
        $length = config('services.otp.length', 6);
        $ttl    = config('services.otp.ttl_minutes', 3);

        // Aynı amaç için bekleyen eski kodları tüket
        OtpCode::where('phone', $phone)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        $code = str_pad((string) random_int(0, (10 ** $length) - 1), $length, '0', STR_PAD_LEFT);

        OtpCode::create([
            'tenant_id'  => $tenantId,
            'phone'      => $phone,
            'code'       => $code,
            'purpose'    => $purpose,
            'attempts'   => 0,
            'expires_at' => Carbon::now()->addMinutes($ttl),
        ]);

        $this->sms->send($phone, "LiftOtonom doğrulama kodunuz: {$code}", 'otp');

        return $code;
    }

    /**
     * OTP doğrular. Başarılıysa tüketir ve true döner.
     * Hata durumunda kullanıcı dostu mesaj fırlatır.
     */
    public function verify(string $phone, string $code, string $purpose = 'login'): OtpCode
    {
        $otp = OtpCode::where('phone', $phone)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->latest('id')
            ->first();

        if (! $otp) {
            abort(422, 'Doğrulama kodu bulunamadı. Lütfen yeni kod isteyin.');
        }

        if ($otp->isExpired()) {
            abort(422, 'Doğrulama kodunun süresi doldu. Lütfen yeni kod isteyin.');
        }

        $max = config('services.otp.max_attempts', 3);
        if ($otp->attempts >= $max) {
            abort(429, 'Çok fazla hatalı deneme. Lütfen yeni kod isteyin.');
        }

        if (! hash_equals($otp->code, $code)) {
            $otp->increment('attempts');
            abort(422, 'Doğrulama kodu hatalı.');
        }

        $otp->update(['consumed_at' => now()]);

        return $otp;
    }
}
