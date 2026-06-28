<?php
// app/Http/Controllers/Api/RegionController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Region;
use Illuminate\Http\Request;

class RegionController extends Controller
{
    public function index(Request $request)
    {
        $q = Region::query()->withCount(['technicians']);

        if ($search = $request->string('search')->trim()->value()) {
            $q->where(fn ($w) => $w->where('name', 'ilike', "%{$search}%")
                ->orWhere('code', 'ilike', "%{$search}%"));
        }

        return $q->orderBy('name')->paginate(min((int) $request->integer('per_page', 25), 100));
    }

    public function store(Request $request)
    {
        $region = Region::create($this->validateData($request));
        $this->syncTechnicians($request, $region);

        return response()->json($region->fresh()->loadCount('technicians'), 201);
    }

    public function show(Region $region)
    {
        return $region->load('technicians:id,name,surname')->loadCount('technicians');
    }

    public function update(Request $request, Region $region)
    {
        $region->update($this->validateData($request, $region));
        $this->syncTechnicians($request, $region);

        return $region->fresh()->loadCount('technicians');
    }

    public function destroy(Region $region)
    {
        $region->delete();

        return response()->json(['message' => 'Bölge silindi.']);
    }

    private function validateData(Request $request, ?Region $region = null): array
    {
        return $request->validate([
            'name'        => [$region ? 'sometimes' : 'required', 'string', 'max:255'],
            'code'        => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
            'is_active'   => ['nullable', 'boolean'],
        ]);
    }

    private function syncTechnicians(Request $request, Region $region): void
    {
        if ($request->has('technician_ids')) {
            $ids = collect($request->array('technician_ids'))
                ->mapWithKeys(fn ($id) => [$id => ['tenant_id' => $region->tenant_id]]);
            $region->technicians()->sync($ids);
        }
    }
}
