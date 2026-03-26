<?php

namespace App\Http\Controllers;

use App\Events\VoicePresenceChanged;
use App\Events\VoiceSignal;
use App\Models\Channel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class VoiceController extends Controller
{
    public function signal(Request $request, Channel $channel)
    {
        $data = $request->validate([
            'to_user_id' => 'required|integer|exists:users,id',
            'type'       => 'required|in:offer,answer,ice',
            'sdp'        => 'nullable|string',
            'candidate'  => 'nullable|array',
        ]);

        // Verify sender is a member of the server
        abort_unless(
            $channel->server->members()->where('user_id', $request->user()->id)->exists(),
            403
        );

        broadcast(new VoiceSignal((int) $data['to_user_id'], [
            'type'         => $data['type'],
            'sdp'          => $data['sdp'] ?? null,
            'candidate'    => $data['candidate'] ?? null,
            'from_user_id' => $request->user()->id,
            'channel_id'   => $channel->id,
        ]));

        return response()->noContent();
    }

    public function presence(Request $request, Channel $channel)
    {
        $data = $request->validate([
            'action' => 'required|in:join,leave',
        ]);

        abort_unless(
            $channel->server->members()->where('user_id', $request->user()->id)->exists(),
            403
        );

        $user       = $request->user();
        $cacheKey   = "voice_participants_{$channel->id}";
        $userEntry  = ['id' => $user->id, 'name' => $user->name, 'avatar_url' => $user->avatar_url];

        $participants = Cache::get($cacheKey, []);

        if ($data['action'] === 'join') {
            $participants[$user->id] = $userEntry;
        } else {
            unset($participants[$user->id]);
        }

        Cache::put($cacheKey, $participants, now()->addHours(8));

        broadcast(new VoicePresenceChanged(
            $channel->server_id,
            $data['action'],
            $userEntry,
            $channel->id
        ));

        return response()->noContent();
    }
}
