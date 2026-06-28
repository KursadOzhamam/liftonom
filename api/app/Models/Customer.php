<?php
// app/Models/Customer.php

namespace App\Models;

use App\Models\Concerns\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use HasTenant, SoftDeletes;

    public const TYPE_INDIVIDUAL = 'individual';
    public const TYPE_CORPORATE  = 'corporate';

    protected $fillable = [
        'tenant_id', 'type', 'name', 'tax_number', 'tax_office', 'id_number',
        'phone', 'email', 'address', 'district', 'city', 'region_id',
        'notes', 'is_active', 'is_sample',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'is_sample' => 'boolean',
        ];
    }

    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    public function buildings(): HasMany
    {
        return $this->hasMany(Building::class);
    }

    public function currentAccount()
    {
        return $this->hasOne(CurrentAccount::class);
    }
}
