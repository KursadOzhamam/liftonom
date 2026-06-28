<?php
// app/Models/Invoice.php

namespace App\Models;

use App\Models\Concerns\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Invoice extends Model
{
    use HasTenant, SoftDeletes;

    public const STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];

    protected $fillable = [
        'tenant_id', 'customer_id', 'invoice_number', 'type', 'status',
        'issue_date', 'due_date', 'items', 'subtotal', 'tax_rate', 'tax_amount',
        'discount', 'total', 'paid_amount', 'notes', 'source_type', 'source_id', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'issue_date'  => 'date',
            'due_date'    => 'date',
            'items'       => 'array',
            'subtotal'    => 'decimal:2',
            'tax_rate'    => 'decimal:2',
            'tax_amount'  => 'decimal:2',
            'discount'    => 'decimal:2',
            'total'       => 'decimal:2',
            'paid_amount' => 'decimal:2',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
