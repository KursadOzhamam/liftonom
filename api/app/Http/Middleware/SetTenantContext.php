<?php
// app/Http/Middleware/SetTenantContext.php

namespace App\Http\Middleware;

use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Kimliği doğrulanmış kullanıcının tenant'ını aktif bağlama yazar.
 * Kaynak doğruluk: token'daki kullanıcının tenant_id'si (v1.1 kararı 26.1).
 * URL'de {tenant} slug varsa, token tenant'ı ile eşleşmek zorundadır.
 */
class SetTenantContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request); // auth middleware zaten 401 verecek
        }

        $tenant = $user->tenant;

        if (! $tenant) {
            abort(403, 'Kullanıcının bağlı olduğu firma bulunamadı.');
        }

        // URL slug'ı varsa token tenant'ı ile eşleşmeli
        $routeSlug = $request->route('tenant');
        if ($routeSlug && $routeSlug !== $tenant->slug) {
            abort(403, 'Firma erişim uyuşmazlığı.');
        }

        if (! $tenant->is_active) {
            abort(403, 'Hesabınız askıya alınmıştır.');
        }

        if ($tenant->plan_expires_at && $tenant->plan_expires_at->isPast()) {
            abort(402, 'Abonelik süreniz dolmuştur. Lütfen planınızı yenileyin.');
        }

        TenantContext::set($tenant);

        return $next($request);
    }
}
