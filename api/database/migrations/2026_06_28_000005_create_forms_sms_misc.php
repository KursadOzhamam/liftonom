<?php
// database/migrations/2026_06_28_000005_create_forms_sms_misc.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ATF — Asansör Talep Formu
        Schema::create('atf_forms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->foreignId('building_id')->nullable()->constrained('buildings')->nullOnDelete();
            $table->jsonb('form_data')->nullable();
            $table->string('status', 50)->default('draft');
            $table->jsonb('attachments')->default('[]');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index('tenant_id');
        });

        // DTR — Durum Tespit Raporu
        Schema::create('dtr_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('elevator_id')->nullable()->constrained('elevators')->nullOnDelete();
            $table->foreignId('technician_id')->nullable()->constrained('users')->nullOnDelete();
            $table->jsonb('checklist_items')->default('[]');
            $table->text('general_note')->nullable();
            $table->jsonb('photos')->default('[]');
            $table->string('signature_url', 500)->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index('tenant_id');
        });

        // Merkezi Döküman/Medya (polymorphic)
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('documentable_type', 100); // Customer|Building|Elevator|Contract...
            $table->unsignedBigInteger('documentable_id');
            $table->string('name')->nullable();
            $table->string('file_url', 500);
            $table->string('mime_type', 100)->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index('tenant_id');
            $table->index(['documentable_type', 'documentable_id']);
        });

        // SMS Geçmişi (log — silinmez)
        Schema::create('sms_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('recipient', 20);
            $table->text('message');
            $table->string('status', 20)->nullable();
            $table->string('provider_id', 100)->nullable();
            $table->string('trigger_type', 100)->nullable();
            $table->integer('cost')->default(1);
            $table->timestamp('sent_at')->useCurrent();
            $table->index('tenant_id');
        });

        // SMS Otomatik Tercihleri
        Schema::create('sms_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->unique()->constrained('tenants')->cascadeOnDelete();
            $table->boolean('maintenance_reminder')->default(true);
            $table->boolean('maintenance_completed')->default(true);
            $table->boolean('new_fault')->default(true);
            $table->boolean('fault_resolved')->default(true);
            $table->boolean('invoice_created')->default(false);
            $table->boolean('payment_received')->default(true);
            $table->boolean('tse_expiry')->default(true);
            $table->integer('reminder_days_before')->default(3);
            $table->timestamps();
        });

        // SMS Paketi Satın Alımları
        Schema::create('sms_purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->integer('quantity');
            $table->decimal('amount', 10, 2)->nullable();
            $table->string('status', 30)->nullable();
            $table->string('iyzico_payment_id', 255)->nullable();
            $table->timestamps();
            $table->index('tenant_id');
        });

        // Bildirimler (uygulama içi)
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->string('type', 100)->nullable();
            $table->string('title')->nullable();
            $table->text('body')->nullable();
            $table->jsonb('data')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('sms_purchases');
        Schema::dropIfExists('sms_preferences');
        Schema::dropIfExists('sms_logs');
        Schema::dropIfExists('documents');
        Schema::dropIfExists('dtr_reports');
        Schema::dropIfExists('atf_forms');
    }
};
