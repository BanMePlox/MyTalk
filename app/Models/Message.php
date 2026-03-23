<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Storage;

class Message extends Model
{
    protected $fillable = ['channel_id', 'user_id', 'content', 'attachment', 'pinned_at', 'pinned_by', 'reply_to_id'];

    protected $casts = ['pinned_at' => 'datetime'];

    protected $appends = ['attachment_url'];

    public function getAttachmentUrlAttribute(): ?string
    {
        return $this->attachment ? Storage::disk('public')->url($this->attachment) : null;
    }

    public function channel(): BelongsTo
    {
        return $this->belongsTo(Channel::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function pinnedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pinned_by');
    }

    public function replyTo(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'reply_to_id')->with('user');
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(MessageReaction::class);
    }

    public function scopePinned(Builder $query): Builder
    {
        return $query->whereNotNull('pinned_at');
    }

    // Devuelve [{emoji, count, user_ids}] agrupado
    public function reactionsGrouped(): array
    {
        return $this->reactions
            ->groupBy('emoji')
            ->map(fn($group, $emoji) => [
                'emoji'    => $emoji,
                'count'    => $group->count(),
                'user_ids' => $group->pluck('user_id')->all(),
            ])
            ->values()
            ->all();
    }
}
