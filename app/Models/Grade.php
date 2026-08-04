<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Grade extends Model
{
    //
    public function timetables()
    {
        return $this->hasMany(Timetable::class);
    }
}
