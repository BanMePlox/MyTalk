<?php

namespace App\Http\Controllers;

use App\Events\FriendRequestAccepted;
use App\Events\FriendRequestReceived;
use App\Models\Friendship;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class FriendshipController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        $friends = Friendship::query()
            ->where(fn($q) => $q->where('sender_id', $user->id)->orWhere('recipient_id', $user->id))
            ->accepted()
            ->with(['sender', 'recipient'])
            ->get()
            ->map(fn($f) => $f->sender_id === $user->id ? $f->recipient : $f->sender)
            ->map(fn($u) => [
                'id'         => $u->id,
                'name'       => $u->name,
                'avatar_url' => $u->avatar_url,
                'banner_color' => $u->banner_color,
                'status'     => $u->status,
            ]);

        $incoming = Friendship::where('recipient_id', $user->id)
            ->pending()
            ->with('sender')
            ->get()
            ->map(fn($f) => [
                'id'         => $f->sender->id,
                'name'       => $f->sender->name,
                'avatar_url' => $f->sender->avatar_url,
                'banner_color' => $f->sender->banner_color,
            ]);

        $outgoing = Friendship::where('sender_id', $user->id)
            ->pending()
            ->with('recipient')
            ->get()
            ->map(fn($f) => [
                'id'         => $f->recipient->id,
                'name'       => $f->recipient->name,
                'avatar_url' => $f->recipient->avatar_url,
                'banner_color' => $f->recipient->banner_color,
            ]);

        $userServers = $user->servers()->get()->each(function ($server) {
            $server->first_channel_id = $server->channels()->value('id');
            $server->folder_id = $server->pivot->folder_id;
        });
        $userFolders = \App\Models\ServerFolder::where('user_id', Auth::id())->get();

        return Inertia::render('Friends/Index', [
            'friends'     => $friends->values(),
            'incoming'    => $incoming->values(),
            'outgoing'    => $outgoing->values(),
            'userServers' => $userServers,
            'userFolders' => $userFolders,
        ]);
    }

    public function store(User $user)
    {
        $authId = Auth::id();
        abort_if($user->id === $authId, 403);

        $existing = Friendship::between($authId, $user->id)->first();
        abort_if($existing !== null, 422);

        Friendship::create([
            'sender_id'    => $authId,
            'recipient_id' => $user->id,
            'status'       => 'pending',
        ]);

        broadcast(new FriendRequestReceived(Auth::user(), $user));

        return response()->json(['ok' => true]);
    }

    public function update(User $user)
    {
        $authId = Auth::id();

        $friendship = Friendship::where('sender_id', $user->id)
            ->where('recipient_id', $authId)
            ->pending()
            ->firstOrFail();

        $friendship->update(['status' => 'accepted']);

        broadcast(new FriendRequestAccepted(Auth::user(), $user));

        return response()->json(['ok' => true]);
    }

    public function destroy(User $user)
    {
        $authId = Auth::id();
        Friendship::between($authId, $user->id)->delete();

        return response()->json(['ok' => true]);
    }
}
