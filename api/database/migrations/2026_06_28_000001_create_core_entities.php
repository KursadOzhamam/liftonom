<?php
// database/migrations/2026_06_28_000001_create_core_entities.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Bölgeler
        Schema::create('regions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('name');
            $table->string('code', 50)->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index('tenant_id');
        });

        // Bölge ↔ Personel (M:N) — bir bölgede çok teknisyen
        Schema::create('region_user', function (Blueprint $table) {
            $table->foreignId('region_id')->constrained('regions')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->boolean('is_primary')->default(false); // bölge sorumlusu
            $table->primary(['region_id', 'user_id']);
        });

        // Çoklu cihaz push token
        Schema::create('user_devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('fcm_token', 500);
            $table->string('platform', 20)->nullable(); // ios|android|web
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'fcm_token']);
        });

        // Müşteriler
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('type', 20)->default('corporate'); // individual|corporate
            $table->string('name');
            $table->string('tax_number', 20)->nullable();
            $table->string('tax_office', 100)->nullable();
            $table->string('id_number', 20)->nullable();       // TCKN
            $table->string('phone', 20)->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->string('district', 100)->nullable();
            $table->string('city', 100)->nullable();
            $table->foreignId('region_id')->nullable()->constrained('regions')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_sample')->default(false);
            $table->timestamps();
            $table->softDeletes();
            $table->index('tenant_id');
        });

        // Binalar
        Schema::create('buildings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->foreignId('region_id')->nullable()->constrained('regions')->nullOnDelete();
            $table->string('name');
            $table->text('address')->nullable();
            $table->string('district', 100)->nullable();
            $table->string('city', 100)->nullable();
            $table->integer('floor_count')->nullable();
            $table->string('manager_name')->nullable();
            $table->string('manager_phone', 20)->nullable();
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_sample')->default(false);
            $table->timestamps();
            $table->softDeletes();
            $table->index('tenant_id');
            $table->index('customer_id');
        });

        // Asansörler
        Schema::create('elevators', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('building_id')->nullable()->constrained('buildings')->nullOnDelete();
            $table->string('code', 100)->nullable();
            $table->string('name')->nullable();
            $table->string('type', 50)->nullable();        // hydraulic|electric|escalator
            $table->string('brand', 100)->nullable();
            $table->string('model', 100)->nullable();
            $table->integer('capacity_kg')->nullable();
            $table->decimal('speed', 4, 2)->nullable();
            $table->integer('floor_count')->nullable();
            $table->integer('stop_count')->nullable();
            $table->integer('production_year')->nullable();
            $table->string('serial_number', 100)->nullable();
            $table->string('tse_certificate_no', 100)->nullable();
            $table->date('tse_start_date')->nullable();
            $table->date('tse_end_date')->nullable();
            $table->string('tse_document_url', 500)->nullable();
            $table->string('status', 50)->default('active'); // active|passive|faulty
            $table->timestamp('last_maintenance_at')->nullable();
            $table->timestamp('next_maintenance_at')->nullable();
            $table->integer('maintenance_period')->default(30); // gün
            $table->string('qr_token', 100)->nullable()->unique();
            $table->text('notes')->nullable();
            $table->boolean('is_sample')->default(false);
            $table->timestamps();
            $table->softDeletes();
            $table->index('tenant_id');
            $table->index('tse_end_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('elevators');
        Schema::dropIfExists('buildings');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('user_devices');
        Schema::dropIfExists('region_user');
        Schema::dropIfExists('regions');
    }
};
