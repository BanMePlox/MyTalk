<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class ServerEmoji extends Model
{
    protected $table = 'server_emojis';

    protected $fillable = ['server_id', 'created_by', 'name', 'image_path'];

    protected $appends = ['url'];

    public function server(): BelongsTo
    {
        return $this->belongsTo(Server::class);
    }

    public function getUrlAttribute(): string
    {
        return Storage::url($this->image_path);
    }
}
