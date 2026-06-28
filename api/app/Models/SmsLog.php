<?php
// app/Models/SmsLog.php

namespace App\Models;

use App\Models\Concerns\HasTenant;
use Illuminate\Database\Eloquent\Model;

class SmsLog extends Model
{
    use HasTenant;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id', 'recipient', 'message', 'status',
        'provider_id', 'trigger_type', 'cost', 'sent_at',
    ];

    protected function casts(): array
    {
        return ['sent_at' => 'datetime', 'cost' => 'integer'];
    }
}
