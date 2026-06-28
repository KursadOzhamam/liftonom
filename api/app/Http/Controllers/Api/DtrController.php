<?php
// app/Http/Controllers/Api/DtrController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DtrReport;
use Illuminate\Http\Request;

class DtrController extends Controller
{
    public function index(Request $request)
    {
        $q = DtrReport::query()->with('elevator:id,name');
        if ($request->filled('elevator_id')) {
            $q->where('elevator_id', $request->integer('elevator_id'));
        }

        return $q->orderByDesc('id')->paginate(min((int) $request->integer('per_page', 25), 100));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'elevator_id'     => ['required', 'integer', 'exists:elevators,id'],
            'checklist_items' => ['nullable', 'array'],
            'general_note'    => ['nullable', 'string'],
            'photos'          => ['nullable', 'array'],
            'signature_url'   => ['nullable', 'string'],
        ]);
        $data['technician_id'] = $request->user()->id;

        return response()->json(DtrReport::create($data)->fresh(), 201);
    }

    public function show(DtrReport $dtr)
    {
        return $dtr->load('elevator:id,name');
    }

    public function update(Request $request, DtrReport $dtr)
    {
        $dtr->update($request->validate([
            'checklist_items' => ['nullable', 'array'],
            'general_note'    => ['nullable', 'string'],
            'photos'          => ['nullable', 'array'],
            'signature_url'   => ['nullable', 'string'],
        ]));

        return $dtr->fresh();
    }

    public function destroy(DtrReport $dtr)
    {
        $dtr->delete();

        return response()->json(['message' => 'DTR silindi.']);
    }
}
