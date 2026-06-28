<?php
// app/Http/Controllers/Api/CustomerController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCustomerRequest;
use App\Http\Requests\UpdateCustomerRequest;
use App\Http\Resources\CustomerResource;
use App\Models\Customer;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    /** Liste — arama, filtre, sıralama, sayfalama (25). */
    public function index(Request $request)
    {
        $q = Customer::query()->withCount('buildings');

        if ($search = $request->string('search')->trim()->value()) {
            $q->where(function ($w) use ($search) {
                $w->where('name', 'ilike', "%{$search}%")
                  ->orWhere('phone', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%")
                  ->orWhere('tax_number', 'ilike', "%{$search}%");
            });
        }

        if ($request->filled('type')) {
            $q->where('type', $request->string('type'));
        }

        if ($request->filled('region_id')) {
            $q->where('region_id', $request->integer('region_id'));
        }

        if ($request->filled('is_active')) {
            $q->where('is_active', $request->boolean('is_active'));
        }

        $sort = $request->string('sort', 'name')->value();
        match ($sort) {
            'name_desc' => $q->orderBy('name', 'desc'),
            'newest'    => $q->orderBy('id', 'desc'),
            'oldest'    => $q->orderBy('id', 'asc'),
            default     => $q->orderBy('name', 'asc'),
        };

        $perPage = min((int) $request->integer('per_page', 25), 100);

        return CustomerResource::collection($q->paginate($perPage));
    }

    public function store(StoreCustomerRequest $request)
    {
        $customer = Customer::create($request->validated());
        $customer->refresh(); // DB default'larını (is_active vb.) yansıt

        return (new CustomerResource($customer))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Customer $customer)
    {
        $customer->loadCount('buildings')->load('region');

        return new CustomerResource($customer);
    }

    public function update(UpdateCustomerRequest $request, Customer $customer)
    {
        $customer->update($request->validated());

        return new CustomerResource($customer);
    }

    public function destroy(Customer $customer)
    {
        $customer->delete(); // soft delete

        return response()->json(['message' => 'Müşteri silindi.']);
    }
}
