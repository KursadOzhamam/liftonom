<?php
// app/Services/Sms/SmsSender.php

namespace App\Services\Sms;

interface SmsSender
{
    /**
     * SMS gönderir. Sağlayıcı mesaj ID'si (varsa) döner.
     */
    public function send(string $phone, string $message, ?string $triggerType = null): ?string;
}
