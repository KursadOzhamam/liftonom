<?php
// app/Models/Quote.php

namespace App\Models;

use App\Models\Concerns\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Quote extends Model
{
    use HasTenant, SoftDeletes;

    public const STATUSES = ['draft', 'sent', 'viewed', 'approved', 'rejected'];

    protected $fillable = [
        'tenant_id', 'customer_id', 'quote_number', 'status', 'valid_until',
        'items', 'subtotal', 'tax_rate', 'tax_amount', 'discount', 'total',
        'notes', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'valid_until' => 'date',
            'items'       => 'array',
            'subtotal'    => 'decimal:2',
            'tax_rate'    => 'decimal:2',
            'tax_amount'  => 'decimal:2',
            'discount'    => 'decimal:2',
            'total'       => 'decimal:2',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
