<?php
// app/Http/Controllers/Api/ProjectController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        $q = Project::query()->with('customer:id,name');
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }

        return $q->orderByDesc('id')->paginate(min((int) $request->integer('per_page', 25), 100));
    }

    public function store(Request $request)
    {
        return response()->json(Project::create($this->validateData($request))->fresh(), 201);
    }

    public function show(Project $project)
    {
        return $project->load('customer:id,name');
    }

    public function update(Request $request, Project $project)
    {
        $project->update($this->validateData($request, $project));

        return $project->fresh();
    }

    public function destroy(Project $project)
    {
        $project->delete();

        return response()->json(['message' => 'Proje silindi.']);
    }

    private function validateData(Request $request, ?Project $project = null): array
    {
        return $request->validate([
            'customer_id'    => ['nullable', 'integer', 'exists:customers,id'],
            'name'           => [$project ? 'sometimes' : 'required', 'string', 'max:255'],
            'description'    => ['nullable', 'string'],
            'status'         => ['nullable', 'string', 'max:50'],
            'start_date'     => ['nullable', 'date'],
            'end_date'       => ['nullable', 'date'],
            'progress'       => ['nullable', 'integer', 'min:0', 'max:100'],
            'assigned_users' => ['nullable', 'array'],
            'tasks'          => ['nullable', 'array'],
        ]);
    }
}
