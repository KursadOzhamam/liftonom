<?php
// app/Models/CashboxTransaction.php

namespace App\Models;

use App\Models\Concerns\HasTenant;
use Illuminate\Database\Eloquent\Model;

class CashboxTransaction extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id', 'cashbox_id', 'type', 'amount', 'balance_after',
        'description', 'source_type', 'source_id', 'transfer_to_id',
        'created_by', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'amount'        => 'decimal:2',
            'balance_after' => 'decimal:2',
            'created_at'    => 'datetime',
        ];
    }
}
