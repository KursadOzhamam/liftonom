<?php
// app/Models/MaintenanceRecord.php

namespace App\Models;

use App\Models\Concerns\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class MaintenanceRecord extends Model
{
    use HasTenant, SoftDeletes;

    public const STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];
    public const TYPES = ['periodic', 'fault', 'revision', 'annual'];

    protected $fillable = [
        'tenant_id', 'elevator_id', 'type', 'planned_date', 'started_at',
        'completed_at', 'status', 'assigned_users', 'checklist', 'materials_used',
        'technician_note', 'customer_signature_url', 'photos', 'is_recurring',
        'recurring_period', 'parent_id', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'planned_date'   => 'datetime',
            'started_at'     => 'datetime',
            'completed_at'   => 'datetime',
            'assigned_users' => 'array',
            'checklist'      => 'array',
            'materials_used' => 'array',
            'photos'         => 'array',
            'is_recurring'   => 'boolean',
        ];
    }

    public function elevator(): BelongsTo
    {
        return $this->belongsTo(Elevator::class);
    }
}
