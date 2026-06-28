<?php
// database/migrations/2026_06_28_000006_create_saas_kvkk_auth.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Abonelikler
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('plan_id')->nullable()->constrained('plans')->nullOnDelete();
            $table->string('status', 30)->default('trialing'); // trialing|active|past_due|cancelled|expired
            $table->timestamp('started_at')->nullable();
            $table->timestamp('current_period_end')->nullable();
            $table->boolean('cancel_at_period_end')->default(false);
            $table->string('iyzico_subscription_ref', 255)->nullable();
            $table->timestamps();
            $table->index('tenant_id');
        });

        // Abonelik Ödemeleri (iyzico)
        Schema::create('subscription_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('subscription_id')->nullable()->constrained('subscriptions')->nullOnDelete();
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('TRY');
            $table->string('status', 30); // success|failed|pending|refunded
            $table->string('iyzico_payment_id', 255)->nullable();
            $table->jsonb('raw_response')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            $table->index('tenant_id');
        });

        // KVKK Rıza Kayıtları
        Schema::create('consents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('subject_type', 50); // customer|user|portal
            $table->unsignedBigInteger('subject_id');
            $table->string('consent_type', 50); // kvkk_aydinlatma|sms_ticari|...
            $table->boolean('granted')->default(false);
            $table->string('ip', 64)->nullable();
            $table->timestamp('granted_at')->useCurrent();
            $table->index(['tenant_id', 'subject_type', 'subject_id']);
        });

        // Müşteri Portalı Hesapları (müşteri telefon+şifre girişi)
        Schema::create('customer_portal_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->string('phone', 20);
            $table->string('password')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();
            $table->unique(['tenant_id', 'phone']);
        });

        // SMS OTP kodları (giriş/kayıt doğrulaması)
        Schema::create('otp_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->string('phone', 20);
            $table->string('code', 10);
            $table->string('purpose', 30)->default('login'); // login|register|reset
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index('phone');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('otp_codes');
        Schema::dropIfExists('customer_portal_accounts');
        Schema::dropIfExists('consents');
        Schema::dropIfExists('subscription_payments');
        Schema::dropIfExists('subscriptions');
    }
};
