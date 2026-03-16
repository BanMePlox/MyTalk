<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Models\DirectMessage;
use App\Models\User;

class NewDirectMessage implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly DirectMessage $message,
        public readonly User $recipient,
    ) {}

    public function broadcastAs(): string
    {
        return 'NewDirectMessage';
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel("App.Models.User.{$this->recipient->id}")];
    }

    public function broadcastWith(): array
    {
        $this->message->loadMissing('user');

        return [
            'conversation_id' => $this->message->conversation_id,
            'sender'          => $this->message->user->name,
            'content'         => $this->message->content,
        ];
    }
}
