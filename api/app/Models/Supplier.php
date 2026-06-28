<?php
// app/Models/Supplier.php

namespace App\Models;

use App\Models\Concerns\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Supplier extends Model
{
    use HasTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id', 'name', 'phone', 'email', 'tax_number',
        'address', 'notes', 'is_active',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }
}
