<?php
// app/Models/Building.php

namespace App\Models;

use App\Models\Concerns\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Building extends Model
{
    use HasTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id', 'customer_id', 'region_id', 'name', 'address',
        'district', 'city', 'floor_count', 'manager_name', 'manager_phone',
        'latitude', 'longitude', 'notes', 'is_sample',
    ];

    protected function casts(): array
    {
        return [
            'latitude'  => 'decimal:8',
            'longitude' => 'decimal:8',
            'is_sample' => 'boolean',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    public function elevators(): HasMany
    {
        return $this->hasMany(Elevator::class);
    }
}
