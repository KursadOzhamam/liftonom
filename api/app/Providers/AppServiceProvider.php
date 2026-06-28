<?php

namespace App\Providers;

use App\Services\Sms\LogSmsSender;
use App\Services\Sms\NetgsmSmsSender;
use App\Services\Sms\SmsSender;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // SMS sürücüsünü config'e göre seç (yerel: log, prod: netgsm)
        $this->app->singleton(SmsSender::class, function () {
            return config('services.sms.driver') === 'netgsm'
                ? new NetgsmSmsSender()
                : new LogSmsSender();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
