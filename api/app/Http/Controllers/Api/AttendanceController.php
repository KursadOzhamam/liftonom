<?php
// app/Http/Controllers/Api/AttendanceController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $q = Attendance::query()->with('user:id,name,surname');
        if ($request->filled('user_id')) {
            $q->where('user_id', $request->integer('user_id'));
        }
        if ($from = $request->date('from')) {
            $q->where('date', '>=', $from);
        }
        if ($to = $request->date('to')) {
            $q->where('date', '<=', $to);
        }

        return $q->orderByDesc('date')->paginate(min((int) $request->integer('per_page', 25), 100));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'date'    => ['required', 'date'],
            'type'    => ['required', 'in:present,absent,leave,sick,holiday'],
            'note'    => ['nullable', 'string'],
        ]);

        return response()->json(Attendance::create($data)->fresh(), 201);
    }

    public function destroy(Attendance $attendance)
    {
        $attendance->delete();

        return response()->json(['message' => 'Kayıt silindi.']);
    }
}
