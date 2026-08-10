<?php

namespace Database\Seeders;

use App\Models\Grade;
use App\Models\Subject;
use Illuminate\Database\Seeder;

class SchoolSetupSeeder extends Seeder
{
    /**
     * Seed the school's default curriculum and grade sections.
     */
    public function run(): void
    {
        $subjectDefinitions = [
            ['name' => 'Mathematics', 'code' => 'MATH'],
            ['name' => 'English', 'code' => 'ENG'],
            ['name' => 'Science', 'code' => 'SCI'],
            ['name' => 'Social Studies', 'code' => 'SST'],
            ['name' => 'Computer', 'code' => 'COMP'],
            ['name' => 'Nepali', 'code' => 'np03'],
            ['name' => 'Health and Physical Education', 'code' => 'HPE'],
            ['name' => 'Moral Education', 'code' => 'MOR'],
        ];

        $legacyNames = [
            'Mathematics' => ['Math'],
        ];

        $subjects = collect($subjectDefinitions)->map(function (array $definition) use ($legacyNames): Subject {
            $subject = Subject::query()
                ->where('name', $definition['name'])
                ->orWhereIn('name', $legacyNames[$definition['name']] ?? [])
                ->first();

            if ($subject) {
                $subject->update([
                    'name' => $definition['name'],
                    'code' => $definition['code'],
                ]);

                return $subject->refresh();
            }

            return Subject::query()->firstOrCreate(
                ['code' => $definition['code']],
                ['name' => $definition['name']],
            );
        });

        foreach (range(1, 10) as $gradeNumber) {
            foreach (['A', 'B'] as $section) {
                $grade = Grade::query()->firstOrCreate([
                    'grade' => $gradeNumber,
                    'section' => $section,
                ]);

                $grade->subjects()->syncWithoutDetaching($subjects->pluck('id')->all());
            }
        }
    }
}
