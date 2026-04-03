<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class RoleAndMemberTest extends TestCase
{
    use RefreshDatabase, CreatesTestData;

    // ── Roles ─────────────────────────────────────────────────────────────────

    public function test_owner_can_create_role(): void
    {
        $owner  = User::factory()->create();
        $server = $this->makeServer($owner);

        $this->actingAs($owner)
            ->post("/servers/{$server->id}/roles", ['name' => 'Moderator', 'color' => '#ff0000', 'permissions' => ['manage_channels']])
            ->assertStatus(201);

        $this->assertDatabaseHas('roles', ['server_id' => $server->id, 'name' => 'Moderator']);
    }

    public function test_member_without_manage_roles_cannot_create_role(): void
    {
        $owner  = User::factory()->create();
        $member = User::factory()->create();
        $server = $this->makeServer($owner);
        $this->joinServer($server, $member);

        $this->actingAs($member)
            ->post("/servers/{$server->id}/roles", ['name' => 'Hack', 'color' => '#ff0000', 'permissions' => ['manage_channels']])
            ->assertForbidden();
    }

    public function test_member_with_manage_roles_can_create_role(): void
    {
        $owner  = User::factory()->create();
        $member = User::factory()->create();
        $server = $this->makeServer($owner);
        $this->joinServer($server, $member);
        $role = $this->makeRole($server, ['manage_roles']);
        $this->assignRole($member, $role);

        $this->actingAs($member)
            ->post("/servers/{$server->id}/roles", ['name' => 'New Role', 'color' => '#00ff00', 'permissions' => ['manage_channels']])
            ->assertStatus(201);
    }

    public function test_owner_can_delete_role(): void
    {
        $owner  = User::factory()->create();
        $server = $this->makeServer($owner);
        $role   = $this->makeRole($server, ['manage_channels']);

        $this->actingAs($owner)->delete("/roles/{$role->id}")->assertNoContent();

        $this->assertDatabaseMissing('roles', ['id' => $role->id]);
    }

    public function test_member_without_permission_cannot_delete_role(): void
    {
        $owner  = User::factory()->create();
        $member = User::factory()->create();
        $server = $this->makeServer($owner);
        $this->joinServer($server, $member);
        $role = $this->makeRole($server, ['manage_channels']);

        $this->actingAs($member)->delete("/roles/{$role->id}")->assertForbidden();
    }

    // ── Assign role to member ─────────────────────────────────────────────────

    public function test_owner_can_assign_role_to_member(): void
    {
        $owner  = User::factory()->create();
        $member = User::factory()->create();
        $server = $this->makeServer($owner);
        $this->joinServer($server, $member);
        $role = $this->makeRole($server, ['manage_channels']);

        $this->actingAs($owner)
            ->patch("/servers/{$server->id}/members/{$member->id}", ['role_id' => $role->id, 'action' => 'add'])
            ->assertNoContent();
    }

    public function test_member_without_manage_roles_cannot_assign_role(): void
    {
        $owner       = User::factory()->create();
        $member      = User::factory()->create();
        $otherMember = User::factory()->create();
        $server      = $this->makeServer($owner);
        $this->joinServer($server, $member);
        $this->joinServer($server, $otherMember);
        $role = $this->makeRole($server, ['manage_channels']);

        $this->actingAs($member)
            ->patch("/servers/{$server->id}/members/{$otherMember->id}", ['role_id' => $role->id, 'action' => 'add'])
            ->assertForbidden();
    }

    // ── Kick ──────────────────────────────────────────────────────────────────

    public function test_owner_can_kick_member(): void
    {
        $owner  = User::factory()->create();
        $member = User::factory()->create();
        $server = $this->makeServer($owner);
        $this->joinServer($server, $member);

        $this->actingAs($owner)
            ->delete("/servers/{$server->id}/members/{$member->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('server_members', [
            'server_id' => $server->id,
            'user_id'   => $member->id,
        ]);
    }

    public function test_member_with_kick_permission_can_kick(): void
    {
        $owner  = User::factory()->create();
        $kicker = User::factory()->create();
        $target = User::factory()->create();
        $server = $this->makeServer($owner);
        $this->joinServer($server, $kicker);
        $this->joinServer($server, $target);
        $role = $this->makeRole($server, ['kick_members']);
        $this->assignRole($kicker, $role);

        $this->actingAs($kicker)
            ->delete("/servers/{$server->id}/members/{$target->id}")
            ->assertNoContent();
    }

    public function test_member_without_permission_cannot_kick(): void
    {
        $owner  = User::factory()->create();
        $kicker = User::factory()->create();
        $target = User::factory()->create();
        $server = $this->makeServer($owner);
        $this->joinServer($server, $kicker);
        $this->joinServer($server, $target);

        $this->actingAs($kicker)
            ->delete("/servers/{$server->id}/members/{$target->id}")
            ->assertForbidden();
    }

    public function test_owner_cannot_be_kicked(): void
    {
        $owner  = User::factory()->create();
        $admin  = User::factory()->create();
        $server = $this->makeServer($owner);
        $this->joinServer($server, $admin, 'admin');

        $this->actingAs($admin)
            ->delete("/servers/{$server->id}/members/{$owner->id}")
            ->assertForbidden();
    }

    // ── Ban ───────────────────────────────────────────────────────────────────

    public function test_owner_can_ban_member(): void
    {
        $owner  = User::factory()->create();
        $member = User::factory()->create();
        $server = $this->makeServer($owner);
        $this->joinServer($server, $member);

        $this->actingAs($owner)
            ->post("/servers/{$server->id}/bans/{$member->id}")
            ->assertNoContent();

        $this->assertDatabaseHas('server_bans', [
            'server_id' => $server->id,
            'user_id'   => $member->id,
        ]);
    }

    public function test_member_without_permission_cannot_ban(): void
    {
        $owner  = User::factory()->create();
        $banner = User::factory()->create();
        $target = User::factory()->create();
        $server = $this->makeServer($owner);
        $this->joinServer($server, $banner);
        $this->joinServer($server, $target);

        $this->actingAs($banner)
            ->post("/servers/{$server->id}/bans/{$target->id}")
            ->assertForbidden();
    }

    public function test_owner_cannot_be_banned(): void
    {
        $owner  = User::factory()->create();
        $admin  = User::factory()->create();
        $server = $this->makeServer($owner);
        $this->joinServer($server, $admin, 'admin');

        $this->actingAs($admin)
            ->post("/servers/{$server->id}/bans/{$owner->id}")
            ->assertForbidden();
    }

    // ── Admin panel ───────────────────────────────────────────────────────────

    public function test_admin_user_can_access_admin_panel(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->withoutVite()->actingAs($admin)->get('/admin')->assertOk();
    }

    public function test_regular_user_cannot_access_admin_panel(): void
    {
        $user = User::factory()->create(['is_admin' => false]);

        $this->actingAs($user)->get('/admin')->assertForbidden();
    }
}
