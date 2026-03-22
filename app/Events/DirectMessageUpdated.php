<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DirectMessageUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $conversationId;
    public int $messageId;
    public string $content;
    public string $updatedAt;

    public function __construct($message)
    {
        $this->conversationId = $message->conversation_id;
        $this->messageId      = $message->id;
        $this->content        = $message->content;
        $this->updatedAt      = $message->updated_at->toISOString();
    }

    public function broadcastAs(): string { return 'DirectMessageUpdated'; }

    public function broadcastOn(): array
    {
        return [new PrivateChannel("conversation.{$this->conversationId}")];
    }

    public function broadcastWith(): array
    {
        return [
            'id'         => $this->messageId,
            'content'    => $this->content,
            'updated_at' => $this->updatedAt,
        ];
    }
}
