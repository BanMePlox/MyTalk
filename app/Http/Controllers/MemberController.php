<?php

namespace App\Http\Controllers;

use App\Events\MemberRoleUpdated;
use App\Models\Server;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MemberController extends Controller
{
    public function update(Request $request, Server $server, User $user)
    {
        $this->authorize('manageRoles', $server);

        $data = $request->validate([
            'role_id' => 'required|integer|exists:roles,id',
            'action'  => 'required|in:add,remove',
        ]);

        abort_if(!$server->roles()->where('id', $data['role_id'])->exists(), 403);

        if ($data['action'] === 'add') {
            DB::table('server_member_roles')->insertOrIgnore([
                'role_id'   => $data['role_id'],
                'server_id' => $server->id,
                'user_id'   => $user->id,
            ]);
        } else {
            DB::table('server_member_roles')
                ->where('role_id', $data['role_id'])
                ->where('server_id', $server->id)
                ->where('user_id', $user->id)
                ->delete();
        }

        // Broadcast updated roles to all server members
        $roles = DB::table('server_member_roles')
            ->join('roles', 'roles.id', '=', 'server_member_roles.role_id')
            ->where('server_member_roles.server_id', $server->id)
            ->where('server_member_roles.user_id', $user->id)
            ->orderBy('roles.position')
            ->select('roles.id', 'roles.name', 'roles.color')
            ->get()
            ->map(fn($r) => ['id' => $r->id, 'name' => $r->name, 'color' => $r->color])
            ->values()
            ->all();

        broadcast(new MemberRoleUpdated($server->id, $user->id, $roles));

        return response()->noContent();
    }

    public function destroy(Server $server, User $user)
    {
        $this->authorize('kickMembers', $server);
        abort_if($server->owner_id === $user->id, 403);

        $server->members()->detach($user->id);

        DB::table('server_member_roles')
            ->where('server_id', $server->id)
            ->where('user_id', $user->id)
            ->delete();

        return response()->noContent();
    }
}
