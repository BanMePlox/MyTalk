<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Channel extends Model
{
    protected $fillable = ['server_id', 'name', 'category_id', 'position'];

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
}
