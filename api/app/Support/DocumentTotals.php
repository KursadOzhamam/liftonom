<?php
// app/Support/DocumentTotals.php

namespace App\Support;

class DocumentTotals
{
    /**
     * Kalemlerden ara toplam, KDV ve genel toplamı hesaplar.
     * items: [{quantity, unit_price, ...}]
     */
    public static function compute(array $items, float $taxRate = 20, float $discount = 0): array
    {
        $subtotal = 0;
        foreach ($items as $item) {
            $qty   = (float) ($item['quantity'] ?? 1);
            $price = (float) ($item['unit_price'] ?? 0);
            $subtotal += $qty * $price;
        }

        $taxAmount = round(($subtotal - $discount) * $taxRate / 100, 2);
        $total = round($subtotal - $discount + $taxAmount, 2);

        return [
            'subtotal'   => round($subtotal, 2),
            'tax_rate'   => $taxRate,
            'tax_amount' => $taxAmount,
            'discount'   => round($discount, 2),
            'total'      => $total,
        ];
    }
}
