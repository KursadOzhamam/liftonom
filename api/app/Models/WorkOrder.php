<?php
// app/Models/WorkOrder.php

namespace App\Models;

use App\Models\Concerns\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class WorkOrder extends Model
{
    use HasTenant, SoftDeletes;

    public const STATUSES = ['open', 'in_progress', 'done', 'cancelled'];

    protected $fillable = [
        'tenant_id', 'elevator_id', 'source_type', 'source_id',
        'assigned_user_id', 'planned_date', 'status', 'description',
        'completed_at', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'planned_date' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function elevator(): BelongsTo
    {
        return $this->belongsTo(Elevator::class);
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }
}
