<?php
// app/Http/Resources/CustomerResource.php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'type'           => $this->type,
            'name'           => $this->name,
            'tax_number'     => $this->tax_number,
            'tax_office'     => $this->tax_office,
            'id_number'      => $this->id_number,
            'phone'          => $this->phone,
            'email'          => $this->email,
            'address'        => $this->address,
            'district'       => $this->district,
            'city'           => $this->city,
            'region_id'      => $this->region_id,
            'region'         => $this->whenLoaded('region', fn () => [
                'id'   => $this->region->id,
                'name' => $this->region->name,
            ]),
            'notes'          => $this->notes,
            'is_active'      => $this->is_active,
            'is_sample'      => $this->is_sample,
            'buildings_count' => $this->whenCounted('buildings'),
            'created_at'     => $this->created_at?->toIso8601String(),
        ];
    }
}
