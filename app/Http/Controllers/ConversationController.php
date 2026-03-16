<?php

namespace App\Http\Controllers;

use App\Events\DirectMessageSent;
use App\Events\NewDirectMessage;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ConversationController extends Controller
{
    // Redirige a la conversación más reciente o muestra lista vacía
    public function index()
    {
        $authId = Auth::id();

        $latest = Conversation::whereHas('users', fn($q) => $q->where('user_id', $authId))
            ->latest()
            ->first();

        if ($latest) {
            return redirect()->route('conversations.show', $latest);
        }

        $userServers = Auth::user()->servers()->get()->each(function ($server) {
            $server->first_channel_id = $server->channels()->value('id');
        });

        return Inertia::render('Conversations/Index', [
            'userServers' => $userServers,
        ]);
    }

    // Abre o crea una conversación con otro usuario
    public function open(User $user)
    {
        $authId = Auth::id();

        abort_if($user->id === $authId, 403);

        // Buscar conversación existente entre los dos
        $conversation = Conversation::whereHas('users', fn($q) => $q->where('user_id', $authId))
            ->whereHas('users', fn($q) => $q->where('user_id', $user->id))
            ->first();

        if (!$conversation) {
            $conversation = Conversation::create();
            $conversation->users()->attach([$authId, $user->id]);
        }

        return redirect()->route('conversations.show', $conversation);
    }

    // Muestra una conversación
    public function show(Conversation $conversation)
    {
        $authId = Auth::id();
        abort_unless($conversation->users()->where('user_id', $authId)->exists(), 403);

        $conversation->load('users');
        $other = $conversation->otherUser($authId);

        $messages = $conversation->messages()
            ->with('user')
            ->latest()
            ->take(50)
            ->get()
            ->reverse()
            ->values();

        $userServers = Auth::user()->servers()->get()->each(function ($server) {
            $server->first_channel_id = $server->channels()->value('id');
        });

        $conversations = Conversation::whereHas('users', fn($q) => $q->where('user_id', $authId))
            ->with(['users' => fn($q) => $q->where('user_id', '!=', $authId)])
            ->withCount('messages')
            ->get();

        // Marcar como leído hasta el último mensaje
        $latestId = $conversation->messages()->max('id');
        if ($latestId) {
            $conversation->users()->updateExistingPivot($authId, ['last_read_message_id' => $latestId]);
        }

        return Inertia::render('Conversations/Show', [
            'conversation' => $conversation,
            'other'        => $other,
            'messages'     => $messages,
            'userServers'  => $userServers,
            'conversations' => $conversations,
        ]);
    }

    // Envía un mensaje
    public function store(Request $request, Conversation $conversation)
    {
        $authId = Auth::id();
        abort_unless($conversation->users()->where('user_id', $authId)->exists(), 403);

        $request->validate(['content' => 'required|string|max:4000']);

        $message = $conversation->messages()->create([
            'user_id' => $authId,
            'content' => $request->content,
        ]);

        broadcast(new DirectMessageSent($message));

        $message->load('user');

        // Marcar como leído para el emisor
        $conversation->users()->updateExistingPivot($authId, ['last_read_message_id' => $message->id]);

        // Notificar al receptor
        $conversation->load('users');
        $recipient = $conversation->otherUser($authId);
        if ($recipient) {
            broadcast(new NewDirectMessage($message, $recipient));
        }

        return response()->json([
            'id'         => $message->id,
            'content'    => $message->content,
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

