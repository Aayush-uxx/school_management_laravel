<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\GradeController;
use App\Http\Controllers\LeaveController;
use App\Http\Controllers\SubjectController;
use App\Http\Controllers\TeacherController;
use App\Http\Controllers\TimetableController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::get('/subjects', [SubjectController::class, 'index']);
Route::get('/grades', [GradeController::class, 'index']);
Route::get('/timetable', [TimetableController::class, 'index']);
Route::get('/timetable/grade/{gradeId}', [TimetableController::class, 'byGrade']);
Route::get('/assignments/taken', [TeacherController::class, 'takenAssignments']);
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::put('/grades/{id}/subjects', [GradeController::class, 'attachSubjects']);
    Route::post('/subjects', [SubjectController::class, 'store']);
    Route::delete('/subjects/{id}', [SubjectController::class, 'destroy']);
    Route::post('/grades', [GradeController::class, 'store']);
    Route::delete('/grades/{id}', [GradeController::class, 'destroy']);
    Route::get('/leaves', [LeaveController::class, 'index']);
    Route::put('/leaves/{id}/approve', [LeaveController::class, 'approve']);
    Route::put('/leaves/{id}/reject', [LeaveController::class, 'reject']);
    Route::get('/teachers', [TeacherController::class, 'index']);
    Route::delete('/teachers/{id}', [TeacherController::class, 'destroy']);
    Route::get('/timetable/versions', [TimetableController::class, 'versions']);
    Route::get('/timetable/versions/{versionId}', [TimetableController::class, 'showVersion']);
});

Route::middleware(['auth:sanctum'])->group(function () {
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::get('/timetable/teacher/{teacherId}', [TimetableController::class, 'byTeacher']);
    Route::post('/leaves', [LeaveController::class, 'store']);
    Route::get('/leaves/my-leaves', [LeaveController::class, 'myLeaves']);
});
