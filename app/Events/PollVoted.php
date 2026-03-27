<?php

namespace App\Events;

use App\Models\Poll;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PollVoted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $channelId,
        public int $pollId,
        public int $messageId,
        public array $voteCounts,
        public int $totalVotes,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('channel.' . $this->channelId),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'poll_id'     => $this->pollId,
            'message_id'  => $this->messageId,
            'vote_counts' => $this->voteCounts,
            'total_votes' => $this->totalVotes,
        ];
    }
}
