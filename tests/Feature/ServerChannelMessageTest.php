<?php

namespace Tests\Feature;

use App\Models\Channel;
use App\Models\Message;
use App\Models\Server;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Services\PushNotificationService;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class ServerChannelMessageTest extends TestCase
{
    use RefreshDatabase;

    private function makeServerWithChannel(User $owner, string $channelName = 'general'): array
    {
        $server = Server::create([
            'owner_id' => $owner->id,
            'name' => 'Test Server',
        ]);
        $server->members()->attach($owner->id, ['role' => 'owner']);
        $channel = $server->channels()->create(['name' => $channelName]);

        return [$server, $channel];
    }

    public function test_owner_can_create_server_and_lands_on_general_channel(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/servers', [
            'name' => 'MyTalk Lab',
        ]);

        $server = Server::where('name', 'MyTalk Lab')->first();
        $this->assertNotNull($server);
        $this->assertDatabaseHas('server_members', [
            'server_id' => $server->id,
            'user_id' => $user->id,
            'role' => 'owner',
        ]);

        $channel = Channel::where('server_id', $server->id)->where('name', 'general')->first();
        $this->assertNotNull($channel);
        $response->assertRedirect(route('channels.show', $channel));
    }

    public function test_member_can_view_channel_and_post_message(): void
    {
        Event::fake();
        $this->mock(PushNotificationService::class, function ($mock) {
            $mock->shouldReceive('sendToUser')->zeroOrMoreTimes();
        });

        $owner = User::factory()->create();
        $member = User::factory()->create();
        [$server, $channel] = $this->makeServerWithChannel($owner);
        $server->members()->attach($member->id, ['role' => 'member']);

        $this->withoutVite()->actingAs($member)
            ->get(route('channels.show', $channel))
            ->assertOk();

        $response = $this->actingAs($member)->postJson(route('messages.store', $channel), [
            'content' => 'hola canal',
        ]);

        $response->assertOk()
            ->assertJsonPath('content', 'hola canal')
            ->assertJsonPath('user.id', $member->id);

        $this->assertDatabaseHas('messages', [
            'channel_id' => $channel->id,
            'user_id' => $member->id,
            'content' => 'hola canal',
        ]);
    }

    public function test_non_member_cannot_view_or_post_in_channel(): void
    {
        Event::fake();

        $owner = User::factory()->create();
        $stranger = User::factory()->create();
        [, $channel] = $this->makeServerWithChannel($owner);

        // MessageController::index redirects non-members (Inertia::location), not 403
        $this->withoutVite()->actingAs($stranger)
            ->get(route('channels.show', $channel))
            ->assertRedirect(route('friends.index'));

        $this->actingAs($stranger)
            ->postJson(route('messages.store', $channel), ['content' => 'intruso'])
            ->assertForbidden();

        $this->assertDatabaseMissing('messages', [
            'channel_id' => $channel->id,
            'content' => 'intruso',
        ]);
    }

    public function test_author_can_edit_and_delete_own_message_but_not_others(): void
    {
        Event::fake();

        $owner = User::factory()->create();
        $member = User::factory()->create();
        [$server, $channel] = $this->makeServerWithChannel($owner);
        $server->members()->attach($member->id, ['role' => 'member']);

        $own = Message::create([
            'channel_id' => $channel->id,
            'user_id' => $member->id,
            'content' => 'mio',
        ]);
        $other = Message::create([
            'channel_id' => $channel->id,
            'user_id' => $owner->id,
            'content' => 'suyo',
        ]);

        $this->actingAs($member)
            ->patchJson(route('messages.update', $own), ['content' => 'mio editado'])
            ->assertOk();

        $this->assertDatabaseHas('messages', [
            'id' => $own->id,
            'content' => 'mio editado',
        ]);

        $this->actingAs($member)
            ->patchJson(route('messages.update', $other), ['content' => 'hack'])
            ->assertForbidden();

        $this->actingAs($member)
            ->deleteJson(route('messages.destroy', $own))
            ->assertNoContent();

        $this->assertDatabaseMissing('messages', ['id' => $own->id]);

        $this->actingAs($member)
            ->deleteJson(route('messages.destroy', $other))
            ->assertForbidden();
    }

    public function test_guest_is_redirected_from_channel_routes(): void
    {
        $owner = User::factory()->create();
        [, $channel] = $this->makeServerWithChannel($owner);

        $this->get(route('channels.show', $channel))->assertRedirect(route('login'));
        $this->post(route('messages.store', $channel), ['content' => 'x'])->assertRedirect(route('login'));
    }
}
