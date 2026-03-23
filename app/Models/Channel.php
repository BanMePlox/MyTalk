<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Channel extends Model
{
    protected $fillable = ['server_id', 'name', 'type', 'category_id', 'position'];

    public function server(): BelongsTo
    {
        return $this->belongsTo(Server::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ChannelCategory::class, 'category_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function permissions(): HasMany
    {
        return $this->hasMany(ChannelPermission::class);
    }

    /**
     * Resolves whether a user can view/send in this channel.
     * - Owner: always allowed.
     * - No role overrides for this channel: allowed.
     * - Any of the user's roles has can_view/can_send = false: denied.
     * - Otherwise: allowed.
     */
    public function canUserView(User $user): bool
    {
        if ($this->server->owner_id === $user->id) return true;

        return $this->resolvePermission($user, 'can_view');
    }

    public function canUserSend(User $user): bool
    {
        if ($this->server->owner_id === $user->id) return true;

        return $this->resolvePermission($user, 'can_send');
    }

    private function resolvePermission(User $user, string $field): bool
    {
        // All overrides for this channel
        $allOverrides = ChannelPermission::where('channel_id', $this->id)->get();

        // No overrides at all → default allow
        if ($allOverrides->isEmpty()) return true;

        $userRoleIds = DB::table('server_member_roles')
            ->where('user_id', $user->id)
            ->where('server_id', $this->server_id)
            ->pluck('role_id')
            ->all();

        $userOverrides = $allOverrides->whereIn('role_id', $userRoleIds);

        // Explicit deny for any of the user's roles → denied
        if ($userOverrides->where($field, false)->isNotEmpty()) return false;

        // Explicit allow for any of the user's roles → allowed
        if ($userOverrides->where($field, true)->isNotEmpty()) return true;

        // Channel has overrides but none for the user's roles.
        // If ANY role has an explicit allow, the channel is "restricted" → user is denied.
        // If only denies exist (no explicit allow), channel is open by default → user is allowed.
        return $allOverrides->where($field, true)->isEmpty();
    }
}
