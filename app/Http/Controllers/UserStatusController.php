<?php

namespace App\Http\Controllers;

use App\Events\UserProfileUpdated;
use App\Events\UserStatusChanged;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UserStatusController extends Controller
{
    public function update(Request $request)
    {
        $data = $request->validate([
            'status'        => 'sometimes|in:online,away,dnd',
            'custom_status' => 'sometimes|nullable|string|max:60',
        ]);

        $user = Auth::user();

        if (isset($data['status'])) {
            $user->update(['status' => $data['status']]);
            foreach ($user->servers as $server) {
                broadcast(new UserStatusChanged($user, $server->id))->toOthers();
            }
        }

        if (array_key_exists('custom_status', $data)) {
            $user->update(['custom_status' => $data['custom_status']]);
            foreach ($user->servers as $server) {
                broadcast(new UserProfileUpdated($user, $server->id))->toOthers();
            }
        }

        return response()->json([
            'status'        => $user->status,
            'custom_status' => $user->custom_status,
        ]);
    }
}
