<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class ChannelPermissionsTest extends TestCase
{
    use RefreshDatabase, CreatesTestData;

    // ── Create channel ────────────────────────────────────────────────────────

    public function test_owner_can_create_channel(): void
    {
        $owner  = User::factory()->create();
        $server = $this->makeServer($owner);

        $this->actingAs($owner)
            ->post("/servers/{$server->id}/channels", ['name' => 'new-channel', 'type' => 'text'])
            ->assertRedirect();

        $this->assertDatabaseHas('channels', ['server_id' => $server->id, 'name' => 'new-channel']);
    }

    public function test_member_without_permission_cannot_create_channel(): void
    {
        $owner  = User::factory()->create();
        $member = User::factory()->create();
        $server = $this->makeServer($owner);
        $this->joinServer($server, $member);

        $this->actingAs($member)
            ->post("/servers/{$server->id}/channels", ['name' => 'hack', 'type' => 'text'])
            ->assertForbidden();
    }

    public function test_member_with_manage_channels_permission_can_create_channel(): void
    {
        $owner  = User::factory()->create();
        $member = User::factory()->create();
        $server = $this->makeServer($owner);
        $this->joinServer($server, $member);
        $role = $this->makeRole($server, ['manage_channels']);
        $this->assignRole($member, $role);

        $this->actingAs($member)
            ->post("/servers/{$server->id}/channels", ['name' => 'new-channel', 'type' => 'text'])
            ->assertRedirect();
    }

    public function test_admin_system_role_can_create_channel(): void
    {
        $owner  = User::factory()->create();
        $admin  = User::factory()->create();
        $server = $this->makeServer($owner);
        $this->joinServer($server, $admin, 'admin');

        $this->actingAs($admin)
            ->post("/servers/{$server->id}/channels", ['name' => 'admin-channel', 'type' => 'text'])
            ->assertRedirect();
    }

    // ── Delete channel ────────────────────────────────────────────────────────

    public function test_owner_can_delete_channel(): void
    {
        $owner   = User::factory()->create();
        $server  = $this->makeServer($owner);
        $channel = $this->makeChannel($server);
        $this->makeChannel($server); // need at least 2 so deletion is allowed

        $this->actingAs($owner)->delete("/channels/{$channel->id}")->assertRedirect();

        $this->assertDatabaseMissing('channels', ['id' => $channel->id]);
    }

    public function test_cannot_delete_last_channel_in_server(): void
    {
        $owner   = User::factory()->create();
        $server  = $this->makeServer($owner);
        $channel = $this->makeChannel($server);

        // Returns redirect back with error, not 403
        $this->actingAs($owner)->delete("/channels/{$channel->id}")->assertRedirect();

        // Channel must still exist
        $this->assertDatabaseHas('channels', ['id' => $channel->id]);
    }

    public function test_member_without_permission_cannot_delete_channel(): void
    {
        $owner   = User::factory()->create();
        $member  = User::factory()->create();
        $server  = $this->makeServer($owner);
        $channel = $this->makeChannel($server);
        $this->makeChannel($server);
        $this->joinServer($server, $member);

        $this->actingAs($member)->delete("/channels/{$channel->id}")->assertForbidden();
    }

    // ── Channel-level send permissions ────────────────────────────────────────

    public function test_member_can_post_to_unrestricted_channel(): void
    {
        $owner   = User::factory()->create();
        $member  = User::factory()->create();
        $server  = $this->makeServer($owner);
        $channel = $this->makeChannel($server);
        $this->joinServer($server, $member);

        $this->actingAs($member)
            ->post("/channels/{$channel->id}/messages", ['content' => 'Hello'])
            ->assertOk();
    }

    public function test_non_member_cannot_post_to_channel(): void
    {
        $owner    = User::factory()->create();
        $outsider = User::factory()->create();
        $server   = $this->makeServer($owner);
        $channel  = $this->makeChannel($server);

        $this->actingAs($outsider)
            ->post("/channels/{$channel->id}/messages", ['content' => 'Hello'])
            ->assertForbidden();
    }

    public function test_member_with_explicit_deny_cannot_post(): void
    {
        $owner   = User::factory()->create();
        $member  = User::factory()->create();
        $server  = $this->makeServer($owner);
        $channel = $this->makeChannel($server);
        $this->joinServer($server, $member);
        $role = $this->makeRole($server, ['manage_channels']);
        $this->assignRole($member, $role);
        $this->setChannelPermission($channel, $role, true, false);

        $this->actingAs($member)
            ->post("/channels/{$channel->id}/messages", ['content' => 'Hello'])
            ->assertForbidden();
    }

    public function test_member_without_explicit_allow_cannot_post_to_restricted_channel(): void
    {
        $owner       = User::factory()->create();
        $member      = User::factory()->create();
        $allowedUser = User::factory()->create();
        $server      = $this->makeServer($owner);
        $channel     = $this->makeChannel($server);
        $this->joinServer($server, $member);
        $this->joinServer($server, $allowedUser);

        // Create a role with explicit allow, assigned only to $allowedUser
        $allowedRole = $this->makeRole($server, ['manage_channels']);
        $this->assignRole($allowedUser, $allowedRole);
        $this->setChannelPermission($channel, $allowedRole, true, true);

        // $member has no role with explicit allow → restricted channel → denied
        $this->actingAs($member)
            ->post("/channels/{$channel->id}/messages", ['content' => 'Hello'])
            ->assertForbidden();
    }

    public function test_member_with_explicit_allow_can_post_to_restricted_channel(): void
    {
        $owner   = User::factory()->create();
        $member  = User::factory()->create();
        $server  = $this->makeServer($owner);
        $channel = $this->makeChannel($server);
        $this->joinServer($server, $member);
        $role = $this->makeRole($server, ['manage_channels']);
        $this->assignRole($member, $role);
        $this->setChannelPermission($channel, $role, true, true);

        $this->actingAs($member)
            ->post("/channels/{$channel->id}/messages", ['content' => 'Hello'])
            ->assertOk();
    }
}
