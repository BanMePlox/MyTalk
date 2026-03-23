<?php

namespace App\Http\Controllers;

use App\Events\MentionReceived;
use App\Events\MessageDeleted;
use App\Events\MessagePinToggled;
use App\Events\MessageSent;
use App\Events\MessageUpdated;
use App\Models\Channel;
use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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

        $messages = $channel->messages()
            ->with('user', 'reactions', 'replyTo.user')
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

        $pinnedMessages = $channel->messages()
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

        return Inertia::render('Channels/Show', [
            'channel'            => $channel,
            'messages'           => $messages,
            'pinnedMessages'     => $pinnedMessages,
            'userServers'        => $userServers,
            'canManageMessages'  => Auth::user()->can('manageMessages', $channel->server),
            'canManageRoles'     => Auth::user()->can('manageRoles', $channel->server),
            'canManageChannels'  => Auth::user()->can('manageChannels', $channel->server),
            'canKickMembers'     => Auth::user()->can('kickMembers', $channel->server),
            'canBanMembers'      => Auth::user()->can('banMembers', $channel->server),
            'isOwner'            => $channel->server->owner_id === Auth::id(),
        ]);
    }

    public function search(Request $request, Channel $channel)
    {
        abort_if(!$channel->server, 404);
        $this->authorize('view', $channel->server);

        $q = trim($request->string('q'));
        if (strlen($q) < 2) return response()->json([]);

        $results = $channel->messages()
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

        $query = $channel->messages()->with('user', 'reactions', 'replyTo.user')->latest();

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

        $data = $request->validate([
            'content'      => 'nullable|string|max:2000',
            'attachment'   => 'nullable|image|max:8192',
            'reply_to_id'  => 'nullable|integer|exists:messages,id',
        ]);

        abort_if(empty($data['content']) && !$request->hasFile('attachment'), 422);

        $attachmentPath = $request->hasFile('attachment')
            ? $request->file('attachment')->store('attachments', 'public')
            : null;

        $message = Message::create([
            'channel_id'  => $channel->id,
            'user_id'     => Auth::id(),
            'content'     => $data['content'] ?? '',
            'attachment'  => $attachmentPath,
            'reply_to_id' => $data['reply_to_id'] ?? null,
        ]);

        $message->loadMissing('replyTo.user');
        broadcast(new MessageSent($message))->toOthers();

        // Dispatch mention notifications
        $message->load('user', 'channel.server');
        $members = $channel->server->members()->where('user_id', '!=', Auth::id())->get();
        $content = $data['content'] ?? '';
        foreach ($members as $member) {
            if (str_contains($content, '@' . $member->name)) {
                broadcast(new MentionReceived($message, $member));

                // Incrementar contador en BD
                DB::table('unread_mentions')->upsert(
                    ['user_id' => $member->id, 'server_id' => $channel->server_id, 'channel_id' => $channel->id, 'count' => 1],
                    ['user_id', 'channel_id'],
                    ['count' => DB::raw('count + 1')]
                );
            }
        }

        $message->loadMissing('user', 'replyTo.user');
        $replyTo = $message->replyTo;
        return response()->json([
            'id'               => $message->id,
            'content'          => $message->content,
            'attachment_url'   => $message->attachment_url,
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

        $message->update(['content' => $data['content']]);

        broadcast(new MessageUpdated($message))->toOthers();

        return response()->json(['id' => $message->id, 'content' => $message->content, 'updated_at' => $message->updated_at]);
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
