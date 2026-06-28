<?php
// app/Http/Controllers/Api/RegisterController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\SmsPreference;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Services\OtpService;
use App\Support\Phone;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class RegisterController extends Controller
{
    public function __construct(private OtpService $otp) {}

    /**
     * Yeni firma + yönetici kaydı. Deneme aboneliği başlatır.
     * Ardından OTP gönderir; doğrulama /auth/verify-otp ile yapılır.
     */
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'         => ['required', 'string', 'max:255'],   // kişi adı
            'surname'      => ['nullable', 'string', 'max:255'],
            'company_name' => ['required', 'string', 'max:255'],
            'phone'        => ['required', 'string'],
            'email'        => ['nullable', 'email', 'max:255'],
            'password'     => ['required', 'string', 'min:6'],
            'plan'         => ['nullable', Rule::in(['trial', 'starter', 'pro', 'enterprise'])],
        ]);

        $phone = Phone::normalize($data['phone']);
        if (! Phone::isValid($phone)) {
            throw ValidationException::withMessages(['phone' => ['Geçerli bir cep telefonu girin.']]);
        }

        $planCode = $data['plan'] ?? 'trial';

        $result = DB::transaction(function () use ($data, $phone, $planCode) {
            $tenant = Tenant::create([
                'name'            => $data['company_name'],
                'slug'            => $this->uniqueSlug($data['company_name']),
                'phone'           => $phone,
                'email'           => $data['email'] ?? null,
                'plan'            => $planCode,
                'plan_expires_at' => now()->addDays(30),
                'sms_balance'     => 100,
                'is_active'       => true,
            ]);

            // tenant bağlamını set et ki HasTenant'lı kayıtlar otomatik tenant_id alsın
            TenantContext::set($tenant);

            $user = User::create([
                'tenant_id' => $tenant->id,
                'name'      => $data['name'],
                'surname'   => $data['surname'] ?? null,
                'phone'     => $phone,
                'email'     => $data['email'] ?? null,
                'password'  => Hash::make($data['password']),
                'role'      => User::ROLE_MANAGER,
                'is_active' => true,
            ]);

            $plan = Plan::where('code', $planCode)->first();
            Subscription::create([
                'tenant_id'          => $tenant->id,
                'plan_id'            => $plan?->id,
                'status'             => 'trialing',
                'started_at'         => now(),
                'current_period_end' => now()->addDays(30),
            ]);

            SmsPreference::create(['tenant_id' => $tenant->id]);

            return compact('tenant', 'user');
        });

        $devCode = $this->otp->generate($phone, $result['tenant']->id, 'login');

        return response()->json([
            'message'      => 'Firma kaydınız oluşturuldu. Doğrulama kodu gönderildi.',
            'requires_otp' => true,
            'phone'        => $phone,
            'tenant'       => [
                'id'   => $result['tenant']->id,
                'name' => $result['tenant']->name,
                'slug' => $result['tenant']->slug,
            ],
            'dev_code'     => config('app.debug') ? $devCode : null,
        ], 201);
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'firma';
        $slug = $base;
        $i = 1;
        while (Tenant::where('slug', $slug)->exists()) {
            $slug = $base . '-' . (++$i);
        }
        return $slug;
    }
}
