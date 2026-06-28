<?php
// app/Models/Payroll.php

namespace App\Models;

use App\Models\Concerns\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payroll extends Model
{
    use HasTenant;

    protected $table = 'payroll';

    protected $fillable = [
        'tenant_id', 'user_id', 'period', 'base_salary', 'bonus',
        'deduction', 'net_paid', 'paid_at', 'cashbox_id', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'base_salary' => 'decimal:2',
            'bonus'       => 'decimal:2',
            'deduction'   => 'decimal:2',
            'net_paid'    => 'decimal:2',
            'paid_at'     => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
