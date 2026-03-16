<?php

namespace App\Http\Controllers;

use App\Events\MessageSent;
use App\Models\Channel;
use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class MessageController extends Controller
{
    public function index(Channel $channel): Response
    {
        abort_if(!$channel->server, 404);
        $this->authorize('view', $channel->server);

        $messages = $channel->messages()
            ->with('user')
            ->latest()
            ->take(50)
            ->get()
            ->reverse()
            ->values();

        $userServers = Auth::user()->servers()->get()->each(function ($server) {
            $server->first_channel_id = $server->channels()->value('id');
        });

        return Inertia::render('Channels/Show', [
            'channel'     => $channel->load('server.channels', 'server.members'),
            'messages'    => $messages,
            'userServers' => $userServers,
        ]);
    }

    public function more(Request $request, Channel $channel)
    {
        abort_if(!$channel->server, 404);
        $this->authorize('view', $channel->server);

        $query = $channel->messages()->with('user')->latest();

        if ($request->filled('before')) {
            $query->where('id', '<', $request->integer('before'));
        }

        $messages = $query->take(50)->get()->reverse()->values();

        return response()->json($messages);
    }

    public function store(Request $request, Channel $channel)
    {
        abort_if(!$channel->server, 404);
        $this->authorize('view', $channel->server);

        $data = $request->validate(['content' => 'required|string|max:2000']);

        $message = Message::create([
            'channel_id' => $channel->id,
            'user_id'    => Auth::id(),
            'content'    => $data['content'],
        ]);

        broadcast(new MessageSent($message))->toOthers();

        return response()->json($message->load('user'));
    }
}
