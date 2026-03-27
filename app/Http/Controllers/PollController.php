<?php

namespace App\Http\Controllers;

use App\Events\MessageSent;
use App\Events\PollVoted;
use App\Models\Channel;
use App\Models\Message;
use App\Models\Poll;
use App\Models\PollVote;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PollController extends Controller
{
    public function store(Request $request, Channel $channel)
    {
        abort_if(!$channel->server, 404);
        $this->authorize('view', $channel->server);
        abort_if(!$channel->canUserSend(Auth::user()), 403);

        $data = $request->validate([
            'question' => 'required|string|max:200',
            'options'  => 'required|array|min:2|max:6',
            'options.*' => 'required|string|max:80',
        ]);

        $poll = Poll::create([
            'channel_id' => $channel->id,
            'user_id'    => Auth::id(),
            'question'   => $data['question'],
            'options'    => array_values($data['options']),
        ]);

        $message = Message::create([
            'channel_id' => $channel->id,
            'user_id'    => Auth::id(),
            'content'    => '',
            'poll_id'    => $poll->id,
        ]);

        $message->load('user', 'poll');
        broadcast(new MessageSent($message))->toOthers();

        return response()->json($this->messagePayload($message, $poll, null));
    }

    public function vote(Request $request, Poll $poll)
    {
        $data = $request->validate([
            'option_index' => 'required|integer|min:0',
        ]);

        abort_if($data['option_index'] >= count($poll->options), 422);

        DB::table('poll_votes')->updateOrInsert(
            ['poll_id' => $poll->id, 'user_id' => Auth::id()],
            ['option_index' => $data['option_index'], 'updated_at' => now(), 'created_at' => now()]
        );

        $voteCounts = $poll->voteCounts();
        $totalVotes = array_sum($voteCounts);

        // Find message id for this poll
        $messageId = Message::where('poll_id', $poll->id)->value('id');

        broadcast(new PollVoted($poll->channel_id, $poll->id, $messageId, $voteCounts, $totalVotes));

        return response()->json([
            'vote_counts' => $voteCounts,
            'total_votes' => $totalVotes,
            'my_vote'     => $data['option_index'],
        ]);
    }

    private function messagePayload(Message $message, Poll $poll, ?int $myVote): array
    {
        $voteCounts = $poll->voteCounts();
        return [
            'id'               => $message->id,
            'content'          => '',
            'attachment_url'   => null,
            'attachment_name'  => null,
            'reactions_grouped' => [],
            'poll_id'          => $poll->id,
            'poll'             => [
                'id'          => $poll->id,
                'question'    => $poll->question,
                'options'     => $poll->options,
                'vote_counts' => $voteCounts,
                'total_votes' => array_sum($voteCounts),
                'my_vote'     => $myVote,
                'ends_at'     => $poll->ends_at,
            ],
            'created_at'       => $message->created_at,
            'reply_to'         => null,
            'user'             => [
                'id'           => $message->user->id,
                'name'         => $message->user->name,
                'avatar_url'   => $message->user->avatar_url,
                'banner_color' => $message->user->banner_color,
            ],
        ];
    }
}
