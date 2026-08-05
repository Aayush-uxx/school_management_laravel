<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use App\Models\TeacherAssignment;
use App\Http\Controllers\TimetableController;

class AuthController extends Controller
{
    //
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:6',
            'employment_type' => 'required|in:full-time,part-time',
            'assignments' => 'required|array|min:1',
            'assignments.*.grade_id' => 'required|exists:grades,id',
            'assignments.*.subject_id' => 'required|exists:subjects,id',
        ]);

        $working_days = $request->employment_type === 'full-time'
            ? ['mon', 'tue', 'wed', 'thu', 'fri']
            : ['mon', 'wed', 'fri'];

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'teacher',
            'employment_type' => $request->employment_type,
            'working_days' => $working_days,
        ]);

        foreach ($request->assignments as $assignment) {
            TeacherAssignment::create([
                'user_id' => $user->id,
                'grade_id' => $assignment['grade_id'],
                'subject_id' => $assignment['subject_id'],
            ]);
        }
        TimetableController::generateMasterTimetable();
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'user' => $user->load('assignments.grade', 'assignments.subject'),
            'token' => $token,
        ], 201);
    }
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);
        $user = User::where('email', $request->email)->first();
        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid Email or Password'], 401);
        }
        $token = $user->createToken('auth-token')->plainTextToken;
        return response()->json([
            'success' => true,
            'user' => $user,
            'token' => $token,
        ], 200);
    }
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'current_password' => 'required_with:new_password',
            'new_password' => 'sometimes|min:6',
        ]);

        if ($request->new_password) {
            if (!Hash::check($request->current_password, $user->password)) {
                return response()->json(['message' => 'Current password is incorrect'], 401);
            }
            $user->password = Hash::make($request->new_password);
        }

        if ($request->email) {
            $user->email = $request->email;
        }

        $user->save();

        return response()->json(['success' => true, 'user' => $user]);
    }
}
