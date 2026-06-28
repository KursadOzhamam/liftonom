<?php
// app/Models/Plan.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    protected $fillable = [
        'code', 'name', 'monthly_price', 'max_users', 'max_elevators',
        'sms_quota', 'features', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'monthly_price' => 'decimal:2',
            'features'      => 'array',
            'is_active'     => 'boolean',
        ];
    }
}
