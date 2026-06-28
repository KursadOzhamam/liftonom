<?php
// app/Http/Middleware/EnsureRole.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Rol bazlı erişim. Kullanım: ->middleware('role:manager,office')
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! in_array($user->role, $roles, true)) {
            abort(403, 'Bu işlem için yetkiniz bulunmuyor.');
        }

        return $next($request);
    }
}
