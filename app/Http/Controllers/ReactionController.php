<?php

namespace App\Http\Controllers;

use App\Events\MessageReactionUpdated;
use App\Models\Message;
use App\Models\MessageReaction;
use App\Models\UserEmoji;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReactionController extends Controller
{
    private const ALLOWED_UNICODE = ['👍','👎','❤️','😂','😮','😢','🎉','🔥'];

    public function toggle(Request $request, Message $message)
    {
        $data = $request->validate(['emoji' => 'required|string|max:50']);
        $emoji = $data['emoji'];

        $channel = $message->channel;
        abort_if(!$channel, 404);
        $this->authorize('view', $channel->server);

        // Validate emoji is one of: preset unicode, server custom (:name:), or user personal (ue:{id})
        if (!in_array($emoji, self::ALLOWED_UNICODE)) {
            if (preg_match('/^:([a-z0-9_]+):$/', $emoji, $m)) {
                // Server emoji — must belong to this server
                abort_unless(
                    $channel->server->emojis()->where('name', $m[1])->exists(),
                    422
                );
            } elseif (preg_match('/^ue:(\d+)$/', $emoji, $m)) {
                // User personal emoji — must exist
                abort_unless(UserEmoji::where('id', $m[1])->exists(), 422);
            } else {
                abort(422);
            }
        }

        $userId = Auth::id();
        $existing = MessageReaction::where([
            'message_id' => $message->id,
            'user_id'    => $userId,
            'emoji'      => $emoji,
        ])->first();

        if ($existing) {
            $existing->delete();
        } else {
            MessageReaction::create([
                'message_id' => $message->id,
                'user_id'    => $userId,
                'emoji'      => $emoji,
            ]);
        }

        $message->load('reactions');
        $grouped = $message->reactionsGrouped();

        broadcast(new MessageReactionUpdated($channel->id, $message->id, $grouped));

        return response()->json($grouped);
    }
}
