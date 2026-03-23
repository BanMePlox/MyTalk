<?php

namespace App\Http\Controllers;

use App\Events\ThreadMessageSent;
use App\Events\ThreadUpdated;
use App\Models\Channel;
use App\Models\Message;
use App\Models\Thread;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ThreadController extends Controller
{
    /** List all threads in a channel. */
    public function index(Channel $channel)
    {
        abort_if(!$channel->server, 404);
        abort_if(!$channel->server->members()->where('user_id', Auth::id())->exists(), 403);

        $threads = $channel->threads()
            ->with('starterMessage.user')
            ->orderByDesc('last_reply_at')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($t) => [
                'id'            => $t->id,
                'name'          => $t->name,
                'reply_count'   => $t->reply_count,
                'last_reply_at' => $t->last_reply_at,
                'created_at'    => $t->created_at,
                'starter_message' => $t->starterMessage ? [
                    'id'      => $t->starterMessage->id,
                    'content' => $t->starterMessage->content,
                    'user'    => [
                        'id'         => $t->starterMessage->user->id,
                        'name'       => $t->starterMessage->user->name,
                        'avatar_url' => $t->starterMessage->user->avatar_url,
                    ],
                ] : null,
            ]);

        return response()->json($threads);
    }

    /** Create a thread from a channel message (or return existing one). */
    public function create(Message $message)
    {
        $message->loadMissing('channel.server');
        $server = $message->channel->server;
        abort_if(!$server, 404);
        abort_if(!$server->members()->where('user_id', Auth::id())->exists(), 403);

        // Return existing thread if one already exists
        $thread = Thread::where('message_id', $message->id)->first();
        if ($thread) {
            return response()->json($thread);
        }

        $thread = Thread::create([
            'channel_id' => $message->channel_id,
            'message_id' => $message->id,
        ]);

        return response()->json($thread, 201);
    }

    /** Return thread metadata + starter message + all replies. */
    public function show(Thread $thread)
    {
        $thread->loadMissing('channel.server');
        abort_if(!$thread->channel->server->members()->where('user_id', Auth::id())->exists(), 403);

        $starter = $thread->starterMessage()->with('user')->first();

        $messages = $thread->messages()->get()->map(fn($m) => [
            'id'         => $m->id,
            'content'    => $m->content,
            'created_at' => $m->created_at,
            'user'       => [
                'id'           => $m->user->id,
                'name'         => $m->user->name,
                'avatar_url'   => $m->user->avatar_url,
                'banner_color' => $m->user->banner_color,
            ],
        ]);

        return response()->json([
            'thread'          => $thread,
            'starter_message' => $starter ? [
                'id'         => $starter->id,
                'content'    => $starter->content,
                'created_at' => $starter->created_at,
                'user'       => [
                    'id'           => $starter->user->id,
                    'name'         => $starter->user->name,
                    'avatar_url'   => $starter->user->avatar_url,
                    'banner_color' => $starter->user->banner_color,
                ],
            ] : null,
            'messages' => $messages,
        ]);
    }

    /** Rename a thread. */
    public function update(Request $request, Thread $thread)
    {
        $thread->loadMissing('channel.server');
        abort_if(!$thread->channel->server->members()->where('user_id', Auth::id())->exists(), 403);

        $data = $request->validate(['name' => 'nullable|string|max:100']);
        $thread->update(['name' => $data['name'] ?? null]);

        return response()->json(['name' => $thread->name]);
    }

    /** Post a reply message to a thread. */
    public function store(Request $request, Thread $thread)
    {
        $thread->loadMissing('channel.server');
        abort_if(!$thread->channel->server->members()->where('user_id', Auth::id())->exists(), 403);

        $data = $request->validate(['content' => 'required|string|max:2000']);

        $message = Message::create([
            'channel_id' => $thread->channel_id,
            'user_id'    => Auth::id(),
            'content'    => $data['content'],
            'thread_id'  => $thread->id,
        ]);

        $thread->increment('reply_count');
        $thread->update(['last_reply_at' => now()]);

        $message->load('user');

        broadcast(new ThreadMessageSent($message, $thread))->toOthers();
        broadcast(new ThreadUpdated($thread))->toOthers();

        return response()->json([
            'id'         => $message->id,
            'content'    => $message->content,
            'thread_id'  => $thread->id,
            'created_at' => $message->created_at,
            'user'       => [
                'id'           => $message->user->id,
                'name'         => $message->user->name,
                'avatar_url'   => $message->user->avatar_url,
                'banner_color' => $message->user->banner_color,
            ],
        ]);
    }
}
