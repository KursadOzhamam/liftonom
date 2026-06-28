<?php
// app/Models/Cashbox.php

namespace App\Models;

use App\Models\Concerns\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Cashbox extends Model
{
    use HasTenant, SoftDeletes;

    protected $fillable = ['tenant_id', 'name', 'type', 'balance', 'currency', 'is_active'];

    protected function casts(): array
    {
        return ['balance' => 'decimal:2', 'is_active' => 'boolean'];
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(CashboxTransaction::class);
    }
}
