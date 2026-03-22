<?php

namespace App\Http\Controllers;

use App\Events\DirectMessageDeleted;
use App\Events\DirectMessageUpdated;
use App\Models\DirectMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class DirectMessageController extends Controller
{
    public function update(Request $request, DirectMessage $directMessage)
    {
        abort_if($directMessage->user_id !== Auth::id(), 403);

        $data = $request->validate(['content' => 'required|string|max:2000']);
        $directMessage->update(['content' => $data['content']]);

        broadcast(new DirectMessageUpdated($directMessage))->toOthers();

        return response()->json([
            'id'         => $directMessage->id,
            'content'    => $directMessage->content,
            'updated_at' => $directMessage->updated_at,
        ]);
    }

    public function destroy(DirectMessage $directMessage)
    {
        abort_if($directMessage->user_id !== Auth::id(), 403);

        broadcast(new DirectMessageDeleted($directMessage))->toOthers();

        if ($directMessage->attachment) {
            Storage::disk('public')->delete($directMessage->attachment);
        }

        $directMessage->delete();

        return response()->noContent();
    }
}
