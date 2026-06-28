<?php
// app/Http/Controllers/Api/AuthController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\OtpService;
use App\Support\Phone;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private OtpService $otp) {}

    /**
     * 1. Adım: telefon + şifre doğrula, OTP gönder.
     * Aynı telefon birden çok firmada varsa firma seçimi istenir.
     */
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone'     => ['required', 'string'],
            'password'  => ['required', 'string'],
            'tenant_id' => ['nullable', 'integer'],
        ]);

        $phone = Phone::normalize($data['phone']);

        $candidates = User::withoutGlobalScopes()
            ->where('phone', $phone)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->get()
            ->filter(fn (User $u) => Hash::check($data['password'], $u->password));

        if (! empty($data['tenant_id'])) {
            $candidates = $candidates->where('tenant_id', $data['tenant_id']);
        }

        if ($candidates->isEmpty()) {
            throw ValidationException::withMessages([
                'phone' => ['Telefon veya şifre hatalı.'],
            ]);
        }

        // Birden çok firmada eşleşme → firma seçimi gerek
        if ($candidates->count() > 1) {
            $tenants = $candidates->map(fn (User $u) => [
                'tenant_id' => $u->tenant_id,
                'name'      => $u->tenant->name,
            ])->values();

            return response()->json([
                'requires_tenant' => true,
                'message'         => 'Bu telefon birden çok firmada kayıtlı. Lütfen firma seçin.',
                'tenants'         => $tenants,
            ], 409);
        }

        $user = $candidates->first();

        $devCode = $this->otp->generate($phone, $user->tenant_id, 'login');

        return response()->json([
            'requires_otp' => true,
            'message'      => 'Doğrulama kodu telefonunuza gönderildi.',
            'phone'        => $phone,
            // Yalnızca yerel/debug ortamında test kolaylığı için:
            'dev_code'     => config('app.debug') ? $devCode : null,
        ]);
    }

    /**
     * 2. Adım: OTP doğrula, Sanctum token üret.
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string'],
            'code'  => ['required', 'string'],
        ]);

        $phone = Phone::normalize($data['phone']);
        $otp = $this->otp->verify($phone, $data['code'], 'login');

        $user = User::withoutGlobalScopes()
            ->where('phone', $phone)
            ->where('tenant_id', $otp->tenant_id)
            ->where('is_active', true)
            ->firstOrFail();

        $user->forceFill(['last_login_at' => now()])->save();

        $token = $user->createToken('auth')->plainTextToken;

        TenantContext::set($user->tenant);

        return response()->json([
            'token' => $token,
            'user'  => $this->userPayload($user),
            'tenant' => [
                'id'   => $user->tenant->id,
                'name' => $user->tenant->name,
                'slug' => $user->tenant->slug,
                'plan' => $user->tenant->plan,
            ],
        ]);
    }

    /** Tekrar kod gönder. */
    public function resendOtp(Request $request): JsonResponse
    {
        $data = $request->validate(['phone' => ['required', 'string']]);
        $phone = Phone::normalize($data['phone']);

        $user = User::withoutGlobalScopes()
            ->where('phone', $phone)->where('is_active', true)->first();

        if (! $user) {
            throw ValidationException::withMessages(['phone' => ['Kullanıcı bulunamadı.']]);
        }

        $devCode = $this->otp->generate($phone, $user->tenant_id, 'login');

        return response()->json([
            'message'  => 'Yeni doğrulama kodu gönderildi.',
            'dev_code' => config('app.debug') ? $devCode : null,
        ]);
    }

    /** Oturum kullanıcısı. */
    public function me(Request $request): JsonResponse
    {
        return response()->json($this->userPayload($request->user()));
    }

    /** Çıkış — mevcut token'ı iptal et. */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Çıkış yapıldı.']);
    }

    private function userPayload(User $user): array
    {
        return [
            'id'      => $user->id,
            'name'    => $user->name,
            'surname' => $user->surname,
            'phone'   => $user->phone,
            'email'   => $user->email,
            'role'    => $user->role,
        ];
    }
}
