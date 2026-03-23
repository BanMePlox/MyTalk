<?php

namespace App\Http\Controllers;

use App\Models\Channel;
use App\Models\ChannelPermission;
use App\Models\Role;
use Illuminate\Http\Request;

class ChannelPermissionController extends Controller
{
    public function upsert(Request $request, Channel $channel, Role $role)
    {
        $this->authorize('manageChannels', $channel->server);

        // Ensure the role belongs to this server
        abort_if($role->server_id !== $channel->server_id, 403);

        $data = $request->validate([
            'can_view' => 'required|boolean',
            'can_send' => 'required|boolean',
        ]);

        ChannelPermission::updateOrCreate(
            ['channel_id' => $channel->id, 'role_id' => $role->id],
            $data
        );

        return response()->noContent();
    }

    public function destroy(Channel $channel, Role $role)
    {
        $this->authorize('manageChannels', $channel->server);

        ChannelPermission::where('channel_id', $channel->id)
            ->where('role_id', $role->id)
            ->delete();

        return response()->noContent();
    }
}
