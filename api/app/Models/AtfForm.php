<?php
// app/Models/AtfForm.php

namespace App\Models;

use App\Models\Concerns\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AtfForm extends Model
{
    use HasTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id', 'customer_id', 'building_id', 'form_data',
        'status', 'attachments', 'created_by',
    ];

    protected function casts(): array
    {
        return ['form_data' => 'array', 'attachments' => 'array'];
    }
}
