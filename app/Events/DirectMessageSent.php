<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Models\DirectMessage;

class DirectMessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly DirectMessage $message) {}

    public function broadcastAs(): string
    {
        return 'DirectMessageSent';
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel("conversation.{$this->message->conversation_id}")];
    }

    public function broadcastWith(): array
    {
        $this->message->loadMissing('user');

        return [
            'id'              => $this->message->id,
            'content'         => $this->message->content,
            'created_at'      => $this->message->created_at,
            'conversation_id' => $this->message->conversation_id,
            'user'            => [
                'id'           => $this->message->user->id,
                'name'         => $this->message->user->name,
                'avatar_url'   => $this->message->user->avatar_url,
                'banner_color' => $this->message->user->banner_color,
            ],
        ];
    }
}
