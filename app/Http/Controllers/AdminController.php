<?php

namespace App\Http\Controllers;

use App\Events\DirectMessageSent;
use App\Events\NewDirectMessage;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AdminController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Index', [
            'stats' => [
                'users'         => User::where('is_system', false)->count(),
                'conversations' => Conversation::count(),
            ],
        ]);
    }

    public function broadcast(Request $request)
    {
        $request->validate([
            'message' => 'required|string|max:4000',
        ]);

        $systemUser = User::where('is_system', true)->firstOrFail();
        $users      = User::where('is_system', false)->where('id', '!=', $systemUser->id)->get();

        DB::transaction(function () use ($systemUser, $users, $request) {
            foreach ($users as $user) {
                $conversation = Conversation::where('type', 'direct')
                    ->whereHas('users', fn($q) => $q->where('user_id', $systemUser->id))
                    ->whereHas('users', fn($q) => $q->where('user_id', $user->id))
                    ->first();

                if (!$conversation) {
                    $conversation = Conversation::create(['type' => 'direct']);
                    $conversation->users()->attach([$systemUser->id, $user->id]);
                }

                $message = $conversation->messages()->create([
                    'user_id' => $systemUser->id,
                    'content' => $request->message,
                ]);

                $message->load('user');

                broadcast(new DirectMessageSent($message));
                broadcast(new NewDirectMessage($message, $user, $conversation));
            }
        });

        return back()->with('success', 'Mensaje enviado a ' . $users->count() . ' usuarios.');
    }
}
