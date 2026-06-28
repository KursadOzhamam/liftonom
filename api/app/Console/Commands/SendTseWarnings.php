<?php
// app/Console/Commands/SendTseWarnings.php

namespace App\Console\Commands;

use App\Models\Elevator;
use App\Models\SmsPreference;
use App\Models\Tenant;
use App\Services\Sms\SmsSender;
use App\Support\TenantContext;
use Illuminate\Console\Command;

class SendTseWarnings extends Command
{
    protected $signature = 'tse:send-warnings';
    protected $description = 'TSE muayene vadesi yaklaşan asansörler için SMS uyarısı gönderir';

    public function handle(SmsSender $sms): int
    {
        $sent = 0;
        $in30 = now()->addDays(30)->toDateString();
        $today = now()->toDateString();

        Tenant::where('is_active', true)->each(function (Tenant $tenant) use ($sms, &$sent, $in30, $today) {
            TenantContext::set($tenant);

            $pref = SmsPreference::firstOrCreate(['tenant_id' => $tenant->id]);
            if (! $pref->tse_expiry || $tenant->sms_balance <= 0) {
                TenantContext::clear();
                return;
            }

            Elevator::with('building.customer')
                ->whereNotNull('tse_end_date')
                ->whereBetween('tse_end_date', [$today, $in30])
                ->each(function (Elevator $e) use ($sms, $tenant, &$sent) {
                    $phone = $e->building?->manager_phone ?: $e->building?->customer?->phone;
                    if (! $phone || $tenant->sms_balance <= 0) {
                        return;
                    }
                    $sms->send($phone, "TSE muayene tarihi yaklaşıyor: {$e->name} ({$e->tse_end_date->format('d.m.Y')}). LiftOtonom", 'tse_expiry');
                    $tenant->decrement('sms_balance');
                    $sent++;
                });

            TenantContext::clear();
        });

        $this->info("Gönderilen TSE uyarısı: {$sent}");

        return self::SUCCESS;
    }
}
