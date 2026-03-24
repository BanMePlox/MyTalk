<?php

namespace App\Events;

use App\Models\ServerEmoji;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ServerEmojiUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $action, // 'added' | 'deleted'
        public int $serverId,
        public ?int $emojiId = null,
        public ?array $emoji = null,
    ) {}

    public function broadcastOn(): array
    {
        return [new PresenceChannel('presence-server.' . $this->serverId)];
    }

    public function broadcastWith(): array
    {
        return [
            'action'    => $this->action,
            'server_id' => $this->serverId,
            'emoji_id'  => $this->emojiId,
            'emoji'     => $this->emoji,
        ];
    }
}
