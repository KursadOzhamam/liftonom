<?php
// app/Models/Contract.php

namespace App\Models;

use App\Models\Concerns\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Contract extends Model
{
    use HasTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id', 'customer_id', 'contract_number', 'type', 'start_date',
        'end_date', 'monthly_fee', 'auto_renew', 'status', 'elevators',
        'document_url', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'start_date'  => 'date',
            'end_date'    => 'date',
            'monthly_fee' => 'decimal:2',
            'auto_renew'  => 'boolean',
            'elevators'   => 'array',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
