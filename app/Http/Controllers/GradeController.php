<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Grade;

class GradeController extends Controller
{
    public function index()
    {
        return response()->json([
            'success' => true,
            'grades' => Grade::all(),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'grade' => 'required|integer',
            'section' => 'required|in:A,B',
        ]);

        $exists = Grade::where('grade', $request->grade)
            ->where('section', $request->section)
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'This grade and section already exists'], 400);
        }

        $grade = Grade::create([
            'grade' => $request->grade,
            'section' => $request->section,
        ]);

        return response()->json([
            'success' => true,
            'grade' => $grade,
        ], 201);
    }

    public function destroy($id)
    {
        $grade = Grade::findOrFail($id);
        $grade->delete();

        return response()->json([
            'success' => true,
            'message' => 'Grade deleted',
        ]);
    }
}