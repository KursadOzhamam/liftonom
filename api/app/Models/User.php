<?php
// app/Models/User.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    // Roller
    public const ROLE_MANAGER    = 'manager';
    public const ROLE_OFFICE     = 'office';
    public const ROLE_TECHNICIAN = 'technician';
    public const ROLE_ACCOUNTING = 'accounting';
    public const ROLE_VIEWER     = 'viewer';

    protected $fillable = [
        'tenant_id', 'name', 'surname', 'phone', 'email', 'password',
        'role', 'region_id', 'avatar_url', 'is_active', 'last_login_at',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at'     => 'datetime',
            'password'          => 'hashed',
            'is_active'         => 'boolean',
        ];
    }

    // NOT: User'a HasTenant global scope UYGULANMAZ — giriş sırasında
    // telefon firmalar arası aranır, tenant kullanıcıdan sonra belirlenir.

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function regions()
    {
        return $this->belongsToMany(Region::class, 'region_user')
            ->withPivot('is_primary');
    }

    public function isManager(): bool
    {
        return $this->role === self::ROLE_MANAGER;
    }

    public function hasRole(string ...$roles): bool
    {
        return in_array($this->role, $roles, true);
    }
}
