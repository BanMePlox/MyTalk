<?php

namespace App\Events;

use App\Models\Message;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MentionReceived implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly Message $message,
        public readonly User $mentionedUser,
    ) {}

    public function broadcastAs(): string
    {
        return 'MentionReceived';
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel("App.Models.User.{$this->mentionedUser->id}")];
    }

    public function broadcastWith(): array
    {
        $this->message->loadMissing('user', 'channel.server');

        return [
            'sender'     => $this->message->user->name,
            'content'    => $this->message->content,
            'channel_id' => $this->message->channel_id,
            'channel'    => $this->message->channel->name,
            'server'     => $this->message->channel->server->name,
            'server_id'  => $this->message->channel->server->id,
        ];
    }
}
