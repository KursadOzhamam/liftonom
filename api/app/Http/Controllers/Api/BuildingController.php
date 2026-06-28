<?php
// app/Http/Controllers/Api/BuildingController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Building;
use Illuminate\Http\Request;

class BuildingController extends Controller
{
    public function index(Request $request)
    {
        $q = Building::query()->with('customer:id,name')->withCount('elevators');

        if ($search = $request->string('search')->trim()->value()) {
            $q->where(function ($w) use ($search) {
                $w->where('name', 'ilike', "%{$search}%")
                  ->orWhere('city', 'ilike', "%{$search}%")
                  ->orWhere('district', 'ilike', "%{$search}%")
                  ->orWhere('manager_name', 'ilike', "%{$search}%");
            });
        }
        if ($request->filled('customer_id')) {
            $q->where('customer_id', $request->integer('customer_id'));
        }
        if ($request->filled('region_id')) {
            $q->where('region_id', $request->integer('region_id'));
        }

        match ($request->string('sort', 'name')->value()) {
            'city'   => $q->orderBy('city'),
            'newest' => $q->orderByDesc('id'),
            default  => $q->orderBy('name'),
        };

        return $q->paginate(min((int) $request->integer('per_page', 25), 100));
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request);
        $building = Building::create($data);

        return response()->json($building->fresh()->load('customer:id,name'), 201);
    }

    public function show(Building $building)
    {
        return $building->load(['customer:id,name', 'region:id,name', 'elevators']);
    }

    public function update(Request $request, Building $building)
    {
        $building->update($this->validateData($request, $building));

        return $building->fresh()->load('customer:id,name');
    }

    public function destroy(Building $building)
    {
        $building->delete();

        return response()->json(['message' => 'Bina silindi.']);
    }

    private function validateData(Request $request, ?Building $building = null): array
    {
        return $request->validate([
            'customer_id'   => ['nullable', 'integer', 'exists:customers,id'],
            'region_id'     => ['nullable', 'integer', 'exists:regions,id'],
            'name'          => [$building ? 'sometimes' : 'required', 'string', 'max:255'],
            'address'       => ['nullable', 'string'],
            'district'      => ['nullable', 'string', 'max:100'],
            'city'          => ['nullable', 'string', 'max:100'],
            'floor_count'   => ['nullable', 'integer', 'min:0'],
            'manager_name'  => ['nullable', 'string', 'max:255'],
            'manager_phone' => ['nullable', 'string', 'max:20'],
            'latitude'      => ['nullable', 'numeric', 'between:-90,90'],
            'longitude'     => ['nullable', 'numeric', 'between:-180,180'],
            'notes'         => ['nullable', 'string'],
        ]);
    }
}
