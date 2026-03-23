<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ServerNameUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly int $serverId,
        public readonly string $name,
    ) {}

    public function broadcastAs(): string
    {
        return 'ServerNameUpdated';
    }

    public function broadcastOn(): array
    {
        return [new PresenceChannel("presence-server.{$this->serverId}")];
    }

    public function broadcastWith(): array
    {
        return [
            'server_id' => $this->serverId,
            'name'      => $this->name,
        ];
    }
}
