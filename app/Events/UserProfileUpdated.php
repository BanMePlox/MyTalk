<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserProfileUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly User $user,
        public readonly int $serverId,
    ) {}

    public function broadcastAs(): string { return 'UserProfileUpdated'; }

    public function broadcastOn(): array
    {
        return [new PresenceChannel("presence-server.{$this->serverId}")];
    }

    public function broadcastWith(): array
    {
        return [
            'user_id'      => $this->user->id,
            'name'         => $this->user->name,
            'avatar_url'   => $this->user->avatar_url,
            'banner_color' => $this->user->banner_color,
        ];
    }
}
