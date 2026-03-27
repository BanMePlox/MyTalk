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
        $this->message->load('user', 'poll');
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
            'id'              => $this->message->id,
            'content'         => $this->message->content,
            'attachment_url'  => $this->message->attachment_url,
            'attachment_name' => $this->message->attachment_name,
            'created_at'     => $this->message->created_at,
            'reply_to'       => $replyTo ? [
                'id'      => $replyTo->id,
                'content' => $replyTo->content,
                'user'    => $replyTo->user ? ['id' => $replyTo->user->id, 'name' => $replyTo->user->name] : null,
            ] : null,
            'poll_id' => $this->message->poll_id,
            'poll'    => $this->message->poll ? [
                'id'          => $this->message->poll->id,
                'question'    => $this->message->poll->question,
                'options'     => $this->message->poll->options,
                'vote_counts' => [],
                'total_votes' => 0,
                'my_vote'     => null,
                'ends_at'     => $this->message->poll->ends_at,
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
