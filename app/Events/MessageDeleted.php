<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageDeleted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $channelId;
    public int $messageId;

    public function __construct(Message $message)
    {
        $this->channelId = $message->channel_id;
        $this->messageId = $message->id;
    }

    public function broadcastAs(): string { return 'MessageDeleted'; }

    public function broadcastOn(): array
    {
        return [new PrivateChannel("channel.{$this->channelId}")];
    }

    public function broadcastWith(): array
    {
        return ['id' => $this->messageId];
    }
}
