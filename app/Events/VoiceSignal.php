<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VoiceSignal implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $toUserId,
        public array $payload
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('App.Models.User.' . $this->toUserId),
        ];
    }

    public function broadcastWith(): array
    {
        return $this->payload;
    }

    public function broadcastAs(): string
    {
        return 'VoiceSignal';
    }
}
