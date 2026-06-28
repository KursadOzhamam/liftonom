<?php
// database/seeders/DatabaseSeeder.php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1) SaaS Planları (global)
        $plans = [
            ['code' => 'trial',      'name' => 'Deneme',     'monthly_price' => 0,    'max_users' => 2,    'max_elevators' => 20,   'sms_quota' => 100],
            ['code' => 'starter',    'name' => 'Başlangıç',  'monthly_price' => 499,  'max_users' => 5,    'max_elevators' => 50,   'sms_quota' => 500],
            ['code' => 'pro',        'name' => 'Pro',        'monthly_price' => 999,  'max_users' => 15,   'max_elevators' => 250,  'sms_quota' => 2000],
            ['code' => 'enterprise', 'name' => 'Kurumsal',   'monthly_price' => 0,    'max_users' => null, 'max_elevators' => null, 'sms_quota' => null],
        ];
        foreach ($plans as $p) {
            Plan::updateOrCreate(['code' => $p['code']], $p);
        }

        // 2) Demo firma (tenant)
        $tenant = Tenant::updateOrCreate(
            ['slug' => 'demo'],
            [
                'name'            => 'Demo Asansör Servis',
                'phone'           => '+905001112233',
                'email'           => 'info@demo.test',
                'plan'            => 'trial',
                'plan_expires_at' => now()->addDays(30),
                'sms_balance'     => 100,
                'is_active'       => true,
            ]
        );

        // 3) Yönetici kullanıcı
        User::updateOrCreate(
            ['tenant_id' => $tenant->id, 'phone' => '+905431234567'],
            [
                'name'      => 'Kürşad',
                'surname'   => 'Gökçe',
                'email'     => 'admin@demo.test',
                'password'  => Hash::make('123456'),
                'role'      => User::ROLE_MANAGER,
                'is_active' => true,
            ]
        );

        // 4) HasTenant trait doğrulaması: bağlamı set et, müşteri ekle,
        //    tenant_id otomatik atanmalı.
        TenantContext::set($tenant);

        Customer::updateOrCreate(
            ['tenant_id' => $tenant->id, 'name' => 'Örnek Müşteri (Demo)'],
            [
                'type'      => Customer::TYPE_CORPORATE,
                'phone'     => '+905339998877',
                'city'      => 'İstanbul',
                'is_sample' => true,
            ]
        );

        TenantContext::clear();
    }
}
