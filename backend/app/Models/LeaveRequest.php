<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveRequest extends Model
{
    protected $fillable = ['teacher_id', 'substitute_teacher_id', 'approved_by', 'date', 'reason', 'status'];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function substitute()
    {
        return $this->belongsTo(User::class, 'substitute_teacher_id');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}