<?php
// app/Http/Controllers/Api/SupplierController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $q = Supplier::query();
        if ($search = $request->string('search')->trim()->value()) {
            $q->where('name', 'ilike', "%{$search}%");
        }

        return $q->orderBy('name')->paginate(min((int) $request->integer('per_page', 25), 100));
    }

    public function store(Request $request)
    {
        return response()->json(Supplier::create($this->validateData($request))->fresh(), 201);
    }

    public function show(Supplier $supplier)
    {
        return $supplier;
    }

    public function update(Request $request, Supplier $supplier)
    {
        $supplier->update($this->validateData($request, $supplier));

        return $supplier->fresh();
    }

    public function destroy(Supplier $supplier)
    {
        $supplier->delete();

        return response()->json(['message' => 'Tedarikçi silindi.']);
    }

    private function validateData(Request $request, ?Supplier $supplier = null): array
    {
        return $request->validate([
            'name'       => [$supplier ? 'sometimes' : 'required', 'string', 'max:255'],
            'phone'      => ['nullable', 'string', 'max:20'],
            'email'      => ['nullable', 'email', 'max:255'],
            'tax_number' => ['nullable', 'string', 'max:20'],
            'address'    => ['nullable', 'string'],
            'notes'      => ['nullable', 'string'],
        ]);
    }
}
