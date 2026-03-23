<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('conversation.{conversationId}', function ($user, $conversationId) {
    $conversation = \App\Models\Conversation::find($conversationId);
    if (!$conversation) return false;
    return $conversation->users()->where('user_id', $user->id)->exists();
});

Broadcast::channel('channel.{channelId}', function ($user, $channelId) {
    $channel = \App\Models\Channel::find($channelId);
    if (!$channel) return false;
    if (!$channel->server->members()->where('user_id', $user->id)->exists()) return false;
    return $channel->canUserView($user);
});

Broadcast::channel('thread.{threadId}', function ($user, $threadId) {
    $thread = \App\Models\Thread::find($threadId);
    if (!$thread) return false;
    return $thread->channel->server->members()->where('user_id', $user->id)->exists();
});

Broadcast::channel('presence-server.{serverId}', function ($user, $serverId) {
    $server = \App\Models\Server::find($serverId);
    if (!$server) return false;
    if (!$server->members()->where('user_id', $user->id)->exists()) return false;

    return [
        'id'            => $user->id,
        'name'          => $user->name,
        'status'        => $user->status,
        'avatar_url'    => $user->avatar_url,
        'custom_status' => $user->custom_status,
    ];
});
