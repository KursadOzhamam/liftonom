<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// --- Zamanlanmış görevler (doküman Bölüm 13) ---
Schedule::command('maintenance:create-recurring')->dailyAt('00:01');
Schedule::command('tse:send-warnings')->dailyAt('08:00');
Schedule::command('maintenance:send-reminders')->dailyAt('08:30');
