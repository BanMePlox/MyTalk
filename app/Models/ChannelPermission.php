<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChannelPermission extends Model
{
    protected $fillable = ['channel_id', 'role_id', 'can_view', 'can_send'];

    protected $casts = [
        'can_view' => 'boolean',
        'can_send' => 'boolean',
    ];

    public function channel(): BelongsTo
    {
        return $this->belongsTo(Channel::class);
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }
}
