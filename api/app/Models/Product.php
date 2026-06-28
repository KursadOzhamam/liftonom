<?php
// app/Models/Product.php

namespace App\Models;

use App\Models\Concerns\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id', 'supplier_id', 'code', 'name', 'category', 'unit',
        'stock_quantity', 'min_stock', 'unit_price', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'stock_quantity' => 'decimal:2',
            'min_stock'      => 'decimal:2',
            'unit_price'     => 'decimal:2',
            'is_active'      => 'boolean',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }
}
