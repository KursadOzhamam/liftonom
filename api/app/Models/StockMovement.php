<?php
// app/Models/StockMovement.php

namespace App\Models;

use App\Models\Concerns\HasTenant;
use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id', 'product_id', 'type', 'quantity', 'unit_price',
        'total_price', 'reference_type', 'reference_id', 'note', 'created_by', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'quantity'    => 'decimal:2',
            'unit_price'  => 'decimal:2',
            'total_price' => 'decimal:2',
            'created_at'  => 'datetime',
        ];
    }
}
