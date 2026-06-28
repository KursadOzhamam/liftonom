<?php
// app/Models/Subscription.php

namespace App\Models;

use App\Models\Concerns\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subscription extends Model
{
    use HasTenant;

    protected $fillable = [
        'tenant_id', 'plan_id', 'status', 'started_at',
        'current_period_end', 'cancel_at_period_end', 'iyzico_subscription_ref',
    ];

    protected function casts(): array
    {
        return [
            'started_at'           => 'datetime',
            'current_period_end'   => 'datetime',
            'cancel_at_period_end' => 'boolean',
        ];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }
}
