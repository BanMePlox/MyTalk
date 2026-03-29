<?php

namespace App\Http\Controllers;

use App\Events\DmCallInvite;
use App\Events\VoiceSignal;
use App\Models\Conversation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ConversationVoiceController extends Controller
{
    public function signal(Request $request, Conversation $conversation)
    {
        $data = $request->validate([
            'to_user_id' => 'required|integer|exists:users,id',
            'type'       => 'required|in:offer,answer,ice,screen-share-stop,screen-share-start',
            'sdp'        => 'nullable|string',
            'candidate'  => 'nullable|array',
        ]);

        $user = $request->user();
        abort_unless($conversation->users()->where('user_id', $user->id)->exists(), 403);

        broadcast(new VoiceSignal((int) $data['to_user_id'], [
            'type'            => $data['type'],
            'sdp'             => $data['sdp'] ?? null,
            'candidate'       => $data['candidate'] ?? null,
            'from_user_id'    => $user->id,
            'conversation_id' => $conversation->id,
        ]));

        return response()->noContent();
    }

    public function presence(Request $request, Conversation $conversation)
    {
        $data = $request->validate(['action' => 'required|in:join,leave']);

        $user = $request->user();
        abort_unless($conversation->users()->where('user_id', $user->id)->exists(), 403);

        $cacheKey  = "dm_voice_participants_{$conversation->id}";
        $userEntry = ['id' => $user->id, 'name' => $user->name, 'avatar_url' => $user->avatar_url];

        $participants = Cache::get($cacheKey, []);
        if ($data['action'] === 'join') {
            $participants[$user->id] = $userEntry;
        } else {
            unset($participants[$user->id]);
        }
        Cache::put($cacheKey, $participants, now()->addHours(8));

        return response()->noContent();
    }

    public function invite(Request $request, Conversation $conversation)
    {
        $data = $request->validate(['action' => 'required|in:invite,cancel,decline']);

        $user = $request->user();
        abort_unless($conversation->users()->where('user_id', $user->id)->exists(), 403);

        $fromUser = ['id' => $user->id, 'name' => $user->name, 'avatar_url' => $user->avatar_url];

        $conversation->users()->where('user_id', '!=', $user->id)->each(function ($other) use ($data, $fromUser, $conversation) {
            broadcast(new DmCallInvite($other->id, [
                'action'          => $data['action'],
                'from_user'       => $fromUser,
                'conversation_id' => $conversation->id,
            ]));
        });

        return response()->noContent();
    }
}
