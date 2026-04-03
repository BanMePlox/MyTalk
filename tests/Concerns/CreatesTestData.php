<?php

namespace Tests\Concerns;

use App\Models\Channel;
use App\Models\ChannelPermission;
use App\Models\Message;
use App\Models\Role;
use App\Models\Server;
use App\Models\ServerBan;
use App\Models\User;

trait CreatesTestData
{
    protected function makeServer(User $owner): Server
    {
        $server = Server::create(['owner_id' => $owner->id, 'name' => 'Test Server']);
        $server->members()->attach($owner->id, ['role' => 'owner']);

        return $server;
    }

    protected function joinServer(Server $server, User $user, string $systemRole = 'member'): void
    {
        $server->members()->attach($user->id, ['role' => $systemRole]);
    }

    protected function makeChannel(Server $server, string $type = 'text'): Channel
    {
        return Channel::create([
            'server_id' => $server->id,
            'name'      => 'test-channel',
            'type'      => $type,
            'position'  => 0,
        ]);
    }

    protected function makeRole(Server $server, array $permissions = []): Role
    {
        return Role::create([
            'server_id'   => $server->id,
            'name'        => 'Test Role',
            'color'       => '#ff0000',
            'permissions' => $permissions,
            'position'    => 0,
        ]);
    }

    protected function assignRole(User $user, Role $role): void
    {
        \Illuminate\Support\Facades\DB::table('server_member_roles')->insert([
            'role_id'   => $role->id,
            'user_id'   => $user->id,
            'server_id' => $role->server_id,
        ]);
    }

    protected function makeMessage(Channel $channel, User $user, string $content = 'Hello'): Message
    {
        return Message::create([
            'channel_id' => $channel->id,
            'user_id'    => $user->id,
            'content'    => $content,
        ]);
    }

    protected function setChannelPermission(Channel $channel, Role $role, ?bool $canView, ?bool $canSend): void
    {
        ChannelPermission::updateOrCreate(
            ['channel_id' => $channel->id, 'role_id' => $role->id],
            ['can_view' => $canView, 'can_send' => $canSend],
        );
    }

    protected function banUser(Server $server, User $user, User $bannedBy): void
    {
        ServerBan::create([
            'server_id'   => $server->id,
            'user_id'     => $user->id,
            'banned_by_id' => $bannedBy->id,
        ]);
    }
}
