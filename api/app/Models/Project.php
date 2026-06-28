<?php
// app/Models/Project.php

namespace App\Models;

use App\Models\Concerns\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use HasTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id', 'customer_id', 'name', 'description', 'status',
        'start_date', 'end_date', 'progress', 'assigned_users', 'tasks',
    ];

    protected function casts(): array
    {
        return [
            'start_date'     => 'date',
            'end_date'       => 'date',
            'progress'       => 'integer',
            'assigned_users' => 'array',
            'tasks'          => 'array',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
