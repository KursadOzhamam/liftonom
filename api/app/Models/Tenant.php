<?php
// app/Models/Tenant.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tenant extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name', 'slug', 'phone', 'email', 'address', 'tax_number', 'tax_office',
        'logo_url', 'plan', 'plan_expires_at', 'sms_balance', 'is_active', 'settings',
    ];

    protected function casts(): array
    {
        return [
            'plan_expires_at' => 'datetime',
            'sms_balance'     => 'integer',
            'is_active'       => 'boolean',
            'settings'        => 'array',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function subscription(): HasMany
    {
        return $this->hasMany(\App\Models\Subscription::class);
    }

    public function isActive(): bool
    {
        return $this->is_active && (
            $this->plan_expires_at === null || $this->plan_expires_at->isFuture()
        );
    }
}
