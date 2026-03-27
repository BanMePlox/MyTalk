<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Poll extends Model
{
    protected $fillable = ['channel_id', 'user_id', 'question', 'options', 'ends_at'];

    protected $casts = [
        'options'  => 'array',
        'ends_at'  => 'datetime',
    ];

    public function votes()
    {
        return $this->hasMany(PollVote::class);
    }

    public function voteCounts(): array
    {
        return $this->votes()->selectRaw('option_index, count(*) as total')
            ->groupBy('option_index')
            ->pluck('total', 'option_index')
            ->all();
    }
}
