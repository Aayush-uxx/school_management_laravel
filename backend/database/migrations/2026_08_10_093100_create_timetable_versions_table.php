<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('timetable_versions', function (Blueprint $table): void {
            $table->id();
            $table->unsignedInteger('version_number')->unique();
            $table->string('label');
            $table->enum('status', ['current', 'archived'])->index();
            $table->string('generated_reason')->nullable();
            $table->string('fingerprint', 64)->nullable()->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('generated_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('timetable_versions');
    }
};
