<?php
// app/Http/Controllers/Api/AtfController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AtfForm;
use Illuminate\Http\Request;

class AtfController extends Controller
{
    public function index(Request $request)
    {
        return AtfForm::query()->orderByDesc('id')
            ->paginate(min((int) $request->integer('per_page', 25), 100));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'building_id' => ['nullable', 'integer', 'exists:buildings,id'],
            'form_data'   => ['nullable', 'array'],
            'attachments' => ['nullable', 'array'],
            'status'      => ['nullable', 'string', 'max:50'],
        ]);
        $data['created_by'] = $request->user()->id;

        return response()->json(AtfForm::create($data)->fresh(), 201);
    }

    public function show(AtfForm $atf)
    {
        return $atf;
    }

    public function update(Request $request, AtfForm $atf)
    {
        $atf->update($request->validate([
            'form_data'   => ['nullable', 'array'],
            'attachments' => ['nullable', 'array'],
            'status'      => ['nullable', 'string', 'max:50'],
        ]));

        return $atf->fresh();
    }

    public function destroy(AtfForm $atf)
    {
        $atf->delete();

        return response()->json(['message' => 'ATF silindi.']);
    }
}
