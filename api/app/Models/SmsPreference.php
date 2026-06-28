<?php
// app/Models/SmsPreference.php

namespace App\Models;

use App\Models\Concerns\HasTenant;
use Illuminate\Database\Eloquent\Model;

class SmsPreference extends Model
{
    use HasTenant;

    protected $fillable = [
        'tenant_id', 'maintenance_reminder', 'maintenance_completed',
        'new_fault', 'fault_resolved', 'invoice_created',
        'payment_received', 'tse_expiry', 'reminder_days_before',
    ];

    protected function casts(): array
    {
        return [
            'maintenance_reminder'  => 'boolean',
            'maintenance_completed' => 'boolean',
            'new_fault'             => 'boolean',
            'fault_resolved'        => 'boolean',
            'invoice_created'       => 'boolean',
            'payment_received'      => 'boolean',
            'tse_expiry'            => 'boolean',
            'reminder_days_before'  => 'integer',
        ];
    }
}
