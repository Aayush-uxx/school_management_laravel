<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    //
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:6',
            'employment_type' => 'required|in:full-time,part-time',
        ]);
    
        $working_days = $request->employment_type === 'full-time'
            ? ['mon', 'tue', 'wed', 'thu', 'fri']
            : ['mon', 'wed', 'fri'];
    
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'teacher',
            'employment_type' => $request->employment_type,
            'working_days' => $working_days,
        ]);
    
        $token = $user->createToken('auth-token')->plainTextToken;
    
        return response()->json([
            'success' => true,
            'user' => $user,
            'token' => $token,
        ], 201);
    }
    public function login(Request $request){
        $request->validate([
            'email'=>'required|email',
            'password'=>'required'
        ]);
        $user = User::where('email',$request->email)->first();
        if(!$user || !Hash::check($request->password, $user->password)){
            return response()->json(['message'=>'Invalid Email or Password'],401);
        }
        $token=$user->createToken('auth-token')->plainTextToken;
        return response()->json([
            'success'=>true,
            'user'=>$user,
            'token'=>$token,
        ],200);
    }
}
