<?php

namespace App\Http\Controllers;

use App\Models\Server;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
        $data = $request->validate(['name' => 'required|string|max:100']);

        $server = Server::create([
            'owner_id' => Auth::id(),
            'name'     => $data['name'],
        ]);

        $server->members()->attach(Auth::id(), ['role' => 'owner']);
        $server->channels()->create(['name' => 'general']);

        return redirect()->route('servers.show', $server);
    }

    public function show(Server $server): Response
    {
        $this->authorize('view', $server);

        $server->load(['channels', 'members']);
        $channel = $server->channels()->first();

        $member = $server->members()->where('user_id', Auth::id())->first();
        $canManageChannels = $member && in_array($member->pivot->role, ['owner', 'admin']);

        return Inertia::render('Servers/Show', [
            'server'             => $server,
            'channel'            => $channel,
            'canManageChannels'  => $canManageChannels,
            'inviteUrl'          => route('invite.accept', $server->invite_code),
        ]);
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
