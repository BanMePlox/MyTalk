<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Role extends Model
{
    protected $fillable = ['server_id', 'name', 'color', 'permissions', 'position'];

    protected $casts = [
        'permissions' => 'array',
    ];

    public function server(): BelongsTo
    {
        return $this->belongsTo(Server::class);
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'server_member_roles', 'role_id', 'user_id')
            ->withPivot('server_id');
    }
}
