<?php

namespace Database\Seeders;

use App\Http\Controllers\TimetableController;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(SchoolSetupSeeder::class);

        User::query()->updateOrCreate(
            ['email' => 'admin@test.com'],
            [
                'name' => 'School Administrator',
                'password' => Hash::make('123456'),
                'role' => 'admin',
            ],
        );

        User::query()->firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => Hash::make('password'),
                'role' => 'teacher',
            ],
        );

        TimetableController::generateMasterTimetable('school_setup');
    }
}
