<?php

namespace App\Events;

use App\Models\Conversation;
use App\Models\DirectMessage;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewDirectMessage implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly DirectMessage $message,
        public readonly User $recipient,
        public readonly ?Conversation $conversation = null,
    ) {}

    public function broadcastAs(): string { return 'NewDirectMessage'; }

    public function broadcastOn(): array
    {
        return [new PrivateChannel("App.Models.User.{$this->recipient->id}")];
    }

    public function broadcastWith(): array
    {
        $this->message->loadMissing('user');
        $sender = $this->message->user;
        $conv   = $this->conversation;

        return [
            'conversation_id'     => $this->message->conversation_id,
            'is_group'            => $conv?->isGroup() ?? false,
            'group_name'          => $conv?->isGroup() ? ($conv->name ?? null) : null,
            'group_icon_color'    => $conv?->icon_color,
            'sender'              => $sender->name,
            'sender_id'           => $sender->id,
            'sender_avatar'       => $sender->avatar_url,
            'sender_banner_color' => $sender->banner_color,
            'content'             => $this->message->content,
        ];
    }
}
