<?php

namespace App\Policies;

use App\Models\Server;
use App\Models\User;

class ServerPolicy
{
    public function view(User $user, Server $server): bool
    {
        return $server->members()->where('user_id', $user->id)->exists();
    }

    public function manageChannels(User $user, Server $server): bool
    {
        $role = $server->members()->where('user_id', $user->id)->value('role');
        if (in_array($role, ['owner', 'admin'])) return true;

        return $user->hasPermission($server, 'manage_channels');
    }

    public function manageRoles(User $user, Server $server): bool
    {
        return $server->owner_id === $user->id
            || $user->hasPermission($server, 'manage_roles');
    }

    public function kickMembers(User $user, Server $server): bool
    {
        return $server->owner_id === $user->id
            || $user->hasPermission($server, 'kick_members');
    }

    public function manageMessages(User $user, Server $server): bool
    {
        return $server->owner_id === $user->id
            || $user->hasPermission($server, 'manage_messages');
    }

    public function delete(User $user, Server $server): bool
    {
        return $server->owner_id === $user->id;
    }
}
