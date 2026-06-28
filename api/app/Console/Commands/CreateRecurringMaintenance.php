<?php
// app/Console/Commands/CreateRecurringMaintenance.php

namespace App\Console\Commands;

use App\Models\MaintenanceRecord;
use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Console\Command;

class CreateRecurringMaintenance extends Command
{
    protected $signature = 'maintenance:create-recurring';
    protected $description = 'Tekrarlayan bakımların bir sonraki örneğini oluşturur';

    private array $periodDays = [
        'weekly' => 7, 'monthly' => 30, '3monthly' => 90, '6monthly' => 180, 'annual' => 365,
    ];

    public function handle(): int
    {
        $created = 0;

        Tenant::where('is_active', true)->each(function (Tenant $tenant) use (&$created) {
            TenantContext::set($tenant);

            // Tamamlanmış, tekrarlayan bakımlar
            MaintenanceRecord::where('is_recurring', true)
                ->where('status', 'completed')
                ->whereNotNull('recurring_period')
                ->get()
                ->each(function (MaintenanceRecord $m) use (&$created) {
                    $hasChild = MaintenanceRecord::where('parent_id', $m->id)->exists();
                    if ($hasChild) {
                        return;
                    }
                    $days = $this->periodDays[$m->recurring_period] ?? 30;
                    MaintenanceRecord::create([
                        'elevator_id'      => $m->elevator_id,
                        'type'             => $m->type,
                        'planned_date'     => ($m->completed_at ?? now())->copy()->addDays($days),
                        'status'           => 'pending',
                        'assigned_users'   => $m->assigned_users,
                        'is_recurring'     => true,
                        'recurring_period' => $m->recurring_period,
                        'parent_id'        => $m->id,
                    ]);
                    $created++;
                });

            TenantContext::clear();
        });

        $this->info("Oluşturulan tekrarlayan bakım: {$created}");

        return self::SUCCESS;
    }
}
