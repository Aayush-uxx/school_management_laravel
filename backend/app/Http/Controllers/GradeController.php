<?php

namespace App\Http\Controllers;

use App\Models\Grade;
use App\Models\Subject;
use App\Models\Timetable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GradeController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'grades' => Grade::query()
                ->with('subjects')
                ->orderBy('grade')
                ->orderBy('section')
                ->get(),
        ]);
    }

    public function attachSubjects(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'subject_ids' => 'required|array|min:1',
            'subject_ids.*' => 'integer|distinct|exists:subjects,id',
        ]);

        $grade = Grade::query()->findOrFail($id);
        $grade->subjects()->sync($validated['subject_ids']);

        TimetableController::generateMasterTimetable('curriculum_changed', $request->user()?->id);

        return response()->json([
            'success' => true,
            'grade' => $grade->load('subjects'),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'grade' => 'required|integer|between:1,10',
            'section' => 'required|in:A,B',
        ]);

        $exists = Grade::query()
            ->where('grade', $validated['grade'])
            ->where('section', $validated['section'])
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'This grade and section already exists'], 422);
        }

        $grade = Grade::query()->create($validated);
        $subjectIds = Subject::query()->orderBy('id')->pluck('id');

        if ($subjectIds->isNotEmpty()) {
            $grade->subjects()->sync($subjectIds);
        }

        TimetableController::generateMasterTimetable('grade_changed', $request->user()?->id);

        return response()->json([
            'success' => true,
            'grade' => $grade->load('subjects'),
        ], 201);
    }

    public function destroy(int $id): JsonResponse
    {
        $grade = Grade::query()->findOrFail($id);
        Timetable::query()->where('grade_id', $grade->id)->delete();
        $grade->delete();

        TimetableController::generateMasterTimetable('grade_changed', request()->user()?->id);

        return response()->json([
            'success' => true,
            'message' => 'Grade deleted',
        ]);
    }
}
