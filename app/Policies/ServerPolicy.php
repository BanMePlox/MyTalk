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

    public function delete(User $user, Server $server): bool
    {
        return $server->owner_id === $user->id;
    }
}
