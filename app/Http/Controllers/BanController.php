<?php

namespace App\Http\Controllers;

use App\Events\MemberKicked;
use App\Models\Server;
use App\Models\ServerBan;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class BanController extends Controller
{
    public function index(Server $server)
    {
        $this->authorize('banMembers', $server);

        $bans = ServerBan::where('server_id', $server->id)
            ->with(['user', 'bannedBy'])
            ->latest()
            ->get()
            ->map(fn($ban) => [
                'id'         => $ban->id,
                'reason'     => $ban->reason,
                'created_at' => $ban->created_at,
                'user'       => ['id' => $ban->user->id, 'name' => $ban->user->name, 'avatar_url' => $ban->user->avatar_url],
                'banned_by'  => ['name' => $ban->bannedBy->name],
            ]);

        return response()->json($bans);
    }

    public function store(Request $request, Server $server, User $user)
    {
        $this->authorize('banMembers', $server);
        abort_if($server->owner_id === $user->id, 403);

        $data = $request->validate(['reason' => 'nullable|string|max:255']);

        // Kick if member
        if ($server->members()->where('user_id', $user->id)->exists()) {
            $server->members()->detach($user->id);
            DB::table('server_member_roles')
                ->where('server_id', $server->id)
                ->where('user_id', $user->id)
                ->delete();
            broadcast(new MemberKicked($server->id, $user->id));
        }

        ServerBan::updateOrCreate(
            ['server_id' => $server->id, 'user_id' => $user->id],
            ['banned_by_id' => Auth::id(), 'reason' => $data['reason'] ?? null]
        );

        return response()->noContent();
    }

    public function destroy(Server $server, User $user)
    {
        $this->authorize('banMembers', $server);

        ServerBan::where('server_id', $server->id)
            ->where('user_id', $user->id)
            ->delete();

        return response()->noContent();
    }
}
