<?php

namespace App\Http\Controllers;

use App\Models\LeaveRequest;
use Illuminate\Http\Request;

class LeaveController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
            'reason' => 'required|string',
        ]);

        $leave = LeaveRequest::create([
            'teacher_id' => $request->user()->id,
            'date' => $request->date,
            'reason' => $request->reason,
            'status' => 'pending',
        ]);
        return response()->json(['success' => true, 'leave' => $leave], 201);
    }
    public function myLeaves(Request $request)
    {
        $leaves = LeaveRequest::where('teacher_id', $request->user()->id)
            ->orderBy('date', 'desc')
            ->get();

        return response()->json(['success' => true, 'leaves' => $leaves]);
    }
    public function index()
    {
        $leaves = LeaveRequest::with('teacher', 'substitute', 'approver')
            ->orderBy('date', 'desc')
            ->get();

        return response()->json(['success' => true, 'leaves' => $leaves]);
    }
    public function approve($id)
    {
        $leave = LeaveRequest::findOrFail($id);
        $leave->update([
            'status'=>'approved',
            'approved_by'=>request()->user()->id,
        ]);
        return response()->json([
            'success'=>true,
            'message'=>'Approved !'
        ]);
    }
    public function reject($id){
        $leave = LeaveRequest::findOrFail($id);
        $leave->update([
            'status'=>'rejected',
            'approved_by'=>request()->user()->id,
        ]);
        return response()->json([
            'success'=>true,
            'message'=>'Rejected !'
        ]);
    }
}
