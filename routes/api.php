<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\SubjectController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::get('/subjects', [SubjectController::class, 'index']);

Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::post('/subjects', [SubjectController::class, 'store']);
    Route::delete('/subjects/{id}', [SubjectController::class, 'destroy']);
});