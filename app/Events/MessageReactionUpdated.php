<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageReactionUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly int $channelId,
        public readonly int $messageId,
        public readonly array $reactions,
    ) {}

    public function broadcastAs(): string { return 'MessageReactionUpdated'; }

    public function broadcastOn(): array
    {
        return [new PrivateChannel("channel.{$this->channelId}")];
    }

    public function broadcastWith(): array
    {
        return [
            'message_id' => $this->messageId,
            'reactions'  => $this->reactions,
        ];
    }
}
