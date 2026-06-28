<?php
// app/Models/FaultReportComment.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FaultReportComment extends Model
{
    protected $fillable = ['fault_report_id', 'user_id', 'comment'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
