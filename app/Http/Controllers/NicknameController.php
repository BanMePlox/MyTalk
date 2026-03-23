<?php

namespace App\Http\Controllers;

use App\Events\NicknameUpdated;
use App\Models\Server;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NicknameController extends Controller
{
    public function update(Request $request, Server $server)
    {
        $this->authorize('view', $server);

        $data = $request->validate([
            'nickname' => 'nullable|string|max:32',
        ]);

        $nickname = $data['nickname'] ? trim($data['nickname']) : null;

        $server->members()->updateExistingPivot(Auth::id(), ['nickname' => $nickname]);

        broadcast(new NicknameUpdated($server->id, Auth::id(), $nickname));

        return response()->json(['nickname' => $nickname]);
    }
}
