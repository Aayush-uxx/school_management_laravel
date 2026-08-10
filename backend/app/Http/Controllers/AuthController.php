<?php

namespace App\Http\Controllers;

use App\Models\TeacherAssignment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'employment_type' => 'required|in:full-time,part-time',
            'assignments' => 'required|array|min:1',
            'assignments.*.grade_id' => 'required|integer|exists:grades,id',
            'assignments.*.subject_id' => 'required|integer|exists:subjects,id',
        ]);

        $assignments = collect($validated['assignments'])
            ->map(fn (array $assignment): array => [
                'grade_id' => (int) $assignment['grade_id'],
                'subject_id' => (int) $assignment['subject_id'],
            ])
            ->values();
        $assignmentKeys = $assignments
            ->map(fn (array $assignment): string => self::assignmentKey($assignment))
            ->all();

        if (count($assignmentKeys) !== count(array_unique($assignmentKeys))) {
            throw ValidationException::withMessages([
                'assignments' => ['Do not select the same grade and subject more than once.'],
            ]);
        }

        $workingDays = $validated['employment_type'] === 'full-time'
            ? ['mon', 'tue', 'wed', 'thu', 'fri']
            : ['mon', 'wed', 'fri'];

        $user = DB::transaction(function () use ($validated, $assignments, $workingDays): User {
            $pairs = DB::table('grade_subject')
                ->whereIn('grade_id', $assignments->pluck('grade_id')->unique()->all())
                ->whereIn('subject_id', $assignments->pluck('subject_id')->unique()->all())
                ->get(['grade_id', 'subject_id'])
                ->mapWithKeys(fn (object $pair): array => [
                    self::assignmentKey([
                        'grade_id' => (int) $pair->grade_id,
                        'subject_id' => (int) $pair->subject_id,
                    ]) => true,
                ]);

            $invalidPair = $assignments->first(
                fn (array $assignment): bool => ! $pairs->has(self::assignmentKey($assignment)),
            );

            if ($invalidPair) {
                throw ValidationException::withMessages([
                    'assignments' => ['Each selected subject must belong to its selected grade.'],
                ]);
            }

            $takenQuery = TeacherAssignment::query()->lockForUpdate();
            $takenQuery->where(function ($query) use ($assignments): void {
                foreach ($assignments as $assignment) {
                    $query->orWhere(function ($pairQuery) use ($assignment): void {
                        $pairQuery
                            ->where('grade_id', $assignment['grade_id'])
                            ->where('subject_id', $assignment['subject_id']);
                    });
                }
            });

            if ($takenQuery->exists()) {
                throw ValidationException::withMessages([
                    'assignments' => ['One or more selected class subjects are already assigned to another teacher.'],
                ]);
            }

            $user = User::query()->create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => 'teacher',
                'employment_type' => $validated['employment_type'],
                'working_days' => $workingDays,
            ]);

            $user->assignments()->createMany($assignments->map(
                fn (array $assignment): array => [
                    'grade_id' => $assignment['grade_id'],
                    'subject_id' => $assignment['subject_id'],
                ],
            )->all());

            return $user;
        });

        TimetableController::generateMasterTimetable('teacher_registered', $user->id);
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'user' => $user->load('assignments.grade', 'assignments.subject'),
            'token' => $token,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);
        $user = User::query()->where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return response()->json(['message' => 'Invalid Email or Password'], 401);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'email' => 'sometimes|email|unique:users,email,'.$user->id,
            'current_password' => 'required_with:new_password',
            'new_password' => 'sometimes|min:6',
        ]);

        if (! empty($validated['new_password'])) {
            if (! Hash::check($validated['current_password'], $user->password)) {
                return response()->json(['message' => 'Current password is incorrect'], 401);
            }
            $user->password = Hash::make($validated['new_password']);
        }

        if (! empty($validated['email'])) {
            $user->email = $validated['email'];
        }

        $user->save();

        return response()->json(['success' => true, 'user' => $user]);
    }

    /**
     * @param  array{grade_id:int, subject_id:int}  $assignment
     */
    private static function assignmentKey(array $assignment): string
    {
        return "{$assignment['grade_id']}-{$assignment['subject_id']}";
    }
}
