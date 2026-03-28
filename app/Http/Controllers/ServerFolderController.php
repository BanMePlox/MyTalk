<?php

namespace App\Http\Controllers;

use App\Models\ServerFolder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ServerFolderController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'      => 'required|string|max:50',
            'color'     => 'required|string|max:7',
            'server_id' => 'required|exists:servers,id',
        ]);

        // Must be a member of the server
        $isMember = DB::table('server_members')
            ->where('user_id', Auth::id())
            ->where('server_id', $data['server_id'])
            ->exists();

        abort_unless($isMember, 403);

        $folder = ServerFolder::create([
            'user_id' => Auth::id(),
            'name'    => $data['name'],
            'color'   => $data['color'],
        ]);

        DB::table('server_members')
            ->where('user_id', Auth::id())
            ->where('server_id', $data['server_id'])
            ->update(['folder_id' => $folder->id]);

        return response()->json($folder);
    }

    public function update(Request $request, ServerFolder $serverFolder)
    {
        abort_unless($serverFolder->user_id === Auth::id(), 403);

        $data = $request->validate([
            'name'  => 'sometimes|string|max:50',
            'color' => 'sometimes|string|max:7',
        ]);

        $serverFolder->update($data);

        return response()->json($serverFolder);
    }

    public function destroy(ServerFolder $serverFolder)
    {
        abort_unless($serverFolder->user_id === Auth::id(), 403);

        // Unassign all servers from this folder (nullOnDelete handles it, but explicit is clearer)
        DB::table('server_members')
            ->where('user_id', Auth::id())
            ->where('folder_id', $serverFolder->id)
            ->update(['folder_id' => null]);

        $serverFolder->delete();

        return response()->json(['ok' => true]);
    }

    public function addServer(Request $request, ServerFolder $serverFolder)
    {
        abort_unless($serverFolder->user_id === Auth::id(), 403);

        $data = $request->validate(['server_id' => 'required|exists:servers,id']);

        $isMember = DB::table('server_members')
            ->where('user_id', Auth::id())
            ->where('server_id', $data['server_id'])
            ->exists();

        abort_unless($isMember, 403);

        DB::table('server_members')
            ->where('user_id', Auth::id())
            ->where('server_id', $data['server_id'])
            ->update(['folder_id' => $serverFolder->id]);

        return response()->json(['ok' => true]);
    }

    public function removeServer(Request $request, ServerFolder $serverFolder)
    {
        abort_unless($serverFolder->user_id === Auth::id(), 403);

        $data = $request->validate(['server_id' => 'required|exists:servers,id']);

        DB::table('server_members')
            ->where('user_id', Auth::id())
            ->where('server_id', $data['server_id'])
            ->where('folder_id', $serverFolder->id)
            ->update(['folder_id' => null]);

        return response()->json(['ok' => true]);
    }
}
