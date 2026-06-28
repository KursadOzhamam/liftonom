<?php
// app/Models/ElevatorOrder.php

namespace App\Models;

use App\Models\Concerns\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ElevatorOrder extends Model
{
    use HasTenant, SoftDeletes;

    public const STATUSES = ['quote', 'approved', 'production', 'shipping', 'installing', 'completed', 'cancelled'];

    protected $fillable = [
        'tenant_id', 'customer_id', 'order_number', 'elevator_type',
        'quantity', 'amount', 'status', 'notes',
    ];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'quantity' => 'integer'];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
