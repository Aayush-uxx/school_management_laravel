<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Http\Controllers\TimetableController;

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
    public function destroy($id)
    {
        $teacher = User::findOrFail($id);
        $teacher->delete();

        TimetableController::generateMasterTimetable();

        return response()->json(['success' => true, 'message' => 'Teacher deleted']);
    }
    public function takenAssignments()
    {
        $taken = \App\Models\TeacherAssignment::select('grade_id', 'subject_id')->distinct()->get();

        return response()->json(['success' => true, 'taken' => $taken]);
    }
}
