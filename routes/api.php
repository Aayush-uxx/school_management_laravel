<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\SubjectController;
use App\Http\Controllers\GradeController;
use App\Http\Controllers\TimetableController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::get('/subjects', [SubjectController::class, 'index']);
Route::get('/grades', [GradeController::class, 'index']);
Route::get('/timetable', [TimetableController::class, 'index']);
Route::get('/timetable/grade/{gradeId}', [TimetableController::class, 'byGrade']);

Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::post('/subjects', [SubjectController::class, 'store']);
    Route::delete('/subjects/{id}', [SubjectController::class, 'destroy']);
    Route::post('/grades', [GradeController::class, 'store']);
    Route::delete('/grades/{id}', [GradeController::class, 'destroy']);
});

Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/timetable/teacher/{teacherId}', [TimetableController::class, 'byTeacher']);
});