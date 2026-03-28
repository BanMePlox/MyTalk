<?php

namespace App\Http\Controllers;

use App\Models\UserEmoji;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class UserEmojiController extends Controller
{
    private const MAX_PER_USER = 4;

    public function store(Request $request)
    {
        $authId = Auth::id();

        abort_if(
            UserEmoji::where('user_id', $authId)->count() >= self::MAX_PER_USER,
            422,
            'Límite de ' . self::MAX_PER_USER . ' emojis personales alcanzado.'
        );

        $data = $request->validate([
            'name'  => ['required', 'string', 'max:32', 'regex:/^[a-z0-9_]+$/'],
            'image' => 'required|image|max:512',
        ]);

        abort_if(
            UserEmoji::where('user_id', $authId)->where('name', $data['name'])->exists(),
            422,
            'Ya tienes un emoji con ese nombre.'
        );

        $path = $request->file('image')->store('user-emojis/' . $authId, 'public');

        $emoji = UserEmoji::create([
            'user_id'    => $authId,
            'name'       => $data['name'],
            'image_path' => $path,
        ]);

        $emoji->append('url');

        return response()->json([
            'id'   => $emoji->id,
            'name' => $emoji->name,
            'url'  => $emoji->url,
        ]);
    }

    public function destroy(UserEmoji $userEmoji)
    {
        abort_unless($userEmoji->user_id === Auth::id(), 403);

        Storage::disk('public')->delete($userEmoji->image_path);
        $userEmoji->delete();

        return response()->json(['ok' => true]);
    }
}
