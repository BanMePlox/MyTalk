<?php

namespace App\Http\Controllers;

use App\Events\MentionReceived;
use App\Events\MessageSent;
use App\Models\Channel;
use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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

        // Resetear menciones no leídas de este servidor
        DB::table('unread_mentions')
            ->where('user_id', Auth::id())
            ->where('server_id', $channel->server_id)
            ->update(['count' => 0]);

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

        // Dispatch mention notifications
        $message->load('user', 'channel.server');
        $members = $channel->server->members()->where('user_id', '!=', Auth::id())->get();
        foreach ($members as $member) {
            if (str_contains($data['content'], '@' . $member->name)) {
                broadcast(new MentionReceived($message, $member));

                // Incrementar contador en BD
                DB::table('unread_mentions')->upsert(
                    ['user_id' => $member->id, 'server_id' => $channel->server_id, 'count' => 1],
                    ['user_id', 'server_id'],
                    ['count' => DB::raw('count + 1')]
                );
            }
        }

        return response()->json($message->load('user'));
    }
}
