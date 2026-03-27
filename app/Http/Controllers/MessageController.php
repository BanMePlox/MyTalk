<?php

namespace App\Http\Controllers;

use App\Events\MentionReceived;
use App\Events\MessageDeleted;
use App\Events\MessagePinToggled;
use App\Events\MessageSent;
use App\Events\MessageUpdated;
use App\Models\Channel;
use App\Models\Message;
use App\Models\MessageEdit;
use App\Services\PushNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class MessageController extends Controller
{
    public function index(Channel $channel): Response
    {
        abort_if(!$channel->server, 404);
        if (!$channel->server->members()->where('user_id', Auth::id())->exists()) {
            return Inertia::location(route('friends.index'));
        }

        // Check channel-level view permission
        $channel->loadMissing('server');
        if (!$channel->canUserView(Auth::user())) {
            return Inertia::location(route('friends.index'));
        }

        $messages = $channel->messages()
            ->whereNull('thread_id')
            ->with('user', 'reactions', 'replyTo.user', 'thread')
            ->latest()
            ->take(50)
            ->get()
            ->reverse()
            ->values()
            ->map(fn($m) => array_merge($m->toArray(), ['reactions_grouped' => $m->reactionsGrouped()]));

        $userServers = Auth::user()->servers()->get()->each(function ($server) {
            $server->first_channel_id = $server->channels()->value('id');
        });

        // Resetear menciones no leídas de este canal
        DB::table('unread_mentions')
            ->where('user_id', Auth::id())
            ->where('channel_id', $channel->id)
            ->update(['count' => 0]);

        $channel->load('server.categories.channels', 'server.channels', 'server.members', 'server.roles');

        // Load channel permissions for all channels in this server
        $allChannelIds = $channel->server->channels->pluck('id');
        $channelPermsMap = \App\Models\ChannelPermission::whereIn('channel_id', $allChannelIds)
            ->get()
            ->groupBy('channel_id')
            ->map(fn($rows) => $rows->map(fn($p) => [
                'role_id'  => $p->role_id,
                'can_view' => $p->can_view,
                'can_send' => $p->can_send,
            ])->values());

        // Attach permissions to each channel and filter to only those the user can view
        $authUser = Auth::user();
        $channel->server->channels->each(function ($ch) use ($channelPermsMap) {
            $ch->channel_permissions = $channelPermsMap->get($ch->id, collect())->all();
        });

        // Filter visible channels for the sidebar (owners see everything)
        $isOwner = $channel->server->owner_id === $authUser->id;
        if ($isOwner) {
            $visibleChannelIds = $channel->server->channels->pluck('id')->all();
        } else {
            $userRoleIds = DB::table('server_member_roles')
                ->where('user_id', $authUser->id)
                ->where('server_id', $channel->server_id)
                ->pluck('role_id')
                ->all();

            // Load all can_view permissions for channels in this server
            $allViewPerms = \App\Models\ChannelPermission::whereIn('channel_id', $allChannelIds)
                ->get(['channel_id', 'role_id', 'can_view'])
                ->groupBy('channel_id');

            $visibleChannelIds = $channel->server->channels
                ->filter(function ($ch) use ($allViewPerms, $userRoleIds) {
                    $perms = $allViewPerms->get($ch->id);
                    // No overrides → visible
                    if (!$perms || $perms->isEmpty()) return true;
                    $userPerms = $perms->whereIn('role_id', $userRoleIds);
                    // Explicit deny for any of user's roles → hidden
                    if ($userPerms->where('can_view', false)->isNotEmpty()) return false;
                    // Explicit allow for any of user's roles → visible
                    if ($userPerms->where('can_view', true)->isNotEmpty()) return true;
                    // Restricted channel (has explicit allows) but user has no override → hidden
                    return $perms->where('can_view', true)->isEmpty();
                })
                ->pluck('id')
                ->all();
        }

        $pinnedMessages = $channel->messages()
            ->whereNull('thread_id')
            ->pinned()
            ->with('user', 'pinnedBy')
            ->orderBy('pinned_at')
            ->get()
            ->map(fn($m) => [
                'id'         => $m->id,
                'content'    => $m->content,
                'created_at' => $m->created_at,
                'pinned_at'  => $m->pinned_at,
                'pinned_by'  => $m->pinnedBy ? ['name' => $m->pinnedBy->name] : null,
                'user'       => ['id' => $m->user->id, 'name' => $m->user->name, 'avatar_url' => $m->user->avatar_url],
            ]);

        // Attach custom roles to each server member (ordered by position → primary role first)
        $memberRoleMap = DB::table('server_member_roles')
            ->join('roles', 'roles.id', '=', 'server_member_roles.role_id')
            ->where('server_member_roles.server_id', $channel->server_id)
            ->orderBy('roles.position')
            ->select('server_member_roles.user_id', 'roles.id', 'roles.name', 'roles.color')
            ->get()
            ->groupBy('user_id');

        $channel->server->members->each(function ($member) use ($memberRoleMap) {
            $member->nickname     = $member->pivot->nickname ?? null;
            $member->server_roles = $memberRoleMap->get($member->id, collect())
                ->map(fn($r) => ['id' => $r->id, 'name' => $r->name, 'color' => $r->color])
                ->values();
        });

        $serverEmojis = $channel->server->emojis()
            ->get(['id', 'name', 'image_path'])
            ->map(fn($e) => ['id' => $e->id, 'name' => $e->name, 'url' => $e->url]);

        // Load current voice participants from cache for all voice channels in the server.
        // If the client sends X-Voice-Channel-Id they are still in an active call (Inertia
        // navigation while in voice) — skip zombie cleanup to avoid ejecting them from the
        // sidebar. Without the header they just loaded the page fresh, so any presence entry
        // they left behind is a zombie (e.g. browser crash) and should be cleaned up.
        $activeVoiceChannelId = request()->header('X-Voice-Channel-Id');
        $voiceParticipants = [];
        foreach ($channel->server->channels->where('type', 'voice') as $vc) {
            $cacheKey     = "voice_participants_{$vc->id}";
            $participants = Cache::get($cacheKey, []);

            if (!$activeVoiceChannelId && isset($participants[$authUser->id])) {
                unset($participants[$authUser->id]);
                Cache::put($cacheKey, $participants, now()->addHours(8));
                broadcast(new \App\Events\VoicePresenceChanged(
                    $channel->server_id,
                    'leave',
                    ['id' => $authUser->id, 'name' => $authUser->name, 'avatar_url' => $authUser->avatar_url],
                    $vc->id
                ));
            }

            $filtered = array_values($participants);
            if (!empty($filtered)) {
                $voiceParticipants[$vc->id] = $filtered;
            }
        }

        return Inertia::render('Channels/Show', [
            'channel'            => $channel,
            'messages'           => $messages,
            'pinnedMessages'     => $pinnedMessages,
            'userServers'        => $userServers,
            'visibleChannelIds'  => $visibleChannelIds,
            'canManageMessages'  => $authUser->can('manageMessages', $channel->server),
            'canManageRoles'     => $authUser->can('manageRoles', $channel->server),
            'canManageChannels'  => $authUser->can('manageChannels', $channel->server),
            'canKickMembers'     => $authUser->can('kickMembers', $channel->server),
            'canBanMembers'      => $authUser->can('banMembers', $channel->server),
            'canSendMessages'    => $channel->canUserSend($authUser),
            'isOwner'            => $channel->server->owner_id === Auth::id(),
            'serverEmojis'       => $serverEmojis,
            'initialVoiceParticipants' => $voiceParticipants,
        ]);
    }

    public function search(Request $request, Channel $channel)
    {
        abort_if(!$channel->server, 404);
        $this->authorize('view', $channel->server);

        $q = trim($request->string('q'));
        if (strlen($q) < 2) return response()->json([]);

        $results = $channel->messages()
            ->whereNull('thread_id')
            ->with('user')
            ->where('content', 'like', '%' . $q . '%')
            ->latest()
            ->take(30)
            ->get()
            ->reverse()
            ->values();

        return response()->json($results);
    }

    public function more(Request $request, Channel $channel)
    {
        abort_if(!$channel->server, 404);
        $this->authorize('view', $channel->server);

        $query = $channel->messages()->whereNull('thread_id')->with('user', 'reactions', 'replyTo.user', 'thread')->latest();

        if ($request->filled('before')) {
            $query->where('id', '<', $request->integer('before'));
        }

        $messages = $query->take(50)->get()->reverse()->values()
            ->map(fn($m) => array_merge($m->toArray(), ['reactions_grouped' => $m->reactionsGrouped()]));

        return response()->json($messages);
    }

    public function store(Request $request, Channel $channel)
    {
        abort_if(!$channel->server, 404);
        $this->authorize('view', $channel->server);
        abort_if(!$channel->canUserSend(Auth::user()), 403);

        // Announcement channels: only owners and admins can post
        if ($channel->type === 'announcement') {
            $authUser = Auth::user();
            $isPrivileged = $channel->server->owner_id === $authUser->id
                || $authUser->can('manageMessages', $channel->server);
            abort_if(!$isPrivileged, 403);
        }

        $data = $request->validate([
            'content'      => 'nullable|string|max:2000',
            'attachment'   => 'nullable|file|max:20480|mimes:jpg,jpeg,png,gif,webp,svg,mp4,mov,webm,mp3,ogg,wav,m4a,pdf,txt,md,csv,zip,7z,tar,gz,doc,docx,xls,xlsx,ppt,pptx',
            'reply_to_id'  => 'nullable|integer|exists:messages,id',
        ]);

        abort_if(empty($data['content']) && !$request->hasFile('attachment'), 422);

        $attachmentPath = null;
        $attachmentName = null;
        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $attachmentName = $file->getClientOriginalName();
            $attachmentPath = $file->store('attachments', 'public');
        }

        $message = Message::create([
            'channel_id'      => $channel->id,
            'user_id'         => Auth::id(),
            'content'         => $data['content'] ?? '',
            'attachment'      => $attachmentPath,
            'attachment_name' => $attachmentName,
            'reply_to_id'     => $data['reply_to_id'] ?? null,
        ]);

        $message->loadMissing('replyTo.user');
        broadcast(new MessageSent($message))->toOthers();

        // Dispatch mention notifications + push to offline users
        $message->load('user', 'channel.server');
        $members = $channel->server->members()->where('user_id', '!=', Auth::id())->get();
        $content = $data['content'] ?? '';
        $senderName = $message->user->name;
        $channelUrl = route('channels.show', $channel->id);
        $push = app(PushNotificationService::class);

        foreach ($members as $member) {
            $isMentioned = str_contains($content, '@' . $member->name);
            if ($isMentioned) {
                broadcast(new MentionReceived($message, $member));
                DB::table('unread_mentions')->upsert(
                    ['user_id' => $member->id, 'server_id' => $channel->server_id, 'channel_id' => $channel->id, 'count' => 1],
                    ['user_id', 'channel_id'],
                    ['count' => DB::raw('count + 1')]
                );
            }

            // Send push notification (mention or regular message)
            $notifTitle = $isMentioned
                ? "{$senderName} te mencionó en #{$channel->name}"
                : "#{$channel->name} — {$senderName}";
            $notifBody = $content ?: '📎 Archivo adjunto';
            $push->sendToUser($member->id, $notifTitle, $notifBody, $channelUrl, Auth::user()->avatar_url);
        }

        $message->loadMissing('user', 'replyTo.user');
        $replyTo = $message->replyTo;
        return response()->json([
            'id'               => $message->id,
            'content'          => $message->content,
            'attachment_url'   => $message->attachment_url,
            'attachment_name'  => $message->attachment_name,
            'reactions_grouped' => [],
            'created_at'       => $message->created_at,
            'reply_to'         => $replyTo ? [
                'id'      => $replyTo->id,
                'content' => $replyTo->content,
                'user'    => $replyTo->user ? ['id' => $replyTo->user->id, 'name' => $replyTo->user->name] : null,
            ] : null,
            'user'             => [
                'id'           => $message->user->id,
                'name'         => $message->user->name,
                'avatar_url'   => $message->user->avatar_url,
                'banner_color' => $message->user->banner_color,
            ],
        ]);
    }

    public function update(Request $request, Message $message)
    {
        abort_if($message->user_id !== Auth::id(), 403);

        $data = $request->validate(['content' => 'required|string|max:2000']);

        // Save old version to history before overwriting
        MessageEdit::create([
            'message_id' => $message->id,
            'content'    => $message->content,
            'edited_at'  => $message->updated_at ?? $message->created_at,
        ]);

        $message->update(['content' => $data['content']]);

        broadcast(new MessageUpdated($message))->toOthers();

        return response()->json(['id' => $message->id, 'content' => $message->content, 'updated_at' => $message->updated_at]);
    }

    public function edits(Message $message)
    {
        abort_if($message->user_id !== Auth::id() && !Auth::user()->can('manageMessages', optional($message->channel)->server), 403);

        return response()->json(
            $message->edits()->get(['content', 'edited_at'])
        );
    }

    public function destroy(Message $message)
    {
        $message->loadMissing('channel.server');
        $isOwn   = $message->user_id === Auth::id();
        $canMod  = $message->channel->server && Auth::user()->can('manageMessages', $message->channel->server);
        abort_if(!$isOwn && !$canMod, 403);

        broadcast(new MessageDeleted($message))->toOthers();

        if ($message->attachment) {
            Storage::disk('public')->delete($message->attachment);
        }

        $message->delete();

        return response()->noContent();
    }

    public function pin(Message $message)
    {
        $message->loadMissing('channel.server');
        $canPin = $message->channel->server
            && (Auth::user()->can('manageMessages', $message->channel->server)
                || $message->channel->server->owner_id === Auth::id());
        abort_if(!$canPin, 403);

        $message->update(['pinned_at' => now(), 'pinned_by' => Auth::id()]);
        broadcast(new MessagePinToggled($message))->toOthers();

        return response()->json(['pinned_at' => $message->pinned_at]);
    }

    public function unpin(Message $message)
    {
        $message->loadMissing('channel.server');
        $canPin = $message->channel->server
            && (Auth::user()->can('manageMessages', $message->channel->server)
                || $message->channel->server->owner_id === Auth::id());
        abort_if(!$canPin, 403);

        $message->update(['pinned_at' => null, 'pinned_by' => null]);
        broadcast(new MessagePinToggled($message))->toOthers();

        return response()->noContent();
    }
}
