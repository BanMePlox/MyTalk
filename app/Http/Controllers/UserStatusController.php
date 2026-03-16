<?php

namespace App\Http\Controllers;

use App\Events\UserStatusChanged;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UserStatusController extends Controller
{
    public function update(Request $request)
    {
        $data = $request->validate(['status' => 'required|in:online,away,dnd']);

        $user = Auth::user();
        $user->update(['status' => $data['status']]);

        foreach ($user->servers as $server) {
            broadcast(new UserStatusChanged($user, $server->id))->toOthers();
        }

        return response()->json(['status' => $user->status]);
    }
}
