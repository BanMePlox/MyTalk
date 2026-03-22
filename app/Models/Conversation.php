<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends Model
{
    protected $fillable = ['type', 'name', 'icon_color', 'owner_id'];

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->withPivot('last_read_message_id', 'role');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(DirectMessage::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function isGroup(): bool
    {
        return $this->type === 'group';
    }

    public function otherUser(int $authId): ?User
    {
        if ($this->isGroup()) return null;
        return $this->users->firstWhere('id', '!=', $authId);
    }

    public function displayName(int $authId): string
    {
        if ($this->name) return $this->name;
        if (!$this->isGroup()) {
            return $this->otherUser($authId)?->name ?? 'Desconocido';
        }
        $names = $this->users
            ->where('id', '!=', $authId)
            ->take(3)
            ->pluck('name');
        $extra = max(0, $this->users->count() - 1 - 3);
        $label = $names->join(', ');
        return $extra > 0 ? "{$label} y {$extra} más" : $label;
    }
}
