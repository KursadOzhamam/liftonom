<?php
// database/migrations/2026_06_28_000003_create_finance.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Cari Hesaplar
        Schema::create('current_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->decimal('balance', 12, 2)->default(0);
            $table->timestamps();
            $table->softDeletes();
            $table->index('tenant_id');
        });

        // Kasalar
        Schema::create('cashboxes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('name');
            $table->string('type', 20)->default('cash'); // cash|bank
            $table->decimal('balance', 12, 2)->default(0);
            $table->string('currency', 3)->default('TRY');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            $table->index('tenant_id');
        });

        // Cari Hareketleri (ledger — silinmez)
        Schema::create('account_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('account_id')->constrained('current_accounts')->cascadeOnDelete();
            $table->string('type', 20);                  // debit|credit
            $table->decimal('amount', 12, 2);
            $table->decimal('balance_after', 12, 2)->nullable();
            $table->string('description', 500)->nullable();
            $table->string('source_type', 50)->nullable(); // invoice|collection|manual
            $table->unsignedBigInteger('source_id')->nullable();
            $table->foreignId('cashbox_id')->nullable()->constrained('cashboxes')->nullOnDelete();
            $table->string('payment_method', 50)->nullable(); // cash|card|transfer|check
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->index('tenant_id');
        });

        // Kasa Hareketleri (ledger — silinmez)
        Schema::create('cashbox_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('cashbox_id')->constrained('cashboxes')->cascadeOnDelete();
            $table->string('type', 20);                  // in|out|transfer
            $table->decimal('amount', 12, 2);
            $table->decimal('balance_after', 12, 2)->nullable();
            $table->string('description', 500)->nullable();
            $table->string('source_type', 50)->nullable();
            $table->unsignedBigInteger('source_id')->nullable();
            $table->foreignId('transfer_to_id')->nullable()->constrained('cashboxes')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->index('tenant_id');
        });

        // Teklifler
        Schema::create('quotes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('quote_number', 50)->nullable();
            $table->string('status', 50)->default('draft'); // draft|sent|viewed|approved|rejected
            $table->date('valid_until')->nullable();
            $table->jsonb('items')->default('[]');
            $table->decimal('subtotal', 12, 2)->nullable();
            $table->decimal('tax_rate', 5, 2)->default(20);
            $table->decimal('tax_amount', 12, 2)->nullable();
            $table->decimal('discount', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index('tenant_id');
        });

        // Sözleşmeler
        Schema::create('contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('contract_number', 50)->nullable();
            $table->string('type', 50)->nullable();       // maintenance|installation|mixed
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->decimal('monthly_fee', 12, 2)->nullable();
            $table->boolean('auto_renew')->default(false);
            $table->string('status', 50)->default('active');
            $table->jsonb('elevators')->default('[]');
            $table->string('document_url', 500)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index('tenant_id');
        });

        // Faturalar
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('invoice_number', 50)->nullable();
            $table->string('type', 20)->default('e-archive'); // e-fatura|e-archive
            $table->string('status', 50)->default('draft');   // draft|sent|paid|overdue|cancelled
            $table->date('issue_date')->nullable();
            $table->date('due_date')->nullable();
            $table->jsonb('items')->default('[]');
            $table->decimal('subtotal', 12, 2)->nullable();
            $table->decimal('tax_rate', 5, 2)->default(20);
            $table->decimal('tax_amount', 12, 2)->nullable();
            $table->decimal('discount', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->nullable();
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->text('notes')->nullable();
            $table->string('source_type', 50)->nullable();
            $table->unsignedBigInteger('source_id')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index('tenant_id');
        });

        // e-Fatura entegratör logları
        Schema::create('e_invoice_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->string('provider', 50)->nullable();    // foriba|uyumsoft|mliva
            $table->string('document_type', 20)->nullable(); // e_fatura|e_arsiv
            $table->string('ettn', 100)->nullable();
            $table->string('status', 30)->nullable();      // queued|sent|accepted|rejected
            $table->jsonb('raw_response')->nullable();
            $table->timestamps();
            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('e_invoice_logs');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('contracts');
        Schema::dropIfExists('quotes');
        Schema::dropIfExists('cashbox_transactions');
        Schema::dropIfExists('account_transactions');
        Schema::dropIfExists('cashboxes');
        Schema::dropIfExists('current_accounts');
    }
};
