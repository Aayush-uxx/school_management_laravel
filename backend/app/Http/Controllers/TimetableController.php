<?php

namespace App\Http\Controllers;

use App\Models\Grade;
use App\Models\TeacherAssignment;
use App\Models\Timetable;
use App\Models\TimetableVersion;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class TimetableController extends Controller
{
    private const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    private const PERIODS = [
        1 => '10:00-10:45',
        2 => '10:45-11:30',
        4 => '11:45-12:30',
        5 => '12:30-1:15',
        7 => '2:00-2:45',
        8 => '2:45-3:30',
        9 => '3:30-4:15',
        10 => '4:15-5:00',
    ];

    public function index(): JsonResponse
    {
        return response()->json($this->currentTimetablePayload());
    }

    public function byGrade(int $gradeId): JsonResponse
    {
        Grade::query()->findOrFail($gradeId);
        $version = $this->currentVersion();

        return response()->json([
            'success' => true,
            'version' => $version ? $this->versionSummary($version) : null,
            'timetable' => $version
                ? $this->orderedTimetable()
                    ->where('timetable_version_id', $version->id)
                    ->where('grade_id', $gradeId)
                    ->with('teacher')
                    ->get()
                : [],
        ]);
    }

    public function byTeacher(int $teacherId): JsonResponse
    {
        $viewer = request()->user();

        abort_unless(
            $viewer && ($viewer->role === 'admin' || $viewer->id === $teacherId),
            403,
            'You can only view your own timetable.',
        );

        $version = $this->currentVersion();

        return response()->json([
            'success' => true,
            'version' => $version ? $this->versionSummary($version, null, $teacherId) : null,
            'timetable' => $version
                ? $this->orderedTimetable()
                    ->where('timetable_version_id', $version->id)
                    ->where('teacher_id', $teacherId)
                    ->with('grade')
                    ->get()
                : [],
        ]);
    }

    public function versions(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'grade_id' => 'sometimes|integer|exists:grades,id',
        ]);
        $gradeId = $validated['grade_id'] ?? null;

        $versions = TimetableVersion::query()
            ->orderByDesc('version_number')
            ->get()
            ->map(fn (TimetableVersion $version): array => $this->versionSummary($version, $gradeId))
            ->values();

        return response()->json([
            'success' => true,
            'versions' => $versions,
        ]);
    }

    public function showVersion(Request $request, int $versionId): JsonResponse
    {
        $validated = $request->validate([
            'grade_id' => 'sometimes|integer|exists:grades,id',
        ]);
        $gradeId = $validated['grade_id'] ?? null;
        $version = TimetableVersion::query()->findOrFail($versionId);
        $rows = $this->orderedTimetable()
            ->where('timetable_version_id', $version->id)
            ->when($gradeId, fn (Builder $query) => $query->where('grade_id', $gradeId))
            ->with('grade', 'teacher')
            ->get();

        return response()->json([
            'success' => true,
            'version' => $this->versionSummary($version, $gradeId),
            'timetable' => $rows,
        ]);
    }

    public static function generateMasterTimetable(?string $reason = null, ?int $createdBy = null): ?TimetableVersion
    {
        $grades = Grade::query()
            ->with(['subjects' => fn ($query) => $query->orderBy('subjects.id')])
            ->orderBy('grade')
            ->orderBy('section')
            ->get();

        $assignments = TeacherAssignment::query()
            ->with('teacher')
            ->get()
            ->groupBy(fn (TeacherAssignment $assignment): string => self::pairKey(
                $assignment->grade_id,
                $assignment->subject_id,
            ));

        $rows = self::buildRows($grades, $assignments);
        $fingerprint = self::fingerprint($rows);

        return DB::transaction(function () use ($rows, $fingerprint, $reason, $createdBy): ?TimetableVersion {
            $current = TimetableVersion::query()
                ->where('status', 'current')
                ->lockForUpdate()
                ->first();

            if ($current) {
                $current->update(['status' => 'archived']);
            }

            if ($rows === []) {
                return null;
            }

            $versionNumber = ((int) TimetableVersion::query()->max('version_number')) + 1;
            $now = now();
            $version = TimetableVersion::query()->create([
                'version_number' => $versionNumber,
                'label' => "Timetable version {$versionNumber}",
                'status' => 'current',
                'generated_reason' => $reason,
                'fingerprint' => $fingerprint,
                'created_by' => $createdBy,
                'generated_at' => $now,
            ]);

            Timetable::query()->insert(array_map(
                fn (array $row): array => [...$row, 'timetable_version_id' => $version->id],
                $rows,
            ));

            return $version;
        });
    }

    private function currentTimetablePayload(): array
    {
        $version = $this->currentVersion();

        return [
            'success' => true,
            'version' => $version ? $this->versionSummary($version) : null,
            'timetable' => $version
                ? $this->orderedTimetable()
                    ->where('timetable_version_id', $version->id)
                    ->with('grade', 'teacher')
                    ->get()
                : [],
        ];
    }

    private function currentVersion(): ?TimetableVersion
    {
        return TimetableVersion::query()
            ->where('status', 'current')
            ->latest('version_number')
            ->first();
    }

    private function versionSummary(TimetableVersion $version, ?int $gradeId = null, ?int $teacherId = null): array
    {
        $rows = $version->rows()
            ->when($gradeId, fn (Builder $query) => $query->where('grade_id', $gradeId))
            ->when($teacherId, fn (Builder $query) => $query->where('teacher_id', $teacherId));

        return [
            'id' => $version->id,
            'version_number' => $version->version_number,
            'label' => $version->label,
            'status' => $version->status,
            'generated_reason' => $version->generated_reason,
            'generated_at' => $version->generated_at?->toISOString(),
            'created_by' => $version->created_by,
            'grade_count' => (clone $rows)->distinct('grade_id')->count('grade_id'),
            'row_count' => $rows->count(),
        ];
    }

    private function orderedTimetable(): Builder
    {
        return Timetable::query()
            ->orderByRaw("CASE day WHEN 'monday' THEN 1 WHEN 'tuesday' THEN 2 WHEN 'wednesday' THEN 3 WHEN 'thursday' THEN 4 WHEN 'friday' THEN 5 ELSE 6 END")
            ->orderBy('period');
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private static function buildRows(Collection $grades, Collection $assignments): array
    {
        $rows = [];
        $teacherBusy = [];
        $teacherLoad = [];
        $now = now();

        foreach ($grades as $gradeIndex => $grade) {
            if ($grade->subjects->isEmpty()) {
                continue;
            }

            $subjectCounts = [];
            $lastSubjectByDay = [];
            $subjectCount = $grade->subjects->count();

            foreach (self::DAYS as $dayIndex => $day) {
                foreach (array_keys(self::PERIODS) as $periodIndex => $periodId) {
                    $subject = self::chooseSubject(
                        $grade->subjects,
                        $subjectCounts,
                        $lastSubjectByDay[$day] ?? null,
                        $dayIndex,
                        $periodIndex,
                        $gradeIndex,
                        $subjectCount,
                    );
                    $subjectCounts[$subject->id] = ($subjectCounts[$subject->id] ?? 0) + 1;
                    $lastSubjectByDay[$day] = $subject->id;

                    $teacher = self::chooseTeacher(
                        $assignments->get(self::pairKey($grade->id, $subject->id), collect()),
                        $day,
                        $periodId,
                        $teacherBusy,
                        $teacherLoad,
                    );

                    $rows[] = [
                        'grade_id' => $grade->id,
                        'day' => $day,
                        'period' => $periodId,
                        'subject' => $subject->name,
                        'time' => self::PERIODS[$periodId],
                        'teacher_id' => $teacher?->id,
                        'is_permanent' => true,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }
        }

        return $rows;
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     */
    private static function fingerprint(array $rows): string
    {
        $normalizedRows = array_map(
            fn (array $row): array => [
                'grade_id' => $row['grade_id'],
                'day' => $row['day'],
                'period' => $row['period'],
                'subject' => $row['subject'],
                'time' => $row['time'],
                'teacher_id' => $row['teacher_id'],
            ],
            $rows,
        );

        usort($normalizedRows, fn (array $left, array $right): int => strcmp(
            json_encode($left, JSON_THROW_ON_ERROR),
            json_encode($right, JSON_THROW_ON_ERROR),
        ));

        return hash('sha256', json_encode($normalizedRows, JSON_THROW_ON_ERROR));
    }

    private static function pairKey(int $gradeId, int $subjectId): string
    {
        return "{$gradeId}-{$subjectId}";
    }

    private static function chooseSubject(
        Collection $subjects,
        array $subjectCounts,
        ?int $lastSubjectId,
        int $dayIndex,
        int $periodIndex,
        int $gradeIndex,
        int $subjectCount,
    ): object {
        $minimumCount = $subjects
            ->map(fn ($subject): int => $subjectCounts[$subject->id] ?? 0)
            ->min();

        $candidates = $subjects->filter(
            fn ($subject): bool => ($subjectCounts[$subject->id] ?? 0) === $minimumCount,
        );

        $withoutSameDayRepeat = $candidates->filter(
            fn ($subject): bool => $subject->id !== $lastSubjectId,
        );
        $candidates = $withoutSameDayRepeat->isNotEmpty() ? $withoutSameDayRepeat : $candidates;

        $orderedCandidates = $candidates->sortBy(
            fn ($subject): int => ($subject->id + $dayIndex + $periodIndex + $gradeIndex) % max($subjectCount, 1),
        )->values();

        return $orderedCandidates->first() ?? $subjects->first();
    }

    private static function chooseTeacher(
        Collection $assignments,
        string $day,
        int $periodId,
        array &$teacherBusy,
        array &$teacherLoad,
    ): ?object {
        $eligible = $assignments->filter(function (TeacherAssignment $assignment) use ($day, $periodId, $teacherBusy): bool {
            $teacher = $assignment->teacher;

            if (! $teacher) {
                return false;
            }

            $workingDays = self::workingDaysFor($teacher);
            $slotKey = "{$day}-{$periodId}";

            return in_array($day, $workingDays, true)
                && ! in_array($slotKey, $teacherBusy[$teacher->id] ?? [], true);
        });

        $selectedAssignment = $eligible
            ->sort(function (TeacherAssignment $left, TeacherAssignment $right) use ($teacherLoad): int {
                $leftLoad = $teacherLoad[$left->teacher->id] ?? 0;
                $rightLoad = $teacherLoad[$right->teacher->id] ?? 0;

                return $leftLoad === $rightLoad
                    ? $left->teacher->id <=> $right->teacher->id
                    : $leftLoad <=> $rightLoad;
            })
            ->first();

        if (! $selectedAssignment || ! $selectedAssignment->teacher) {
            return null;
        }

        $teacherId = $selectedAssignment->teacher->id;
        $slotKey = "{$day}-{$periodId}";
        $teacherBusy[$teacherId] ??= [];
        $teacherBusy[$teacherId][] = $slotKey;
        $teacherLoad[$teacherId] = ($teacherLoad[$teacherId] ?? 0) + 1;

        return $selectedAssignment->teacher;
    }

    /**
     * @return array<int, string>
     */
    private static function workingDaysFor(object $teacher): array
    {
        $workingDays = $teacher->working_days;

        if (! is_array($workingDays) || $workingDays === []) {
            $workingDays = $teacher->employment_type === 'part-time'
                ? ['mon', 'wed', 'fri']
                : self::DAYS;
        }

        return collect($workingDays)
            ->map(fn ($day): string => self::normalizeDay((string) $day))
            ->filter(fn (string $day): bool => in_array($day, self::DAYS, true))
            ->unique()
            ->values()
            ->all();
    }

    private static function normalizeDay(string $day): string
    {
        return match (strtolower(trim($day))) {
            'mon', 'monday' => 'monday',
            'tue', 'tues', 'tuesday' => 'tuesday',
            'wed', 'wednesday' => 'wednesday',
            'thu', 'thur', 'thurs', 'thursday' => 'thursday',
            'fri', 'friday' => 'friday',
            default => strtolower(trim($day)),
        };
    }
}
