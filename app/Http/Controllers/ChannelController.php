<?php

namespace App\Http\Controllers;

use App\Models\Channel;
use App\Models\Server;
use Illuminate\Http\Request;

class ChannelController extends Controller
{
    public function store(Request $request, Server $server)
    {
        $this->authorize('manageChannels', $server);

        $data = $request->validate([
            'name'        => 'required|string|max:100',
            'type'        => 'nullable|in:text,announcement',
            'category_id' => 'nullable|exists:channel_categories,id',
        ]);

        $position = $server->channels()->max('position') + 1;
        $ch = $server->channels()->create([
            'name'        => strtolower(str_replace(' ', '-', $data['name'])),
            'type'        => $data['type'] ?? 'text',
            'category_id' => $data['category_id'] ?? null,
            'position'    => $position,
        ]);

        return response()->json([
            'id'          => $ch->id,
            'name'        => $ch->name,
            'type'        => $ch->type,
            'category_id' => $ch->category_id,
            'position'    => $ch->position,
        ], 201);
    }

    public function reorder(Request $request, Server $server)
    {
        $this->authorize('manageChannels', $server);

        $items = $request->validate([
            'channels'              => 'required|array',
            'channels.*.id'         => 'required|integer|exists:channels,id',
            'channels.*.position'   => 'required|integer|min:0',
            'channels.*.category_id'=> 'nullable|integer|exists:channel_categories,id',
        ])['channels'];

        foreach ($items as $item) {
            Channel::where('id', $item['id'])->where('server_id', $server->id)->update([
                'position'    => $item['position'],
                'category_id' => $item['category_id'] ?? null,
            ]);
        }

        return response()->noContent();
    }

    public function updateType(Request $request, Channel $channel)
    {
        $this->authorize('manageChannels', $channel->server);
        $data = $request->validate(['type' => 'required|in:text,announcement,voice']);
        $channel->update(['type' => $data['type']]);
        return response()->json(['type' => $channel->type]);
    }

    public function assign(Request $request, Channel $channel)
    {
        $this->authorize('manageChannels', $channel->server);

        $data = $request->validate(['category_id' => 'nullable|exists:channel_categories,id']);
        $channel->update(['category_id' => $data['category_id']]);

        return response()->json(['category_id' => $channel->category_id]);
    }

    public function destroy(Channel $channel)
    {
        $server = $channel->server;

        $this->authorize('manageChannels', $server);

        if ($server->channels()->count() <= 1) {
            return back()->withErrors(['channel' => 'El servidor debe tener al menos un canal.']);
        }

        $channel->delete();

        return redirect()->route('servers.show', $server);
    }
}
