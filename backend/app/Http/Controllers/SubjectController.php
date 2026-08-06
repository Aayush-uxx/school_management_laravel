<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Subject;

class SubjectController extends Controller
{
    public function index()
    {
        return response()->json([
            'success' => true,
            'subjects' => Subject::all(),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|unique:subjects',
            'code' => 'required|string|unique:subjects',
        ]);

        $subject = Subject::create([
            'name' => $request->name,
            'code' => $request->code,
        ]);

        return response()->json([
            'success' => true,
            'subject' => $subject,
        ], 201);
    }

    public function destroy($id)
    {
        $subject = Subject::findOrFail($id);
        $subject->delete();

        return response()->json([
            'success' => true,
            'message' => 'Subject deleted',
        ]);
    }
}