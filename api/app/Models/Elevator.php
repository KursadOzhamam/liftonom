<?php
// app/Models/Elevator.php

namespace App\Models;

use App\Models\Concerns\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Elevator extends Model
{
    use HasTenant, SoftDeletes;

    public const STATUS_ACTIVE  = 'active';
    public const STATUS_PASSIVE = 'passive';
    public const STATUS_FAULTY  = 'faulty';

    protected $fillable = [
        'tenant_id', 'building_id', 'code', 'name', 'type', 'brand', 'model',
        'capacity_kg', 'speed', 'floor_count', 'stop_count', 'production_year',
        'serial_number', 'tse_certificate_no', 'tse_start_date', 'tse_end_date',
        'tse_document_url', 'status', 'last_maintenance_at', 'next_maintenance_at',
        'maintenance_period', 'qr_token', 'notes', 'is_sample',
    ];

    protected function casts(): array
    {
        return [
            'speed'               => 'decimal:2',
            'tse_start_date'      => 'date',
            'tse_end_date'        => 'date',
            'last_maintenance_at' => 'datetime',
            'next_maintenance_at' => 'datetime',
            'is_sample'           => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Elevator $elevator) {
            if (empty($elevator->qr_token)) {
                $elevator->qr_token = Str::lower(Str::random(32));
            }
        });
    }

    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }

    /**
     * TSE etiket rengi: green (>30g), yellow (≤30g), red (geçmiş), gray (belge yok).
     */
    public function tseLabel(): string
    {
        if (! $this->tse_end_date) {
            return 'gray';
        }
        $days = now()->startOfDay()->diffInDays($this->tse_end_date, false);
        if ($days < 0) {
            return 'red';
        }
        return $days <= 30 ? 'yellow' : 'green';
    }
}
