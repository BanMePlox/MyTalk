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
        $this->authorize('view', $channel->server);

        $messages = $channel->messages()
            ->with('user')
            ->latest()
            ->take(50)
            ->get()
            ->reverse()
            ->values();

        return Inertia::render('Channels/Show', [
            'channel'  => $channel->load('server.channels'),
            'messages' => $messages,
        ]);
    }

    public function store(Request $request, Channel $channel)
    {
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
