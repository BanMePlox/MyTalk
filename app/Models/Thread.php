<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Thread extends Model
{
    protected $fillable = ['channel_id', 'message_id', 'name', 'reply_count', 'last_reply_at'];

    protected $casts = ['last_reply_at' => 'datetime'];

    public function channel(): BelongsTo
    {
        return $this->belongsTo(Channel::class);
    }

    public function starterMessage(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'message_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class, 'thread_id')->with('user')->orderBy('created_at');
    }
}
