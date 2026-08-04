<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Timetable extends Model
{
    //
    public function grade()
{
    return $this->belongsTo(Grade::class);
}

public function teacher()
{
    return $this->belongsTo(User::class, 'teacher_id');
}
}
