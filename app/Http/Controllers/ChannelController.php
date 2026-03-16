<?php

namespace App\Http\Controllers;

use App\Models\Server;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ChannelController extends Controller
{
    public function store(Request $request, Server $server)
    {
        $this->authorize('manageChannels', $server);

        $data = $request->validate(['name' => 'required|string|max:100']);

        $server->channels()->create(['name' => strtolower(str_replace(' ', '-', $data['name']))]);

        return redirect()->route('servers.show', $server);
    }
}
