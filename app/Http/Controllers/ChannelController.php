<?php

namespace App\Http\Controllers;

use App\Models\Channel;
use App\Models\Server;
use Illuminate\Http\Request;

class ChannelController extends Controller
{
    public function store(Request $request, Server $server)
    {
        $this->authorize('manageChannels', $server);

        $data = $request->validate(['name' => 'required|string|max:100']);

        $server->channels()->create(['name' => strtolower(str_replace(' ', '-', $data['name']))]);

        return redirect()->route('servers.show', $server);
    }

    public function destroy(Channel $channel)
    {
        $server = $channel->server;

        $this->authorize('manageChannels', $server);

        if ($server->channels()->count() <= 1) {
            return back()->withErrors(['channel' => 'El servidor debe tener al menos un canal.']);
        }

        $channel->delete();

        return redirect()->route('servers.show', $server);
    }
}
