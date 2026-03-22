<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FriendRequestAccepted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public User $accepter, public User $originalSender) {}

    public function broadcastAs(): string { return 'FriendRequestAccepted'; }

    public function broadcastOn(): array
    {
        return [new PrivateChannel("App.Models.User.{$this->originalSender->id}")];
    }

    public function broadcastWith(): array
    {
        return [
            'user_id'    => $this->accepter->id,
            'name'       => $this->accepter->name,
            'avatar_url' => $this->accepter->avatar_url,
        ];
    }
}
