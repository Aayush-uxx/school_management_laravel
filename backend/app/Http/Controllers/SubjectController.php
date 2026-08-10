<?php

namespace App\Http\Controllers;

use App\Models\Grade;
use App\Models\Subject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubjectController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'subjects' => Subject::query()->orderBy('id')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:subjects,name',
            'code' => 'required|string|max:50|unique:subjects,code',
        ]);

        $subject = Subject::query()->create($validated);

        Grade::query()->get()->each(function (Grade $grade) use ($subject): void {
            $grade->subjects()->syncWithoutDetaching([$subject->id]);
        });

        TimetableController::generateMasterTimetable('subject_changed', $request->user()?->id);

        return response()->json([
            'success' => true,
            'subject' => $subject,
        ], 201);
    }

    public function destroy(int $id): JsonResponse
    {
        $subject = Subject::query()->findOrFail($id);
        $subject->delete();

        TimetableController::generateMasterTimetable('subject_changed', request()->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Subject deleted',
        ]);
    }
}
