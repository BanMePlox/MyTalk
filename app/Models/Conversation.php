<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Conversation extends Model
{
    public function users()
    {
        return $this->belongsToMany(User::class)->withPivot('last_read_message_id');
    }

    public function messages()
    {
        return $this->hasMany(DirectMessage::class);
    }

    public function otherUser(int $authId): ?User
    {
        return $this->users->firstWhere('id', '!=', $authId);
    }
}
