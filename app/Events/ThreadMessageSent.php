<?php

namespace App\Events;

use App\Models\Message;
use App\Models\Thread;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ThreadMessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Message $message, public Thread $thread)
    {
        $this->message->loadMissing('user');
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('thread.' . $this->thread->id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'id'         => $this->message->id,
            'content'    => $this->message->content,
            'thread_id'  => $this->thread->id,
            'created_at' => $this->message->created_at,
            'user'       => [
                'id'           => $this->message->user->id,
                'name'         => $this->message->user->name,
                'avatar_url'   => $this->message->user->avatar_url,
                'banner_color' => $this->message->user->banner_color,
            ],
        ];
    }
}
