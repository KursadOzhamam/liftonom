<?php
// database/migrations/2026_06_28_000002_create_operations.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Bakım Kayıtları
        Schema::create('maintenance_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('elevator_id')->nullable()->constrained('elevators')->nullOnDelete();
            $table->string('type', 50)->nullable();          // periodic|fault|revision|annual
            $table->timestamp('planned_date')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->string('status', 50)->default('pending'); // pending|in_progress|completed|cancelled
            $table->jsonb('assigned_users')->default('[]');    // user_id array
            $table->jsonb('checklist')->default('[]');         // [{item,status,note}]
            $table->jsonb('materials_used')->default('[]');    // [{product_id,quantity,unit_price}]
            $table->text('technician_note')->nullable();
            $table->string('customer_signature_url', 500)->nullable();
            $table->jsonb('photos')->default('[]');
            $table->boolean('is_recurring')->default(false);
            $table->string('recurring_period', 50)->nullable(); // weekly|monthly|3monthly|6monthly|annual
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index('tenant_id');
            $table->index(['tenant_id', 'status', 'planned_date']);
        });

        // Arıza Bildirimleri
        Schema::create('fault_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('elevator_id')->nullable()->constrained('elevators')->nullOnDelete();
            $table->string('reported_by_type', 20)->default('user'); // user|customer|qr
            $table->unsignedBigInteger('reported_by_id')->nullable();
            $table->string('priority', 20)->default('normal'); // urgent|high|normal|low
            $table->string('status', 50)->default('new');      // new|investigating|repairing|resolved|closed
            $table->text('description')->nullable();
            $table->text('resolution_note')->nullable();
            $table->foreignId('assigned_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->jsonb('photos')->default('[]');
            $table->timestamps();
            $table->softDeletes();
            $table->index('tenant_id');
            $table->index(['tenant_id', 'status', 'priority']);
        });

        // Arıza Yorumları (timeline / notlar)
        Schema::create('fault_report_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fault_report_id')->constrained('fault_reports')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('comment');
            $table->timestamps();
        });

        // İş Emirleri
        Schema::create('work_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('elevator_id')->nullable()->constrained('elevators')->nullOnDelete();
            $table->string('source_type', 20)->nullable(); // fault|maintenance|manual
            $table->unsignedBigInteger('source_id')->nullable();
            $table->foreignId('assigned_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('planned_date')->nullable();
            $table->string('status', 50)->default('open'); // open|in_progress|done|cancelled
            $table->text('description')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index('tenant_id');
        });

        // Asansör Siparişleri
        Schema::create('elevator_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('order_number', 50)->nullable();
            $table->string('elevator_type', 50)->nullable();
            $table->integer('quantity')->default(1);
            $table->decimal('amount', 12, 2)->nullable();
            $table->string('status', 50)->default('quote'); // quote|approved|production|shipping|installing|completed|cancelled
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('elevator_orders');
        Schema::dropIfExists('work_orders');
        Schema::dropIfExists('fault_report_comments');
        Schema::dropIfExists('fault_reports');
        Schema::dropIfExists('maintenance_records');
    }
};
