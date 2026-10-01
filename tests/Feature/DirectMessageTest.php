<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\DirectMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class DirectMessageTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_open_direct_conversation_with_another_user(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();

        $response = $this->actingAs($a)->post(route('conversations.open', $b));

        $conversation = Conversation::where('type', 'direct')
            ->whereHas('users', fn ($q) => $q->where('user_id', $a->id))
            ->whereHas('users', fn ($q) => $q->where('user_id', $b->id))
            ->first();

        $this->assertNotNull($conversation);
        $response->assertRedirect(route('conversations.show', $conversation));
    }

    public function test_opening_dm_with_self_is_forbidden(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('conversations.open', $user))
            ->assertForbidden();
    }

    public function test_participant_can_send_dm_and_outsider_cannot(): void
    {
        Event::fake();

        $a = User::factory()->create();
        $b = User::factory()->create();
        $outsider = User::factory()->create();

        $conversation = Conversation::create(['type' => 'direct']);
        $conversation->users()->attach([$a->id, $b->id]);

        $this->actingAs($a)
            ->postJson(route('conversations.store', $conversation), ['content' => 'ping'])
            ->assertOk()
            ->assertJsonPath('content', 'ping')
            ->assertJsonPath('user.id', $a->id);

        $this->assertDatabaseHas('direct_messages', [
            'conversation_id' => $conversation->id,
            'user_id' => $a->id,
            'content' => 'ping',
        ]);

        $this->actingAs($outsider)
            ->postJson(route('conversations.store', $conversation), ['content' => 'nope'])
            ->assertForbidden();

        $this->actingAs($outsider)
            ->get(route('conversations.show', $conversation))
            ->assertForbidden();
    }

    public function test_empty_dm_without_attachment_is_rejected(): void
    {
        Event::fake();

        $a = User::factory()->create();
        $b = User::factory()->create();
        $conversation = Conversation::create(['type' => 'direct']);
        $conversation->users()->attach([$a->id, $b->id]);

        $this->actingAs($a)
            ->postJson(route('conversations.store', $conversation), ['content' => ''])
            ->assertStatus(422);
    }

    public function test_reopening_existing_dm_reuses_conversation(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();

        $existing = Conversation::create(['type' => 'direct']);
        $existing->users()->attach([$a->id, $b->id]);

        $this->actingAs($a)
            ->post(route('conversations.open', $b))
            ->assertRedirect(route('conversations.show', $existing));

        $this->assertSame(1, Conversation::where('type', 'direct')->count());
    }
}
