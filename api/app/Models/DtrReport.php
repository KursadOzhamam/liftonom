<?php
// app/Models/DtrReport.php

namespace App\Models;

use App\Models\Concerns\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class DtrReport extends Model
{
    use HasTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id', 'elevator_id', 'technician_id', 'checklist_items',
        'general_note', 'photos', 'signature_url',
    ];

    protected function casts(): array
    {
        return ['checklist_items' => 'array', 'photos' => 'array'];
    }

    public function elevator(): BelongsTo
    {
        return $this->belongsTo(Elevator::class);
    }
}
