<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\Server;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    private const ALLOWED_PERMISSIONS = ['manage_roles', 'manage_channels', 'kick_members', 'manage_messages'];

    public function index(Server $server)
    {
        $this->authorize('view', $server);

        return response()->json($server->roles()->get());
    }

    public function store(Request $request, Server $server)
    {
        $this->authorize('manageRoles', $server);

        $data = $request->validate([
            'name'          => 'required|string|max:100',
            'color'         => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'permissions'   => 'required|array',
            'permissions.*' => 'in:manage_roles,manage_channels,kick_members,manage_messages',
        ]);

        $position = $server->roles()->max('position') + 1;
        $role = $server->roles()->create([...$data, 'position' => $position]);

        return response()->json($role, 201);
    }

    public function update(Request $request, Role $role)
    {
        $this->authorize('manageRoles', $role->server);

        $data = $request->validate([
            'name'          => 'sometimes|string|max:100',
            'color'         => ['sometimes', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'permissions'   => 'sometimes|array',
            'permissions.*' => 'in:manage_roles,manage_channels,kick_members,manage_messages',
            'position'      => 'sometimes|integer|min:0',
        ]);

        $role->update($data);

        return response()->json($role->fresh());
    }

    public function destroy(Role $role)
    {
        $this->authorize('manageRoles', $role->server);
        $role->delete();

        return response()->noContent();
    }
}
