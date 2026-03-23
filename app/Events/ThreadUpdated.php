<?php

namespace App\Events;

use App\Models\Thread;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ThreadUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Thread $thread) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('channel.' . $this->thread->channel_id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'thread_id'     => $this->thread->id,
            'message_id'    => $this->thread->message_id,
            'reply_count'   => $this->thread->reply_count,
            'last_reply_at' => $this->thread->last_reply_at,
        ];
    }
}
