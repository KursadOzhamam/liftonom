<?php
// app/Models/Region.php

namespace App\Models;

use App\Models\Concerns\HasTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Region extends Model
{
    use HasTenant;

    protected $fillable = ['tenant_id', 'name', 'code', 'description', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function technicians(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'region_user')
            ->withPivot('is_primary');
    }
}
