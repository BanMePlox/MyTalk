<?php

namespace App\Http\Controllers;

use App\Events\MessageReactionUpdated;
use App\Models\Message;
use App\Models\MessageReaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReactionController extends Controller
{
    private const ALLOWED = ['👍','👎','❤️','😂','😮','😢','🎉','🔥'];

    public function toggle(Request $request, Message $message)
    {
        $data = $request->validate(['emoji' => 'required|string|max:8']);
        abort_if(!in_array($data['emoji'], self::ALLOWED), 422);

        $channel = $message->channel;
        abort_if(!$channel, 404);
        $this->authorize('view', $channel->server);

        $userId = Auth::id();
        $existing = MessageReaction::where([
            'message_id' => $message->id,
            'user_id'    => $userId,
            'emoji'      => $data['emoji'],
        ])->first();

        if ($existing) {
            $existing->delete();
        } else {
            MessageReaction::create([
                'message_id' => $message->id,
                'user_id'    => $userId,
                'emoji'      => $data['emoji'],
            ]);
        }

        $message->load('reactions');
        $grouped = $message->reactionsGrouped();

        broadcast(new MessageReactionUpdated($channel->id, $message->id, $grouped));

        return response()->json($grouped);
    }
}
