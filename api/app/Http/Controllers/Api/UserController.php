<?php
// app/Http/Controllers/Api/UserController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Sms\SmsSender;
use App\Support\Phone;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request)
    {
        // Aktif tenant kullanıcıları (User HasTenant kullanmadığı için manuel filtre)
        $q = User::where('tenant_id', $request->user()->tenant_id);

        if ($search = $request->string('search')->trim()->value()) {
            $q->where(fn ($w) => $w->where('name', 'ilike', "%{$search}%")
                ->orWhere('surname', 'ilike', "%{$search}%")
                ->orWhere('phone', 'ilike', "%{$search}%"));
        }
        if ($request->filled('role')) {
            $q->where('role', $request->string('role'));
        }

        return $q->orderBy('name')->paginate(min((int) $request->integer('per_page', 25), 100));
    }

    public function store(Request $request, SmsSender $sms)
    {
        $data = $request->validate([
            'name'      => ['required', 'string', 'max:255'],
            'surname'   => ['nullable', 'string', 'max:255'],
            'phone'     => ['required', 'string'],
            'email'     => ['nullable', 'email', 'max:255'],
            'role'      => ['required', Rule::in(['manager', 'office', 'technician', 'accounting', 'viewer'])],
            'region_id' => ['nullable', 'integer', 'exists:regions,id'],
            'password'  => ['nullable', 'string', 'min:6'],
        ]);

        $phone = Phone::normalize($data['phone']);
        $tenantId = $request->user()->tenant_id;

        // Firma içinde telefon benzersiz mi?
        $exists = User::where('tenant_id', $tenantId)->where('phone', $phone)->exists();
        abort_if($exists, 422, 'Bu telefon firmada zaten kayıtlı.');

        $plainPassword = $data['password'] ?? Str::random(8);

        $user = User::create([
            'tenant_id' => $tenantId,
            'name'      => $data['name'],
            'surname'   => $data['surname'] ?? null,
            'phone'     => $phone,
            'email'     => $data['email'] ?? null,
            'role'      => $data['role'],
            'region_id' => $data['region_id'] ?? null,
            'password'  => Hash::make($plainPassword),
            'is_active' => true,
        ]);

        // Şifreyi SMS ile bildir
        $sms->send($phone, "LiftOtonom hesabınız oluşturuldu. Şifreniz: {$plainPassword}", 'staff_invite');

        return response()->json($user->fresh(), 201);
    }

    public function show(Request $request, User $user)
    {
        $this->authorizeSameTenant($request, $user);

        return $user;
    }

    public function update(Request $request, User $user)
    {
        $this->authorizeSameTenant($request, $user);

        $data = $request->validate([
            'name'      => ['sometimes', 'string', 'max:255'],
            'surname'   => ['nullable', 'string', 'max:255'],
            'email'     => ['nullable', 'email', 'max:255'],
            'role'      => ['sometimes', Rule::in(['manager', 'office', 'technician', 'accounting', 'viewer'])],
            'region_id' => ['nullable', 'integer', 'exists:regions,id'],
            'is_active' => ['nullable', 'boolean'],
            'password'  => ['nullable', 'string', 'min:6'],
        ]);

        if (! empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $user->update($data);

        return $user->fresh();
    }

    public function destroy(Request $request, User $user)
    {
        $this->authorizeSameTenant($request, $user);
        abort_if($user->id === $request->user()->id, 422, 'Kendinizi silemezsiniz.');

        $user->delete();

        return response()->json(['message' => 'Personel silindi.']);
    }

    private function authorizeSameTenant(Request $request, User $user): void
    {
        abort_if($user->tenant_id !== $request->user()->tenant_id, 404);
    }
}
