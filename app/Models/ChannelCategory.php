<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChannelCategory extends Model
{
    protected $fillable = ['server_id', 'name', 'position'];

    public function server(): BelongsTo
    {
        return $this->belongsTo(Server::class);
    }

    public function channels(): HasMany
    {
        return $this->hasMany(Channel::class, 'category_id')->orderBy('position');
    }
}
