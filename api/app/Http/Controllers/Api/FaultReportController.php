<?php
// app/Http/Controllers/Api/FaultReportController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FaultReport;
use App\Models\WorkOrder;
use Illuminate\Http\Request;

class FaultReportController extends Controller
{
    public function index(Request $request)
    {
        $q = FaultReport::query()->with(['elevator:id,name,building_id', 'assignedUser:id,name,surname'])
            ->withCount('comments');

        if ($search = $request->string('search')->trim()->value()) {
            $q->where('description', 'ilike', "%{$search}%");
        }
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }
        if ($request->filled('priority')) {
            $q->where('priority', $request->string('priority'));
        }
        if ($request->filled('elevator_id')) {
            $q->where('elevator_id', $request->integer('elevator_id'));
        }
        if ($request->filled('assigned_user_id')) {
            $q->where('assigned_user_id', $request->integer('assigned_user_id'));
        }

        return $q->orderByDesc('id')->paginate(min((int) $request->integer('per_page', 25), 100));
    }

    /** Kanban için duruma göre gruplanmış özet. */
    public function kanban()
    {
        $groups = [];
        foreach (FaultReport::STATUSES as $status) {
            $groups[$status] = FaultReport::where('status', $status)
                ->with('elevator:id,name')
                ->orderByDesc('id')->limit(50)->get();
        }

        return response()->json($groups);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'elevator_id' => ['required', 'integer', 'exists:elevators,id'],
            'priority'    => ['nullable', 'in:urgent,high,normal,low'],
            'description' => ['required', 'string'],
            'assigned_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);
        $data['reported_by_type'] = 'user';
        $data['reported_by_id'] = $request->user()->id;
        $data['status'] = 'new';

        $fault = FaultReport::create($data);

        return response()->json($fault->fresh()->load('elevator:id,name'), 201);
    }

    public function show(FaultReport $faultReport)
    {
        return $faultReport->load([
            'elevator:id,name,building_id',
            'assignedUser:id,name,surname',
            'comments.user:id,name,surname',
        ]);
    }

    public function update(Request $request, FaultReport $faultReport)
    {
        $faultReport->update($request->validate([
            'priority'        => ['sometimes', 'in:urgent,high,normal,low'],
            'description'     => ['sometimes', 'string'],
            'resolution_note' => ['nullable', 'string'],
        ]));

        return $faultReport->fresh();
    }

    public function destroy(FaultReport $faultReport)
    {
        $faultReport->delete();

        return response()->json(['message' => 'Arıza kaydı silindi.']);
    }

    /** Durum değiştir; resolved/closed olunca resolved_at damgala. */
    public function changeStatus(Request $request, FaultReport $faultReport)
    {
        $data = $request->validate([
            'status' => ['required', 'in:' . implode(',', FaultReport::STATUSES)],
            'resolution_note' => ['nullable', 'string'],
        ]);

        $faultReport->status = $data['status'];
        if (isset($data['resolution_note'])) {
            $faultReport->resolution_note = $data['resolution_note'];
        }
        if (in_array($data['status'], ['resolved', 'closed'], true) && ! $faultReport->resolved_at) {
            $faultReport->resolved_at = now();
        }
        $faultReport->save();

        return $faultReport->fresh();
    }

    public function assign(Request $request, FaultReport $faultReport)
    {
        $data = $request->validate([
            'assigned_user_id' => ['required', 'integer', 'exists:users,id'],
        ]);
        $faultReport->update($data);

        return $faultReport->fresh()->load('assignedUser:id,name,surname');
    }

    public function addComment(Request $request, FaultReport $faultReport)
    {
        $data = $request->validate(['comment' => ['required', 'string']]);
        $comment = $faultReport->comments()->create([
            'user_id' => $request->user()->id,
            'comment' => $data['comment'],
        ]);

        return response()->json($comment->load('user:id,name,surname'), 201);
    }

    /** Arızayı iş emrine dönüştür. */
    public function convertToWorkOrder(Request $request, FaultReport $faultReport)
    {
        $wo = WorkOrder::create([
            'elevator_id'      => $faultReport->elevator_id,
            'source_type'      => 'fault',
            'source_id'        => $faultReport->id,
            'assigned_user_id' => $faultReport->assigned_user_id,
            'status'           => 'open',
            'description'      => $faultReport->description,
            'created_by'       => $request->user()->id,
        ]);

        $faultReport->update(['status' => 'repairing']);

        return response()->json($wo->fresh(), 201);
    }
}
