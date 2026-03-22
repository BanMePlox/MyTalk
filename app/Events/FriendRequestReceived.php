<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FriendRequestReceived implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public User $sender, public User $recipient) {}

    public function broadcastAs(): string { return 'FriendRequestReceived'; }

    public function broadcastOn(): array
    {
        return [new PrivateChannel("App.Models.User.{$this->recipient->id}")];
    }

    public function broadcastWith(): array
    {
        return [
            'sender_id'         => $this->sender->id,
            'sender_name'       => $this->sender->name,
            'sender_avatar_url' => $this->sender->avatar_url,
        ];
    }
}
