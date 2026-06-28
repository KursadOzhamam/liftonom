<?php
// app/Support/TenantContext.php

namespace App\Support;

use App\Models\Tenant;

/**
 * İstek yaşam döngüsü boyunca aktif tenant'ı tutan basit bağlam.
 * Middleware tarafından set edilir, HasTenant trait tarafından okunur.
 */
class TenantContext
{
    protected static ?Tenant $tenant = null;
    protected static ?int $tenantId = null;

    public static function set(Tenant $tenant): void
    {
        static::$tenant = $tenant;
        static::$tenantId = $tenant->id;
    }

    public static function setId(?int $id): void
    {
        static::$tenantId = $id;
    }

    public static function tenant(): ?Tenant
    {
        return static::$tenant;
    }

    public static function id(): ?int
    {
        return static::$tenantId;
    }

    public static function check(): bool
    {
        return static::$tenantId !== null;
    }

    public static function clear(): void
    {
        static::$tenant = null;
        static::$tenantId = null;
    }
}
