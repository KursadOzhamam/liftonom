<?php
// app/Models/FaultReport.php

namespace App\Models;

use App\Models\Concerns\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class FaultReport extends Model
{
    use HasTenant, SoftDeletes;

    public const STATUSES = ['new', 'investigating', 'repairing', 'resolved', 'closed'];
    public const PRIORITIES = ['urgent', 'high', 'normal', 'low'];

    protected $fillable = [
        'tenant_id', 'elevator_id', 'reported_by_type', 'reported_by_id',
        'priority', 'status', 'description', 'resolution_note',
        'assigned_user_id', 'resolved_at', 'photos',
    ];

    protected function casts(): array
    {
        return [
            'photos'      => 'array',
            'resolved_at' => 'datetime',
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

    public function comments(): HasMany
    {
        return $this->hasMany(FaultReportComment::class);
    }
}
