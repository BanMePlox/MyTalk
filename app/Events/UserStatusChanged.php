<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly User $user,
        public readonly int $serverId,
    ) {}

    public function broadcastOn(): array
    {
        return [new PresenceChannel("presence-server.{$this->serverId}")];
    }

    public function broadcastWith(): array
    {
        return [
            'user_id' => $this->user->id,
            'status'  => $this->user->status,
        ];
    }
}
