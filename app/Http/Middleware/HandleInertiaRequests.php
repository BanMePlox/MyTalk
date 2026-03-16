<?php

namespace App\Http\Middleware;

use App\Models\Conversation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
            'badges' => function () {
                if (!Auth::check()) return null;

                $userId = Auth::id();

                // Menciones no leídas por servidor: { server_id => count }
                $mentions = DB::table('unread_mentions')
                    ->where('user_id', $userId)
                    ->where('count', '>', 0)
                    ->pluck('count', 'server_id');

                // DMs no leídos: suma de mensajes más nuevos que last_read_message_id
                $unreadDms = Conversation::whereHas('users', fn($q) => $q->where('user_id', $userId))
                    ->with(['users' => fn($q) => $q->where('user_id', $userId)])
                    ->get()
                    ->sum(function ($conv) use ($userId) {
                        $pivot = $conv->users->first()?->pivot;
                        $lastRead = $pivot?->last_read_message_id;
                        return $conv->messages()
                            ->where('user_id', '!=', $userId)
                            ->when($lastRead, fn($q) => $q->where('id', '>', $lastRead))
                            ->count();
                    });

                return [
                    'mentions' => $mentions,
                    'dms'      => $unreadDms,
                ];
            },
        ];
    }
}
