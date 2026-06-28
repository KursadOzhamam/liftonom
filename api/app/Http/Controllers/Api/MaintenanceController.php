<?php
// app/Http/Controllers/Api/MaintenanceController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Elevator;
use App\Models\MaintenanceRecord;
use Illuminate\Http\Request;

class MaintenanceController extends Controller
{
    public function index(Request $request)
    {
        $q = MaintenanceRecord::query()->with('elevator:id,name,building_id');

        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }
        if ($request->filled('type')) {
            $q->where('type', $request->string('type'));
        }
        if ($request->filled('elevator_id')) {
            $q->where('elevator_id', $request->integer('elevator_id'));
        }
        if ($from = $request->date('from')) {
            $q->where('planned_date', '>=', $from);
        }
        if ($to = $request->date('to')) {
            $q->where('planned_date', '<=', $to);
        }
        // Teknisyen kendi atandığı kayıtlar (JSONB assigned_users içinde)
        if ($request->user()->role === 'technician') {
            $uid = $request->user()->id;
            $q->whereJsonContains('assigned_users', $uid);
        }

        return $q->orderByDesc('planned_date')->paginate(min((int) $request->integer('per_page', 25), 100));
    }

    /** Takvim verisi (start/end aralığı). */
    public function calendar(Request $request)
    {
        $q = MaintenanceRecord::query()->with('elevator:id,name');
        if ($start = $request->date('start')) {
            $q->where('planned_date', '>=', $start);
        }
        if ($end = $request->date('end')) {
            $q->where('planned_date', '<=', $end);
        }

        return $q->get(['id', 'elevator_id', 'type', 'status', 'planned_date']);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'elevator_id'      => ['required', 'integer', 'exists:elevators,id'],
            'type'             => ['required', 'in:periodic,fault,revision,annual'],
            'planned_date'     => ['required', 'date'],
            'assigned_users'   => ['nullable', 'array'],
            'assigned_users.*' => ['integer', 'exists:users,id'],
            'is_recurring'     => ['nullable', 'boolean'],
            'recurring_period' => ['nullable', 'in:weekly,monthly,3monthly,6monthly,annual'],
            'technician_note'  => ['nullable', 'string'],
        ]);
        $data['status'] = 'pending';
        $data['created_by'] = $request->user()->id;

        $m = MaintenanceRecord::create($data);

        return response()->json($m->fresh()->load('elevator:id,name'), 201);
    }

    public function show(MaintenanceRecord $maintenance)
    {
        return $maintenance->load('elevator:id,name,building_id');
    }

    public function update(Request $request, MaintenanceRecord $maintenance)
    {
        $maintenance->update($request->validate([
            'type'            => ['sometimes', 'in:periodic,fault,revision,annual'],
            'planned_date'    => ['sometimes', 'date'],
            'status'          => ['sometimes', 'in:pending,in_progress,completed,cancelled'],
            'assigned_users'  => ['nullable', 'array'],
            'checklist'       => ['nullable', 'array'],
            'technician_note' => ['nullable', 'string'],
        ]));

        return $maintenance->fresh();
    }

    public function destroy(MaintenanceRecord $maintenance)
    {
        $maintenance->delete();

        return response()->json(['message' => 'Bakım kaydı silindi.']);
    }

    /** Bakımı tamamla: checklist, malzeme, imza, foto; asansör son/sonraki bakım güncelle. */
    public function complete(Request $request, MaintenanceRecord $maintenance)
    {
        $data = $request->validate([
            'checklist'              => ['nullable', 'array'],
            'materials_used'         => ['nullable', 'array'],
            'technician_note'        => ['nullable', 'string'],
            'customer_signature_url' => ['nullable', 'string'],
            'photos'                 => ['nullable', 'array'],
        ]);

        $maintenance->fill($data);
        $maintenance->status = 'completed';
        $maintenance->completed_at = now();
        if (! $maintenance->started_at) {
            $maintenance->started_at = now();
        }
        $maintenance->save();

        // Asansörün bakım tarihlerini güncelle
        if ($elevator = Elevator::find($maintenance->elevator_id)) {
            $period = $elevator->maintenance_period ?: 30;
            $elevator->update([
                'last_maintenance_at' => now(),
                'next_maintenance_at' => now()->addDays($period),
            ]);
        }

        return $maintenance->fresh();
    }
}
