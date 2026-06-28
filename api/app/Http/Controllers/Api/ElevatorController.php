<?php
// app/Http/Controllers/Api/ElevatorController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Elevator;
use Illuminate\Http\Request;

class ElevatorController extends Controller
{
    public function index(Request $request)
    {
        $q = Elevator::query()->with('building:id,name,customer_id');

        if ($search = $request->string('search')->trim()->value()) {
            $q->where(function ($w) use ($search) {
                $w->where('name', 'ilike', "%{$search}%")
                  ->orWhere('serial_number', 'ilike', "%{$search}%")
                  ->orWhere('brand', 'ilike', "%{$search}%")
                  ->orWhere('code', 'ilike', "%{$search}%");
            });
        }
        if ($request->filled('building_id')) {
            $q->where('building_id', $request->integer('building_id'));
        }
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }
        if ($request->filled('type')) {
            $q->where('type', $request->string('type'));
        }
        // TSE etiketine göre filtre (DB tarafında tarih hesabı)
        if ($tse = $request->string('tse')->value()) {
            $today = now()->toDateString();
            $in30  = now()->addDays(30)->toDateString();
            match ($tse) {
                'green'  => $q->whereNotNull('tse_end_date')->where('tse_end_date', '>', $in30),
                'yellow' => $q->whereNotNull('tse_end_date')->whereBetween('tse_end_date', [$today, $in30]),
                'red'    => $q->whereNotNull('tse_end_date')->where('tse_end_date', '<', $today),
                'gray'   => $q->whereNull('tse_end_date'),
                default  => null,
            };
        }

        match ($request->string('sort', 'name')->value()) {
            'tse'    => $q->orderBy('tse_end_date'),
            'newest' => $q->orderByDesc('id'),
            default  => $q->orderBy('name'),
        };

        return $q->paginate(min((int) $request->integer('per_page', 25), 100));
    }

    public function store(Request $request)
    {
        $elevator = Elevator::create($this->validateData($request));

        return response()->json($elevator->fresh()->load('building:id,name'), 201);
    }

    public function show(Elevator $elevator)
    {
        return $elevator->load('building:id,name,customer_id');
    }

    public function update(Request $request, Elevator $elevator)
    {
        $elevator->update($this->validateData($request, $elevator));

        return $elevator->fresh()->load('building:id,name');
    }

    public function destroy(Elevator $elevator)
    {
        $elevator->delete();

        return response()->json(['message' => 'Asansör silindi.']);
    }

    /** TSE muayene takip özeti: etikete göre sayımlar + yaklaşan/geçmiş listesi. */
    public function tseReport(Request $request)
    {
        $today = now()->toDateString();
        $in30  = now()->addDays(30)->toDateString();

        $base = fn () => Elevator::query();

        $summary = [
            'total'   => $base()->count(),
            'green'   => $base()->whereNotNull('tse_end_date')->where('tse_end_date', '>', $in30)->count(),
            'yellow'  => $base()->whereNotNull('tse_end_date')->whereBetween('tse_end_date', [$today, $in30])->count(),
            'red'     => $base()->whereNotNull('tse_end_date')->where('tse_end_date', '<', $today)->count(),
            'gray'    => $base()->whereNull('tse_end_date')->count(),
        ];

        $list = $request->string('list', 'upcoming')->value();
        $q = Elevator::query()->with('building:id,name');
        if ($list === 'upcoming') {
            $q->whereNotNull('tse_end_date')->whereBetween('tse_end_date', [$today, $in30]);
        } elseif ($list === 'expired') {
            $q->whereNotNull('tse_end_date')->where('tse_end_date', '<', $today);
        }
        $q->orderBy('tse_end_date');

        return response()->json([
            'summary' => $summary,
            'items'   => $q->paginate(min((int) $request->integer('per_page', 25), 100)),
        ]);
    }

    /** QR kod verisi: müşterinin tarayıp arıza bildireceği genel link. */
    public function qr(Elevator $elevator)
    {
        return response()->json([
            'qr_token'    => $elevator->qr_token,
            'public_url'  => url("/qr/{$elevator->qr_token}"),
            'fault_endpoint' => url("/api/v1/public/fault-reports/{$elevator->qr_token}"),
        ]);
    }

    private function validateData(Request $request, ?Elevator $elevator = null): array
    {
        return $request->validate([
            'building_id'        => ['nullable', 'integer', 'exists:buildings,id'],
            'code'               => ['nullable', 'string', 'max:100'],
            'name'               => [$elevator ? 'sometimes' : 'required', 'string', 'max:255'],
            'type'               => ['nullable', 'string', 'max:50'],
            'brand'              => ['nullable', 'string', 'max:100'],
            'model'              => ['nullable', 'string', 'max:100'],
            'capacity_kg'        => ['nullable', 'integer', 'min:0'],
            'speed'              => ['nullable', 'numeric', 'min:0'],
            'floor_count'        => ['nullable', 'integer', 'min:0'],
            'stop_count'         => ['nullable', 'integer', 'min:0'],
            'production_year'    => ['nullable', 'integer', 'min:1900', 'max:2100'],
            'serial_number'      => ['nullable', 'string', 'max:100'],
            'tse_certificate_no' => ['nullable', 'string', 'max:100'],
            'tse_start_date'     => ['nullable', 'date'],
            'tse_end_date'       => ['nullable', 'date'],
            'status'             => ['nullable', 'in:active,passive,faulty'],
            'maintenance_period' => ['nullable', 'integer', 'min:1'],
            'notes'              => ['nullable', 'string'],
        ]);
    }
}
