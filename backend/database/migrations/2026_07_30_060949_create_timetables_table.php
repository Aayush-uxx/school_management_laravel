<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('timetables', function (Blueprint $table) {
            $table->id();
            $table->enum('day', ['sunday','monday','tuesday','wednesday','thursday','friday']);
            $table->string('subject');
            $table->integer('period');
            $table->string('time');
            $table->foreignId('grade_id')->constrained();
            $table->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_permanent')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('timetables');
    }
};
