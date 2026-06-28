<?php
// app/Models/AccountTransaction.php

namespace App\Models;

use App\Models\Concerns\HasTenant;
use Illuminate\Database\Eloquent\Model;

class AccountTransaction extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id', 'account_id', 'type', 'amount', 'balance_after',
        'description', 'source_type', 'source_id', 'cashbox_id',
        'payment_method', 'created_by', 'created_at',
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
