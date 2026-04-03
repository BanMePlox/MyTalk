<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesTestData;
use Tests\TestCase;

class MessagePermissionsTest extends TestCase
{
    use RefreshDatabase, CreatesTestData;

    // ── Edit ──────────────────────────────────────────────────────────────────

    public function test_author_can_edit_own_message(): void
    {
        $owner   = User::factory()->create();
        $server  = $this->makeServer($owner);
        $channel = $this->makeChannel($server);
        $message = $this->makeMessage($channel, $owner, 'Original');

        $this->actingAs($owner)
            ->patch("/messages/{$message->id}", ['content' => 'Edited'])
            ->assertOk();

        $this->assertDatabaseHas('messages', ['id' => $message->id, 'content' => 'Edited']);
    }

    public function test_member_cannot_edit_others_message(): void
    {
        $owner   = User::factory()->create();
        $member  = User::factory()->create();
        $server  = $this->makeServer($owner);
        $channel = $this->makeChannel($server);
        $this->joinServer($server, $member);
        $message = $this->makeMessage($channel, $owner, 'Original');

        $this->actingAs($member)
            ->patch("/messages/{$message->id}", ['content' => 'Hacked'])
            ->assertForbidden();
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    public function test_author_can_delete_own_message(): void
    {
        $owner   = User::factory()->create();
        $server  = $this->makeServer($owner);
        $channel = $this->makeChannel($server);
        $message = $this->makeMessage($channel, $owner);

        $this->actingAs($owner)->delete("/messages/{$message->id}")->assertNoContent();

        $this->assertDatabaseMissing('messages', ['id' => $message->id]);
    }

    public function test_member_cannot_delete_others_message(): void
    {
        $owner   = User::factory()->create();
        $member  = User::factory()->create();
        $server  = $this->makeServer($owner);
        $channel = $this->makeChannel($server);
        $this->joinServer($server, $member);
        $message = $this->makeMessage($channel, $owner);

        $this->actingAs($member)->delete("/messages/{$message->id}")->assertForbidden();
    }

    public function test_moderator_can_delete_others_message(): void
    {
        $owner   = User::factory()->create();
        $mod     = User::factory()->create();
        $server  = $this->makeServer($owner);
        $channel = $this->makeChannel($server);
        $this->joinServer($server, $mod);
        $role = $this->makeRole($server, ['manage_messages']);
        $this->assignRole($mod, $role);
        $message = $this->makeMessage($channel, $owner);

        $this->actingAs($mod)->delete("/messages/{$message->id}")->assertNoContent();

        $this->assertDatabaseMissing('messages', ['id' => $message->id]);
    }

    // ── Pin ───────────────────────────────────────────────────────────────────

    public function test_owner_can_pin_message(): void
    {
        $owner   = User::factory()->create();
        $server  = $this->makeServer($owner);
        $channel = $this->makeChannel($server);
        $message = $this->makeMessage($channel, $owner);

        $this->actingAs($owner)->patch("/messages/{$message->id}/pin")->assertOk();

        $this->assertNotNull($message->fresh()->pinned_at);
    }

    public function test_regular_member_cannot_pin_message(): void
    {
        $owner   = User::factory()->create();
        $member  = User::factory()->create();
        $server  = $this->makeServer($owner);
        $channel = $this->makeChannel($server);
        $this->joinServer($server, $member);
        $message = $this->makeMessage($channel, $owner);

        $this->actingAs($member)->patch("/messages/{$message->id}/pin")->assertForbidden();
    }

    public function test_moderator_can_pin_message(): void
    {
        $owner   = User::factory()->create();
        $mod     = User::factory()->create();
        $server  = $this->makeServer($owner);
        $channel = $this->makeChannel($server);
        $this->joinServer($server, $mod);
        $role = $this->makeRole($server, ['manage_messages']);
        $this->assignRole($mod, $role);
        $message = $this->makeMessage($channel, $owner);

        $this->actingAs($mod)->patch("/messages/{$message->id}/pin")->assertOk();
    }

    // ── Announcement channel ──────────────────────────────────────────────────

    public function test_regular_member_cannot_post_to_announcement_channel(): void
    {
        $owner   = User::factory()->create();
        $member  = User::factory()->create();
        $server  = $this->makeServer($owner);
        $channel = $this->makeChannel($server, 'announcement');
        $this->joinServer($server, $member);

        $this->actingAs($member)
            ->post("/channels/{$channel->id}/messages", ['content' => 'Hello'])
            ->assertForbidden();
    }

    public function test_owner_can_post_to_announcement_channel(): void
    {
        $owner   = User::factory()->create();
        $server  = $this->makeServer($owner);
        $channel = $this->makeChannel($server, 'announcement');

        $this->actingAs($owner)
            ->post("/channels/{$channel->id}/messages", ['content' => 'Announcement!'])
            ->assertOk();
    }

    public function test_moderator_can_post_to_announcement_channel(): void
    {
        $owner   = User::factory()->create();
        $mod     = User::factory()->create();
        $server  = $this->makeServer($owner);
        $channel = $this->makeChannel($server, 'announcement');
        $this->joinServer($server, $mod);
        $role = $this->makeRole($server, ['manage_messages']);
        $this->assignRole($mod, $role);

        $this->actingAs($mod)
            ->post("/channels/{$channel->id}/messages", ['content' => 'Announcement!'])
            ->assertOk();
    }
}
