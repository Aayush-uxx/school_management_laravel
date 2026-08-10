<?php

namespace App\Http\Controllers;

use App\Models\TeacherAssignment;
use App\Models\User;

class TeacherController extends Controller
{
    public function index()
    {
        $teachers = User::where('role', 'teacher')
            ->with('assignments.grade', 'assignments.subject')
            ->get();

        return response()->json([
            'success' => true,
            'count' => $teachers->count(),
            'teachers' => $teachers,
        ]);
    }

    public function destroy(int $id)
    {
        $teacher = User::query()->findOrFail($id);
        $teacher->delete();

        TimetableController::generateMasterTimetable('teacher_removed', request()->user()?->id);

        return response()->json(['success' => true, 'message' => 'Teacher deleted']);
    }

    public function takenAssignments()
    {
        $taken = TeacherAssignment::select('grade_id', 'subject_id')->distinct()->get();

        return response()->json(['success' => true, 'taken' => $taken]);
    }
}
