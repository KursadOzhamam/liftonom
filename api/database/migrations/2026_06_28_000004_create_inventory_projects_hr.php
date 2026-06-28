<?php
// database/migrations/2026_06_28_000004_create_inventory_projects_hr.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tedarikçiler
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('name');
            $table->string('phone', 20)->nullable();
            $table->string('email')->nullable();
            $table->string('tax_number', 20)->nullable();
            $table->text('address')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            $table->index('tenant_id');
        });

        // Stok (Ürünler)
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->string('code', 100)->nullable();
            $table->string('name');
            $table->string('category', 100)->nullable();
            $table->string('unit', 20)->nullable();
            $table->decimal('stock_quantity', 10, 2)->default(0);
            $table->decimal('min_stock', 10, 2)->default(0);
            $table->decimal('unit_price', 12, 2)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            $table->index('tenant_id');
        });

        // Stok Hareketleri (ledger — silinmez)
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('type', 20);                  // in|out|transfer
            $table->decimal('quantity', 10, 2);
            $table->decimal('unit_price', 12, 2)->nullable();
            $table->decimal('total_price', 12, 2)->nullable();
            $table->string('reference_type', 50)->nullable(); // maintenance|purchase|adjustment
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->index('tenant_id');
        });

        // Projeler
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('status', 50)->default('planning');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->integer('progress')->default(0);
            $table->jsonb('assigned_users')->default('[]');
            $table->jsonb('tasks')->default('[]');
            $table->timestamps();
            $table->softDeletes();
            $table->index('tenant_id');
        });

        // Personel: Vardiya
        Schema::create('staff_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('work_date');
            $table->time('shift_start')->nullable();
            $table->time('shift_end')->nullable();
            $table->string('note')->nullable();
            $table->timestamps();
            $table->index('tenant_id');
        });

        // Personel: Devamsızlık
        Schema::create('attendance', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('date');
            $table->string('type', 30); // present|absent|leave|sick|holiday
            $table->string('note')->nullable();
            $table->timestamps();
            $table->index('tenant_id');
        });

        // Personel: Maaş/Ödeme
        Schema::create('payroll', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('period', 7); // 2026-06
            $table->decimal('base_salary', 12, 2)->nullable();
            $table->decimal('bonus', 12, 2)->default(0);
            $table->decimal('deduction', 12, 2)->default(0);
            $table->decimal('net_paid', 12, 2)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('cashbox_id')->nullable()->constrained('cashboxes')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll');
        Schema::dropIfExists('attendance');
        Schema::dropIfExists('staff_schedules');
        Schema::dropIfExists('projects');
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('products');
        Schema::dropIfExists('suppliers');
    }
};
