<?php
// app/Http/Requests/StoreCustomerRequest.php

namespace App\Http\Requests;

use App\Models\Customer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // yetki kontrolü route middleware (role) ile
    }

    public function rules(): array
    {
        return [
            'type'       => ['nullable', Rule::in([Customer::TYPE_INDIVIDUAL, Customer::TYPE_CORPORATE])],
            'name'       => ['required', 'string', 'max:255'],
            'tax_number' => ['nullable', 'string', 'max:20'],
            'tax_office' => ['nullable', 'string', 'max:100'],
            'id_number'  => ['nullable', 'string', 'max:20'],
            'phone'      => ['nullable', 'string', 'max:20'],
            'email'      => ['nullable', 'email', 'max:255'],
            'address'    => ['nullable', 'string'],
            'district'   => ['nullable', 'string', 'max:100'],
            'city'       => ['nullable', 'string', 'max:100'],
            'region_id'  => ['nullable', 'integer', 'exists:regions,id'],
            'notes'      => ['nullable', 'string'],
            'is_active'  => ['nullable', 'boolean'],
        ];
    }
}
