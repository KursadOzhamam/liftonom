<?php
// database/migrations/0000_01_01_000000_create_tenants_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug', 100)->unique();
            $table->string('phone', 20)->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->string('tax_number', 20)->nullable();
            $table->string('tax_office', 100)->nullable();
            $table->string('logo_url', 500)->nullable();
            $table->string('plan', 50)->default('trial');
            $table->timestamp('plan_expires_at')->nullable();
            $table->integer('sms_balance')->default(100);
            $table->boolean('is_active')->default(true);
            $table->jsonb('settings')->default('{}');
            $table->timestamps();
            $table->softDeletes();
        });

        // Süper admin (platform sahibi) — tenant'a bağlı DEĞİL, ayrı guard
        Schema::create('platform_admins', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->string('email')->unique();
            $table->string('password');
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_login_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        // SaaS planları (global)
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();       // trial|starter|pro|enterprise
            $table->string('name', 100);
            $table->decimal('monthly_price', 10, 2)->default(0);
            $table->integer('max_users')->nullable();    // null = sınırsız
            $table->integer('max_elevators')->nullable();
            $table->integer('sms_quota')->nullable();
            $table->jsonb('features')->default('{}');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
        Schema::dropIfExists('platform_admins');
        Schema::dropIfExists('tenants');
    }
};
