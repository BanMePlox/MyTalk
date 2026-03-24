<?php

namespace App\Http\Controllers;

use App\Events\ServerEmojiUpdated;
use App\Models\Server;
use App\Models\ServerEmoji;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class ServerEmojiController extends Controller
{
    public function index(Server $server)
    {
        abort_if(!$server->members()->where('user_id', Auth::id())->exists(), 403);

        return response()->json($server->emojis()->orderBy('name')->get());
    }

    public function store(Request $request, Server $server)
    {
        abort_if($server->owner_id !== Auth::id(), 403);

        $data = $request->validate([
            'name'  => ['required', 'string', 'max:32', 'regex:/^[a-z0-9_]+$/'],
            'image' => 'required|image|max:512',
        ]);

        abort_if($server->emojis()->where('name', $data['name'])->exists(), 422, 'Ya existe un emoji con ese nombre.');

        $path = $request->file('image')->store('emojis/' . $server->id, 'public');

        $emoji = $server->emojis()->create([
            'created_by' => Auth::id(),
            'name'       => $data['name'],
            'image_path' => $path,
        ]);

        $emoji->refresh()->append('url');
        broadcast(new ServerEmojiUpdated('added', $server->id, $emoji->id, [
            'id'   => $emoji->id,
            'name' => $emoji->name,
            'url'  => $emoji->url,
        ]))->toOthers();

        return response()->json($emoji);
    }

    public function destroy(ServerEmoji $emoji)
    {
        abort_if($emoji->server->owner_id !== Auth::id(), 403);

        $serverId = $emoji->server_id;
        $emojiId  = $emoji->id;
        Storage::disk('public')->delete($emoji->image_path);
        $emoji->delete();
        broadcast(new ServerEmojiUpdated('deleted', $serverId, $emojiId))->toOthers();

        return response()->json(['ok' => true]);
    }
}
