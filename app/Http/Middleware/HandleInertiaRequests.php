<?php

namespace App\Http\Middleware;

use App\Models\Conversation;
use App\Models\Friendship;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

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

                $mentionRows = DB::table('unread_mentions')
                    ->where('user_id', $userId)
                    ->where('count', '>', 0)
                    ->get(['server_id', 'channel_id', 'count']);

                // server_id → total count (for server rail badge)
                $mentions = $mentionRows->groupBy('server_id')->map(fn($rows) => $rows->sum('count'));

                // channel_id → count (for channel sidebar badge)
                $channelMentions = $mentionRows->pluck('count', 'channel_id');

                $conversations = Conversation::whereHas('users', fn($q) => $q->where('user_id', $userId))
                    ->with(['users'])
                    ->get()
                    ->map(function ($conv) use ($userId) {
                        $me       = $conv->users->firstWhere('id', $userId);
                        $lastRead = $me?->pivot?->last_read_message_id;
                        $unread   = $conv->messages()
                            ->where('user_id', '!=', $userId)
                            ->when($lastRead, fn($q) => $q->where('id', '>', $lastRead))
                            ->count();

                        if ($conv->isGroup()) {
                            return [
                                'id'         => $conv->id,
                                'type'       => 'group',
                                'unread'     => $unread,
                                'name'       => $conv->displayName($userId),
                                'icon_color' => $conv->icon_color,
                                'user'       => null,
                            ];
                        }

                        $other = $conv->users->firstWhere('id', '!=', $userId);
                        return [
                            'id'     => $conv->id,
                            'type'   => 'direct',
                            'unread' => $unread,
                            'name'   => null,
                            'icon_color' => null,
                            'user'   => $other ? [
                                'id'           => $other->id,
                                'name'         => $other->name,
                                'avatar_url'   => $other->avatar_url,
                                'banner_color' => $other->banner_color,
                            ] : null,
                        ];
                    })
                    ->filter(fn($c) => $c['user'] !== null || $c['type'] === 'group')
                    ->values();

                $pendingFriendRequests = Friendship::where('recipient_id', $userId)
                    ->pending()
                    ->count();

                return [
                    'mentions'             => $mentions,
                    'channelMentions'      => $channelMentions,
                    'dms'                  => $conversations->sum('unread'),
                    'dmConversations'      => $conversations,
                    'pendingFriendRequests' => $pendingFriendRequests,
                ];
            },
        ];
    }
}
