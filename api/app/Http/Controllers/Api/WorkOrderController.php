<?php
// app/Http/Controllers/Api/WorkOrderController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkOrder;
use Illuminate\Http\Request;

class WorkOrderController extends Controller
{
    public function index(Request $request)
    {
        $q = WorkOrder::query()->with(['elevator:id,name', 'assignedUser:id,name,surname']);

        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }
        if ($request->filled('assigned_user_id')) {
            $q->where('assigned_user_id', $request->integer('assigned_user_id'));
        }
        if ($request->user()->role === 'technician') {
            $q->where('assigned_user_id', $request->user()->id);
        }

        return $q->orderByDesc('id')->paginate(min((int) $request->integer('per_page', 25), 100));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'elevator_id'      => ['nullable', 'integer', 'exists:elevators,id'],
            'assigned_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'planned_date'     => ['nullable', 'date'],
            'description'      => ['required', 'string'],
        ]);
        $data['source_type'] = 'manual';
        $data['status'] = 'open';
        $data['created_by'] = $request->user()->id;

        return response()->json(WorkOrder::create($data)->fresh(), 201);
    }

    public function show(WorkOrder $workOrder)
    {
        return $workOrder->load(['elevator:id,name', 'assignedUser:id,name,surname']);
    }

    public function update(Request $request, WorkOrder $workOrder)
    {
        $workOrder->update($request->validate([
            'assigned_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'planned_date'     => ['nullable', 'date'],
            'status'           => ['sometimes', 'in:open,in_progress,done,cancelled'],
            'description'      => ['sometimes', 'string'],
        ]));

        return $workOrder->fresh();
    }

    public function complete(WorkOrder $workOrder)
    {
        $workOrder->update(['status' => 'done', 'completed_at' => now()]);

        return $workOrder->fresh();
    }

    public function destroy(WorkOrder $workOrder)
    {
        $workOrder->delete();

        return response()->json(['message' => 'İş emri silindi.']);
    }
}
