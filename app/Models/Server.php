<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class Server extends Model
{
    protected $fillable = ['owner_id', 'name', 'icon', 'invite_code'];

    protected $appends = ['icon_url'];

    public function getIconUrlAttribute(): ?string
    {
        return $this->icon ? Storage::disk('public')->url($this->icon) : null;
    }

    protected static function booted(): void
    {
        static::creating(function (Server $server) {
            $server->invite_code = Str::random(8);
        });
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'server_members')
            ->withPivot('role', 'nickname')
            ->withTimestamps();
    }

    public function channels(): HasMany
    {
        return $this->hasMany(Channel::class)->orderBy('position');
    }

    public function categories(): HasMany
    {
        return $this->hasMany(ChannelCategory::class)->orderBy('position');
    }

    public function roles(): HasMany
    {
        return $this->hasMany(Role::class)->orderBy('position');
    }
}
