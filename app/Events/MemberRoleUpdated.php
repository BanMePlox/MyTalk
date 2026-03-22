<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MemberRoleUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly int   $serverId,
        public readonly int   $userId,
        public readonly array $roles,
    ) {}

    public function broadcastAs(): string { return 'MemberRoleUpdated'; }

    public function broadcastOn(): array
    {
        return [new PresenceChannel("presence-server.{$this->serverId}")];
    }

    public function broadcastWith(): array
    {
        return [
            'user_id' => $this->userId,
            'roles'   => $this->roles,
        ];
    }
}
