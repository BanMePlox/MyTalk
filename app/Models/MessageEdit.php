<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MessageEdit extends Model
{
    public $timestamps = false;

    protected $fillable = ['message_id', 'content', 'edited_at'];

    protected function casts(): array
    {
        return ['edited_at' => 'datetime'];
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }
}
