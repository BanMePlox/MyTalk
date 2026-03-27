<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'status',
        'avatar',
        'bio',
        'custom_status',
        'banner_color',
    ];

    protected $appends = ['avatar_url'];

    public function getAvatarUrlAttribute(): ?string
    {
        return $this->avatar ? Storage::disk('public')->url($this->avatar) : null;
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'email',
        'email_verified_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function servers(): BelongsToMany
    {
        return $this->belongsToMany(Server::class, 'server_members')
            ->withPivot('role', 'nickname')
            ->withTimestamps();
    }

    public function rolesInServer(int $serverId): Collection
    {
        $roleIds = DB::table('server_member_roles')
            ->where('user_id', $this->id)
            ->where('server_id', $serverId)
            ->pluck('role_id');

        return Role::whereIn('id', $roleIds)->get();
    }

    public function friendshipWith(int $userId): ?Friendship
    {
        return Friendship::between($this->id, $userId)->first();
    }

    public function friends(): Collection
    {
        $sent     = Friendship::where('sender_id', $this->id)->accepted()->with('recipient')->get()->pluck('recipient');
        $received = Friendship::where('recipient_id', $this->id)->accepted()->with('sender')->get()->pluck('sender');
        return $sent->merge($received);
    }

    public function hasPermission(Server $server, string $permission): bool
    {
        if ($server->owner_id === $this->id) {
            return true;
        }

        $systemRole = $server->members()
            ->where('user_id', $this->id)
            ->value('role');

        if ($systemRole === 'admin' && in_array($permission, ['manage_channels', 'manage_messages'])) {
            return true;
        }

        return $this->rolesInServer($server->id)
            ->contains(fn(Role $role) => in_array($permission, $role->permissions ?? []));
    }
}
