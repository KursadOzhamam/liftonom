<?php
// app/Support/Phone.php

namespace App\Support;

class Phone
{
    /**
     * Türk telefon numarasını E.164 formatına çevirir: +90XXXXXXXXXX
     * Kabul edilen girişler: 05431234567, 5431234567, +905431234567,
     * "543 123 45 67", "0543 123 4567" vb.
     */
    public static function normalize(string $input): string
    {
        $digits = preg_replace('/\D/', '', $input);

        if (str_starts_with($digits, '90') && strlen($digits) === 12) {
            $digits = substr($digits, 2);
        } elseif (str_starts_with($digits, '0') && strlen($digits) === 11) {
            $digits = substr($digits, 1);
        }

        return '+90' . $digits;
    }

    /** Geçerli bir Türk cep numarası mı (10 hane, 5 ile başlar). */
    public static function isValid(string $input): bool
    {
        $e164 = static::normalize($input);
        return (bool) preg_match('/^\+905\d{9}$/', $e164);
    }
}
