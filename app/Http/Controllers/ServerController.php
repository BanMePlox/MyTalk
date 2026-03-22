<?php

namespace App\Http\Controllers;

use App\Models\Server;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ServerController extends Controller
{
    public function index(): Response
    {
        $servers = Auth::user()->servers()->with('channels')->get();

        return Inertia::render('Servers/Index', [
            'servers' => $servers,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'icon' => 'nullable|image|max:2048',
        ]);

        $iconPath = $request->hasFile('icon')
            ? $request->file('icon')->store('server-icons', 'public')
            : null;

        $server = Server::create([
            'owner_id' => Auth::id(),
            'name'     => $data['name'],
            'icon'     => $iconPath,
        ]);

        $server->members()->attach(Auth::id(), ['role' => 'owner']);
        $server->channels()->create(['name' => 'general']);

        return redirect()->route('servers.show', $server);
    }

    public function updateIcon(Request $request, Server $server)
    {
        $this->authorize('delete', $server); // solo el owner

        $request->validate(['icon' => 'required|image|max:2048']);

        if ($server->icon) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($server->icon);
        }

        $server->update(['icon' => $request->file('icon')->store('server-icons', 'public')]);

        return response()->json(['icon_url' => $server->icon_url]);
    }

    public function show(Server $server): Response
    {
        $this->authorize('view', $server);

        $server->load(['channels', 'categories.channels', 'members', 'roles']);
        $channel = $server->channels()->first();

        $authUser = Auth::user();
        $member = $server->members()->where('user_id', $authUser->id)->first();
        $canManageChannels = ($member && in_array($member->pivot->role, ['owner', 'admin']))
            || $authUser->hasPermission($server, 'manage_channels');

        // Load custom roles for each member
        $memberRoleMap = DB::table('server_member_roles')
            ->join('roles', 'roles.id', '=', 'server_member_roles.role_id')
            ->where('server_member_roles.server_id', $server->id)
            ->select('server_member_roles.user_id', 'roles.id', 'roles.name', 'roles.color')
            ->get()
            ->groupBy('user_id');

        $membersWithRoles = $server->members->map(function ($m) use ($memberRoleMap) {
            $m->server_roles = $memberRoleMap->get($m->id, collect())->map(fn($r) => [
                'id'    => $r->id,
                'name'  => $r->name,
                'color' => $r->color,
            ])->values();
            return $m;
        });

        return Inertia::render('Servers/Show', [
            'server'            => array_merge($server->toArray(), [
                'members' => $membersWithRoles,
                'roles'   => $server->roles,
            ]),
            'channel'           => $channel,
            'canManageChannels' => $canManageChannels,
            'canManageRoles'    => $authUser->can('manageRoles', $server),
            'canKickMembers'    => $authUser->can('kickMembers', $server),
            'isOwner'           => $server->owner_id === $authUser->id,
            'inviteUrl'         => route('invite.accept', $server->invite_code),
        ]);
    }

    public function leave(Server $server)
    {
        $this->authorize('view', $server);

        if ($server->owner_id === Auth::id()) {
            return back()->withErrors(['leave' => 'El propietario no puede abandonar el servidor. Elimínalo si ya no lo necesitas.']);
        }

        $server->members()->detach(Auth::id());

        return redirect()->route('servers.index');
    }

    public function destroy(Server $server)
    {
        $this->authorize('delete', $server);
        $server->delete();

        return redirect()->route('servers.index');
    }

    public function join(Request $request)
    {
        $data = $request->validate(['invite_code' => 'required|string']);

        $server = Server::where('invite_code', $data['invite_code'])->firstOrFail();

        if (!$server->members()->where('user_id', Auth::id())->exists()) {
            $server->members()->attach(Auth::id(), ['role' => 'member']);
        }

        return redirect()->route('servers.show', $server);
    }

    public function acceptInvite(string $code)
    {
        $server = Server::where('invite_code', $code)->firstOrFail();

        if (!$server->members()->where('user_id', Auth::id())->exists()) {
            $server->members()->attach(Auth::id(), ['role' => 'member']);
        }

        $channel = $server->channels()->first();

        return $channel
            ? redirect()->route('channels.show', $channel)
            : redirect()->route('servers.show', $server);
    }
}
