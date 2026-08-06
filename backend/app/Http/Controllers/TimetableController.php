<?php

namespace App\Http\Controllers;

use App\Models\Grade;
use App\Models\Timetable;
use App\Models\TeacherAssignment;

class TimetableController extends Controller
{
    public function index()
    {
        return response()->json([
            'success' => true,
            'timetable' => Timetable::with('teacher')->get(),
        ]);
    }

    public function byGrade($gradeId)
    {
        $timetable = Timetable::where('grade_id', $gradeId)
            ->with('teacher')
            ->orderBy('day')
            ->orderBy('period')
            ->get();

        return response()->json(['success' => true, 'timetable' => $timetable]);
    }

    public function byTeacher($teacherId)
    {
        $timetable = Timetable::where('teacher_id', $teacherId)
            ->orderBy('day')
            ->orderBy('period')
            ->get();

        return response()->json(['success' => true, 'timetable' => $timetable]);
    }

    public static function generateMasterTimetable()
    {
        $days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        $periods = [
            ['id' => 1, 'time' => '10:00-10:45'],
            ['id' => 2, 'time' => '10:45-11:30'],
            ['id' => 4, 'time' => '11:45-12:30'],
            ['id' => 5, 'time' => '12:30-1:15'],
            ['id' => 7, 'time' => '2:00-2:45'],
        ];

        $grades = Grade::with('subjects')->get();
        $teacherBusy = [];

        foreach ($grades as $gradeIndex => $grade) {
            $subjects = $grade->subjects;
            if ($subjects->isEmpty()) continue;

            foreach ($days as $dayIndex => $day) {
                foreach ($periods as $periodIndex => $period) {
                    $rotationSeed = $periodIndex + $gradeIndex * 3 + $dayIndex * 5;
                    $subject = $subjects[$rotationSeed % $subjects->count()];

                    $slot = Timetable::firstOrCreate(
                        ['grade_id' => $grade->id, 'day' => $day, 'period' => $period['id']],
                        ['subject' => $subject->name, 'time' => $period['time'], 'teacher_id' => null, 'is_permanent' => true]
                    );

                    $assignment = TeacherAssignment::where('grade_id', $grade->id)
                        ->where('subject_id', $subject->id)
                        ->first();

                    $teacherId = null;
                    if ($assignment) {
                        $key = $day . '-' . $period['id'];
                        $teacherBusy[$assignment->user_id] = $teacherBusy[$assignment->user_id] ?? [];
                        if (!in_array($key, $teacherBusy[$assignment->user_id])) {
                            $teacherId = $assignment->user_id;
                            $teacherBusy[$assignment->user_id][] = $key;
                        }
                    }

                    $slot->update(['teacher_id' => $teacherId]);
                }
            }
        }
    }
}