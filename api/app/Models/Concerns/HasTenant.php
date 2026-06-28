<?php
// app/Models/Concerns/HasTenant.php

namespace App\Models\Concerns;

use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Multi-tenant izolasyonu: bu trait'i kullanan her model
 * - okumalarda otomatik `tenant_id = <aktif tenant>` filtreler
 * - yeni kayıtlarda tenant_id'yi otomatik atar
 *
 * Aktif tenant kaynağı (öncelik sırası):
 *   1) TenantContext (middleware / job / seeder tarafından açıkça set edilir)
 *   2) auth()->user()->tenant_id  (HTTP'de Sanctum auth, route-model binding'den
 *      ÖNCE çalıştığı için binding sırasında da güvenli izolasyon sağlar)
 */
trait HasTenant
{
    protected static function bootHasTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $query) {
            $tenantId = static::resolveTenantId();
            if ($tenantId !== null) {
                $query->where($query->getModel()->getTable() . '.tenant_id', $tenantId);
            }
        });

        static::creating(function (Model $model) {
            if (empty($model->tenant_id)) {
                $tenantId = static::resolveTenantId();
                if ($tenantId !== null) {
                    $model->tenant_id = $tenantId;
                }
            }
        });
    }

    protected static function resolveTenantId(): ?int
    {
        if (TenantContext::id() !== null) {
            return TenantContext::id();
        }

        $user = auth()->user();

        return $user?->tenant_id;
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Tenant::class);
    }

    /** Tenant scope'unu bilinçli olarak devre dışı bırakmak için (örn. süper admin). */
    public function scopeWithoutTenant(Builder $query): Builder
    {
        return $query->withoutGlobalScope('tenant');
    }
}
