<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('timetables', 'timetable_version_id')) {
            Schema::table('timetables', function (Blueprint $table): void {
                $table->foreignId('timetable_version_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('timetable_versions');
            });
        }

        $versionId = DB::table('timetable_versions')
            ->where('version_number', 1)
            ->value('id');

        if (! $versionId && DB::table('timetables')->exists()) {
            $versionId = DB::table('timetable_versions')->insertGetId([
                'version_number' => 1,
                'label' => 'Imported timetable',
                'status' => 'current',
                'generated_reason' => 'legacy_import',
                'generated_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        if ($versionId) {
            DB::table('timetables')
                ->whereNull('timetable_version_id')
                ->update(['timetable_version_id' => $versionId]);
        }

        Schema::table('timetables', function (Blueprint $table): void {
            if (! Schema::hasIndex('timetables', 'timetables_grade_id_index')) {
                $table->index('grade_id');
            }
        });

        if (Schema::hasIndex('timetables', 'timetables_grade_id_day_period_unique')) {
            Schema::table('timetables', function (Blueprint $table): void {
                $table->dropUnique('timetables_grade_id_day_period_unique');
            });
        }

        if (! Schema::hasIndex('timetables', 'timetables_timetable_version_id_grade_id_day_period_unique')) {
            Schema::table('timetables', function (Blueprint $table): void {
                $table->unique(['timetable_version_id', 'grade_id', 'day', 'period']);
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasIndex('timetables', 'timetables_timetable_version_id_grade_id_day_period_unique')) {
            Schema::table('timetables', function (Blueprint $table): void {
                $table->dropUnique('timetables_timetable_version_id_grade_id_day_period_unique');
            });
        }

        if (Schema::hasColumn('timetables', 'timetable_version_id')) {
            Schema::table('timetables', function (Blueprint $table): void {
                $table->dropForeign(['timetable_version_id']);
                $table->dropColumn('timetable_version_id');
            });
        }

        if (! Schema::hasIndex('timetables', 'timetables_grade_id_day_period_unique')) {
            Schema::table('timetables', function (Blueprint $table): void {
                $table->unique(['grade_id', 'day', 'period']);
            });
        }
    }
};
