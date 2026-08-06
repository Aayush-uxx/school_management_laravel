<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Grade extends Model
{
    protected $fillable = ['grade', 'section']; 
    //
    public function timetables()
    {
        return $this->hasMany(Timetable::class);
    }
    public function subjects()
{
    return $this->belongsToMany(Subject::class, 'grade_subject');
}

public function assignments()
{
    return $this->hasMany(TeacherAssignment::class);
}
}
