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
        if ($grades->isEmpty()) return;

        $existing = Timetable::select('grade_id', 'day', 'period', 'subject')->get()
            ->keyBy(fn($t) => "{$t->grade_id}-{$t->day}-{$t->period}");

        $assignmentMap = [];
        foreach (TeacherAssignment::all() as $a) {
            $assignmentMap["{$a->grade_id}-{$a->subject_id}"] = $a->user_id;
        }

        $teacherBusy = [];
        $rows = [];
        $now = now();

        foreach ($grades as $gradeIndex => $grade) {
            $subjects = $grade->subjects;
            if ($subjects->isEmpty()) continue;

            foreach ($days as $dayIndex => $day) {
                foreach ($periods as $periodIndex => $period) {
                    $key = "{$grade->id}-{$day}-{$period['id']}";
                    $rotationSeed = $periodIndex + $gradeIndex * 3 + $dayIndex * 5;
                    $defaultSubject = $subjects[$rotationSeed % $subjects->count()];
                    $subjectName = $existing->has($key) ? $existing[$key]->subject : $defaultSubject->name;
                    $subjectModel = $subjects->firstWhere('name', $subjectName) ?? $defaultSubject;

                    $teacherId = null;
                    $assignKey = "{$grade->id}-{$subjectModel->id}";
                    if (isset($assignmentMap[$assignKey])) {
                        $candidateId = $assignmentMap[$assignKey];
                        $slotKey = "{$day}-{$period['id']}";
                        $teacherBusy[$candidateId] = $teacherBusy[$candidateId] ?? [];
                        if (!in_array($slotKey, $teacherBusy[$candidateId])) {
                            $teacherId = $candidateId;
                            $teacherBusy[$candidateId][] = $slotKey;
                        }
                    }

                    $rows[] = [
                        'grade_id' => $grade->id,
                        'day' => $day,
                        'period' => $period['id'],
                        'subject' => $subjectName,
                        'time' => $period['time'],
                        'teacher_id' => $teacherId,
                        'is_permanent' => true,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }
        }

        Timetable::upsert($rows, ['grade_id', 'day', 'period'], ['subject', 'time', 'teacher_id', 'is_permanent', 'updated_at']);
    }
}
