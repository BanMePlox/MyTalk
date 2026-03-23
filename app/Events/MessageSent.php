<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Message $message)
    {
        $this->message->load('user');
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('channel.' . $this->message->channel_id),
        ];
    }

    public function broadcastWith(): array
    {
        $replyTo = $this->message->replyTo;

        return [
            'id'             => $this->message->id,
            'content'        => $this->message->content,
            'attachment_url' => $this->message->attachment_url,
            'created_at'     => $this->message->created_at,
            'reply_to'       => $replyTo ? [
                'id'      => $replyTo->id,
                'content' => $replyTo->content,
                'user'    => $replyTo->user ? ['id' => $replyTo->user->id, 'name' => $replyTo->user->name] : null,
            ] : null,
            'user' => [
                'id'           => $this->message->user->id,
                'name'         => $this->message->user->name,
                'avatar_url'   => $this->message->user->avatar_url,
                'banner_color' => $this->message->user->banner_color,
            ],
        ];
    }
}
