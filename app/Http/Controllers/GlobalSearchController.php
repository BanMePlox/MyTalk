<?php

namespace App\Http\Controllers;

use App\Models\Channel;
use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GlobalSearchController extends Controller
{
    public function __invoke(Request $request)
    {
        $q = trim($request->string('q'));
        if (strlen($q) < 2) return response()->json([]);

        $serverIds = Auth::user()->servers()->pluck('servers.id');
        $channelIds = Channel::whereIn('server_id', $serverIds)->pluck('id');

        $results = Message::whereIn('channel_id', $channelIds)
            ->where('content', 'like', '%' . $q . '%')
            ->with('user', 'channel.server')
            ->latest()
            ->take(25)
            ->get()
            ->map(fn($m) => [
                'id'           => $m->id,
                'content'      => $m->content,
                'created_at'   => $m->created_at,
                'channel_id'   => $m->channel_id,
                'channel_name' => $m->channel->name,
                'server_name'  => $m->channel->server->name,
                'user'         => [
                    'id'         => $m->user->id,
                    'name'       => $m->user->name,
                    'avatar_url' => $m->user->avatar_url,
                ],
            ]);

        return response()->json($results);
    }
}
