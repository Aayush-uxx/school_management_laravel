<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Subject extends Model
{
    protected $fillable = ['name', 'code'];
    public function grades()
    {
        return $this->belongsToMany(Grade::class, 'grade_subject');
    }

    public function assignments()
    {
        return $this->hasMany(TeacherAssignment::class);
    }

    public function teachers()
    {
        return $this->belongsToMany(User::class, 'teacher_assignments')->distinct();
    }
}