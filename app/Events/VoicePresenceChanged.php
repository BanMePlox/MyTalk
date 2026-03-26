<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VoicePresenceChanged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int    $serverId,
        public string $action,   // 'join' | 'leave'
        public array  $user,     // { id, name, avatar_url }
        public int    $channelId
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PresenceChannel('presence-server.' . $this->serverId),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'action'     => $this->action,
            'user'       => $this->user,
            'channel_id' => $this->channelId,
        ];
    }

    public function broadcastAs(): string
    {
        return 'VoicePresenceChanged';
    }
}
