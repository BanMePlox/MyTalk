<?php

namespace App\Http\Controllers;

use App\Models\Server;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ChannelController extends Controller
{
    public function store(Request $request, Server $server)
    {
        $this->authorize('view', $server);

        $member = $server->members()->where('user_id', Auth::id())->first();
        if (!$member || !in_array($member->pivot->role, ['owner', 'admin'])) {
            abort(403);
        }

        $data = $request->validate(['name' => 'required|string|max:100']);

        $server->channels()->create(['name' => strtolower(str_replace(' ', '-', $data['name']))]);

        return redirect()->route('servers.show', $server);
    }
}
