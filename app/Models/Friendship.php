<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Friendship extends Model
{
    protected $fillable = ['sender_id', 'recipient_id', 'status'];

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', 'pending');
    }

    public function scopeAccepted(Builder $query): Builder
    {
        return $query->where('status', 'accepted');
    }

    public static function between(int $a, int $b): Builder
    {
        return static::query()->where(function ($q) use ($a, $b) {
            $q->where('sender_id', $a)->where('recipient_id', $b);
        })->orWhere(function ($q) use ($a, $b) {
            $q->where('sender_id', $b)->where('recipient_id', $a);
        });
    }
}
