<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class ServerPermissionsTest extends TestCase
{
    use RefreshDatabase, CreatesTestData;

    // ── Delete ────────────────────────────────────────────────────────────────

    public function test_owner_can_delete_server(): void
    {
        $owner = User::factory()->create();
        $server = $this->makeServer($owner);

        $response = $this->actingAs($owner)->delete("/servers/{$server->id}");

        $response->assertRedirect();
        $this->assertDatabaseMissing('servers', ['id' => $server->id]);
    }

    public function test_member_cannot_delete_server(): void
    {
        $owner  = User::factory()->create();
        $member = User::factory()->create();
        $server = $this->makeServer($owner);
        $this->joinServer($server, $member);

        $this->actingAs($member)->delete("/servers/{$server->id}")->assertForbidden();
    }

    public function test_non_member_cannot_delete_server(): void
    {
        $owner   = User::factory()->create();
        $outsider = User::factory()->create();
        $server  = $this->makeServer($owner);

        $this->actingAs($outsider)->delete("/servers/{$server->id}")->assertForbidden();
    }

    // ── Update name ───────────────────────────────────────────────────────────

    public function test_owner_can_update_server_name(): void
    {
        $owner  = User::factory()->create();
        $server = $this->makeServer($owner);

        $this->actingAs($owner)
            ->patch("/servers/{$server->id}/name", ['name' => 'New Name'])
            ->assertOk();

        $this->assertDatabaseHas('servers', ['id' => $server->id, 'name' => 'New Name']);
    }

    public function test_member_cannot_update_server_name(): void
    {
        $owner  = User::factory()->create();
        $member = User::factory()->create();
        $server = $this->makeServer($owner);
        $this->joinServer($server, $member);

        $this->actingAs($member)
            ->patch("/servers/{$server->id}/name", ['name' => 'Hacked'])
            ->assertForbidden();
    }

    // ── Leave ─────────────────────────────────────────────────────────────────

    public function test_member_can_leave_server(): void
    {
        $owner  = User::factory()->create();
        $member = User::factory()->create();
        $server = $this->makeServer($owner);
        $this->joinServer($server, $member);

        $this->actingAs($member)->delete("/servers/{$server->id}/leave")->assertRedirect();

        $this->assertDatabaseMissing('server_members', [
            'server_id' => $server->id,
            'user_id'   => $member->id,
        ]);
    }

    public function test_owner_cannot_leave_server(): void
    {
        $owner  = User::factory()->create();
        $server = $this->makeServer($owner);

        // Returns redirect back with error, not 403
        $this->actingAs($owner)->delete("/servers/{$server->id}/leave")->assertRedirect();

        // Owner must still be a member
        $this->assertDatabaseHas('server_members', [
            'server_id' => $server->id,
            'user_id'   => $owner->id,
        ]);
    }

    // ── Join / invite ─────────────────────────────────────────────────────────

    public function test_user_can_join_server_with_valid_invite_code(): void
    {
        $owner  = User::factory()->create();
        $joiner = User::factory()->create();
        $server = $this->makeServer($owner);

        $this->actingAs($joiner)
            ->post('/servers/join', ['invite_code' => $server->invite_code])
            ->assertRedirect();

        $this->assertDatabaseHas('server_members', [
            'server_id' => $server->id,
            'user_id'   => $joiner->id,
        ]);
    }

    public function test_banned_user_cannot_join_server(): void
    {
        $owner  = User::factory()->create();
        $banned = User::factory()->create();
        $server = $this->makeServer($owner);
        $this->banUser($server, $banned, $owner);

        $this->actingAs($banned)
            ->post('/servers/join', ['invite_code' => $server->invite_code])
            ->assertForbidden();
    }

    public function test_banned_user_cannot_join_via_invite_link(): void
    {
        $owner  = User::factory()->create();
        $banned = User::factory()->create();
        $server = $this->makeServer($owner);
        $this->banUser($server, $banned, $owner);

        $this->actingAs($banned)
            ->get("/invite/{$server->invite_code}")
            ->assertForbidden();
    }
}
