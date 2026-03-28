<?php

namespace App\Http\Controllers;

use App\Events\DirectMessageSent;
use App\Events\NewDirectMessage;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ConversationController extends Controller
{
    public function index()
    {
        $authId = Auth::id();

        $latest = Conversation::whereHas('users', fn($q) => $q->where('user_id', $authId))
            ->latest()->first();

        if ($latest) {
            return redirect()->route('conversations.show', $latest);
        }

        $userServers = Auth::user()->servers()->get()->each(function ($server) {
            $server->first_channel_id = $server->channels()->value('id');
            $server->folder_id = $server->pivot->folder_id;
        });
        $userFolders = \App\Models\ServerFolder::where('user_id', Auth::id())->get();

        return Inertia::render('Conversations/Index', ['userServers' => $userServers, 'userFolders' => $userFolders]);
    }

    public function open(User $user)
    {
        $authId = Auth::id();
        abort_if($user->id === $authId, 403);

        $conversation = Conversation::where('type', 'direct')
            ->whereHas('users', fn($q) => $q->where('user_id', $authId))
            ->whereHas('users', fn($q) => $q->where('user_id', $user->id))
            ->first();

        if (!$conversation) {
            $conversation = Conversation::create(['type' => 'direct']);
            $conversation->users()->attach([$authId, $user->id]);
        }

        return redirect()->route('conversations.show', $conversation);
    }

    public function show(Conversation $conversation)
    {
        $authId = Auth::id();
        abort_unless($conversation->users()->where('user_id', $authId)->exists(), 403);

        $conversation->load('users');

        $messages = $conversation->messages()
            ->with('user')
            ->latest()
            ->take(50)
            ->get()
            ->reverse()
            ->values();

        $userServers = Auth::user()->servers()->get()->each(function ($server) {
            $server->first_channel_id = $server->channels()->value('id');
            $server->folder_id = $server->pivot->folder_id;
        });
        $userFolders = \App\Models\ServerFolder::where('user_id', Auth::id())->get();

        $latestId = $conversation->messages()->max('id');
        if ($latestId) {
            $conversation->users()->updateExistingPivot($authId, ['last_read_message_id' => $latestId]);
        }

        $other   = $conversation->otherUser($authId);
        $members = $conversation->isGroup()
            ? $conversation->users->map(fn($u) => [
                'id'           => $u->id,
                'name'         => $u->name,
                'avatar_url'   => $u->avatar_url,
                'banner_color' => $u->banner_color,
                'pivot_role'   => $u->pivot->role,
              ])->values()
            : null;

        $friendsToAdd = null;
        if ($conversation->isGroup()) {
            $memberIds = $conversation->users->pluck('id');
            $friendsToAdd = Auth::user()->friends()
                ->reject(fn($u) => $memberIds->contains($u->id))
                ->map(fn($u) => [
                    'id'         => $u->id,
                    'name'       => $u->name,
                    'avatar_url' => $u->avatar_url,
                    'banner_color' => $u->banner_color,
                ])->values();
        }

        return Inertia::render('Conversations/Show', [
            'conversation' => $conversation,
            'other'        => $other,
            'members'      => $members,
            'friendsToAdd' => $friendsToAdd,
            'messages'     => $messages,
            'userServers'  => $userServers,
            'userFolders'  => $userFolders,
        ]);
    }

    public function store(Request $request, Conversation $conversation)
    {
        $authId = Auth::id();
        abort_unless($conversation->users()->where('user_id', $authId)->exists(), 403);

        $request->validate([
            'content'    => 'nullable|string|max:4000',
            'attachment' => 'nullable|image|max:8192',
        ]);

        abort_if(empty($request->content) && !$request->hasFile('attachment'), 422);

        $attachmentPath = $request->hasFile('attachment')
            ? $request->file('attachment')->store('attachments', 'public')
            : null;

        $message = $conversation->messages()->create([
            'user_id'    => $authId,
            'content'    => $request->content ?? '',
            'attachment' => $attachmentPath,
        ]);

        broadcast(new DirectMessageSent($message));

        $message->load('user');
        $conversation->users()->updateExistingPivot($authId, ['last_read_message_id' => $message->id]);

        // Fan-out a todos los miembros excepto el emisor
        $conversation->load('users');
        foreach ($conversation->users as $member) {
            if ($member->id !== $authId) {
                broadcast(new NewDirectMessage($message, $member, $conversation));
            }
        }

        return response()->json([
            'id'             => $message->id,
            'content'        => $message->content,
            'attachment_url' => $message->attachment_url,
            'created_at'     => $message->created_at,
            'user'           => [
                'id'           => $message->user->id,
                'name'         => $message->user->name,
                'avatar_url'   => $message->user->avatar_url,
                'banner_color' => $message->user->banner_color,
            ],
        ]);
    }

    public function createGroup(Request $request)
    {
        $authId = Auth::id();

        $data = $request->validate([
            'name'      => 'nullable|string|max:100',
            'user_ids'  => 'required|array|min:1|max:9',
            'user_ids.*' => 'exists:users,id|different:' . $authId,
            'icon_color' => 'nullable|string|max:7',
        ]);

        $conversation = Conversation::create([
            'type'       => 'group',
            'name'       => $data['name'] ?? null,
            'icon_color' => $data['icon_color'] ?? null,
            'owner_id'   => $authId,
        ]);

        // Creator como admin, resto como member
        $conversation->users()->attach($authId, ['role' => 'admin']);
        foreach ($data['user_ids'] as $uid) {
            $conversation->users()->attach($uid, ['role' => 'member']);
        }

        $conversation->load('users');

        return redirect()->route('conversations.show', $conversation);
    }

    public function updateGroup(Request $request, Conversation $conversation)
    {
        $authId = Auth::id();
        abort_unless($conversation->isGroup(), 403);

        $pivot = $conversation->users()->where('user_id', $authId)->first()?->pivot;
        abort_unless($pivot && $pivot->role === 'admin', 403);

        $data = $request->validate([
            'name'       => 'nullable|string|max:100',
            'icon_color' => 'nullable|string|max:7',
        ]);

        $conversation->update($data);

        return response()->json(['name' => $conversation->name, 'icon_color' => $conversation->icon_color]);
    }

    public function addMember(Request $request, Conversation $conversation)
    {
        $authId = Auth::id();
        abort_unless($conversation->isGroup(), 403);

        $pivot = $conversation->users()->where('user_id', $authId)->first()?->pivot;
        abort_unless($pivot && $pivot->role === 'admin', 403);

        $data = $request->validate(['user_id' => 'required|exists:users,id']);
        $uid  = $data['user_id'];

        abort_if($conversation->users()->where('user_id', $uid)->exists(), 422);

        $conversation->users()->attach($uid, ['role' => 'member']);

        return response()->json(['ok' => true]);
    }

    public function leave(Conversation $conversation)
    {
        $authId = Auth::id();
        abort_unless($conversation->users()->where('user_id', $authId)->exists(), 403);
        abort_unless($conversation->isGroup(), 403);

        DB::transaction(function () use ($conversation, $authId) {
            $leavingPivot = $conversation->users()->where('user_id', $authId)->first()?->pivot;
            $conversation->users()->detach($authId);

            $remaining = $conversation->users()->count();
            if ($remaining === 0) {
                $conversation->delete();
                return;
            }

            // Si era el único admin, promover al miembro más antiguo
            if ($leavingPivot?->role === 'admin') {
                $hasAdmin = $conversation->users()->wherePivot('role', 'admin')->exists();
                if (!$hasAdmin) {
                    $oldest = $conversation->users()->oldest('conversation_user.created_at')->first();
                    if ($oldest) {
                        $conversation->users()->updateExistingPivot($oldest->id, ['role' => 'admin']);
                    }
                }
            }
        });

        return redirect()->route('conversations.index');
    }
}
