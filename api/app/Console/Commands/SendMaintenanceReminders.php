<?php
// app/Console/Commands/SendMaintenanceReminders.php

namespace App\Console\Commands;

use App\Models\MaintenanceRecord;
use App\Models\SmsPreference;
use App\Models\Tenant;
use App\Services\Sms\SmsSender;
use App\Support\TenantContext;
use Illuminate\Console\Command;

class SendMaintenanceReminders extends Command
{
    protected $signature = 'maintenance:send-reminders';
    protected $description = 'Yaklaşan planlı bakımlar için müşteriye SMS hatırlatması gönderir';

    public function handle(SmsSender $sms): int
    {
        $sent = 0;

        Tenant::where('is_active', true)->each(function (Tenant $tenant) use ($sms, &$sent) {
            TenantContext::set($tenant);

            $pref = SmsPreference::firstOrCreate(['tenant_id' => $tenant->id]);
            if (! $pref->maintenance_reminder || $tenant->sms_balance <= 0) {
                TenantContext::clear();
                return;
            }

            $target = now()->addDays($pref->reminder_days_before)->toDateString();

            MaintenanceRecord::with('elevator.building.customer')
                ->where('status', 'pending')
                ->whereDate('planned_date', $target)
                ->each(function (MaintenanceRecord $m) use ($sms, $tenant, &$sent) {
                    $phone = $m->elevator?->building?->customer?->phone;
                    if (! $phone || $tenant->sms_balance <= 0) {
                        return;
                    }
                    $sms->send($phone, "Bakım hatırlatması: {$m->elevator->name} için {$m->planned_date->format('d.m.Y')} tarihinde bakım planlandı. LiftOtonom", 'maintenance_reminder');
                    $tenant->decrement('sms_balance');
                    $sent++;
                });

            TenantContext::clear();
        });

        $this->info("Gönderilen bakım hatırlatması: {$sent}");

        return self::SUCCESS;
    }
}
