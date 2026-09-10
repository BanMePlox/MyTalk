<?php

namespace Database\Seeders;

use App\Models\Channel;
use App\Models\ChannelCategory;
use App\Models\Conversation;
use App\Models\DirectMessage;
use App\Models\Friendship;
use App\Models\Message;
use App\Models\Poll;
use App\Models\PollVote;
use App\Models\Server;
use App\Models\Thread;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DemoSeeder extends Seeder
{
    private const SERVER_NAME = 'Estudio Papel';

    public function run(): void
    {
        $demo = User::updateOrCreate(
            ['email' => 'test@example.com'],
            [
                'name'              => 'Pedro Demo',
                'password'          => Hash::make('password'),
                'email_verified_at' => now(),
                'status'            => 'online',
                'bio'               => 'Cuenta de demostración para portfolio y capturas.',
                'banner_color'      => '#6366f1',
            ]
        );

        $ana = User::updateOrCreate(
            ['email' => 'ana@demo.mytalk.local'],
            [
                'name'              => 'Ana García',
                'password'          => Hash::make('password'),
                'email_verified_at' => now(),
                'status'            => 'online',
                'bio'               => 'Diseñadora UX — datos de demo.',
                'banner_color'      => '#ec4899',
            ]
        );

        $carlos = User::updateOrCreate(
            ['email' => 'carlos@demo.mytalk.local'],
            [
                'name'              => 'Carlos Ruiz',
                'password'          => Hash::make('password'),
                'email_verified_at' => now(),
                'status'            => 'idle',
                'bio'               => 'Backend — datos de demo.',
                'banner_color'      => '#14b8a6',
            ]
        );

        Friendship::updateOrCreate(
            ['sender_id' => $demo->id, 'recipient_id' => $ana->id],
            ['status' => 'accepted']
        );

        $server = Server::firstOrCreate(
            ['name' => self::SERVER_NAME, 'owner_id' => $demo->id],
            []
        );

        $server->update(['owner_id' => $demo->id]);

        foreach ([$demo, $ana, $carlos] as $member) {
            $role = $member->id === $demo->id ? 'owner' : 'member';
            $server->members()->syncWithoutDetaching([$member->id => ['role' => $role]]);
        }

        $category = ChannelCategory::firstOrCreate(
            ['server_id' => $server->id, 'name' => 'Comunidad'],
            ['position' => 0]
        );

        $general = $this->upsertChannel($server, 'general', 'text', $category->id, 0);
        $this->upsertChannel($server, 'anuncios', 'announcement', $category->id, 1);
        $this->upsertChannel($server, 'sala-voz', 'voice', $category->id, 2);

        $this->resetDemoContent($server);

        Message::create([
            'channel_id' => $general->id,
            'user_id'    => $demo->id,
            'content'    => "Bienvenido a **Estudio Papel** — servidor de demostración de MyTalk.\n\nExplora markdown, enlaces y embeds en este canal.",
        ]);

        Message::create([
            'channel_id' => $general->id,
            'user_id'    => $ana->id,
            'content'    => "Mira este vídeo de referencia:\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ",
        ]);

        Message::create([
            'channel_id' => $general->id,
            'user_id'    => $carlos->id,
            'content'    => "```php\n// Bloque de código de ejemplo\nreturn 'MyTalk + Reverb + Inertia';\n```",
        ]);

        $threadStarter = Message::create([
            'channel_id' => $general->id,
            'user_id'    => $demo->id,
            'content'    => '¿Qué stack usamos para el chat en tiempo real? (abre este hilo)',
        ]);

        $thread = Thread::create([
            'channel_id'    => $general->id,
            'message_id'    => $threadStarter->id,
            'name'          => 'Stack de tiempo real',
            'reply_count'   => 2,
            'last_reply_at' => now(),
        ]);

        Message::create([
            'channel_id' => $general->id,
            'user_id'    => $ana->id,
            'content'    => 'Laravel **Reverb** para WebSockets y Laravel Echo en el cliente.',
            'thread_id'  => $thread->id,
        ]);

        Message::create([
            'channel_id' => $general->id,
            'user_id'    => $carlos->id,
            'content'    => 'Inertia + React en el frontend. Voz con WebRTC mesh (ver `docs/VOZ.md`).',
            'thread_id'  => $thread->id,
        ]);

        $poll = Poll::create([
            'channel_id' => $general->id,
            'user_id'    => $demo->id,
            'question'   => '¿Qué probamos primero en la demo?',
            'options'    => ['Chat en vivo', 'Hilos', 'Voz', 'App de escritorio'],
        ]);

        Message::create([
            'channel_id' => $general->id,
            'user_id'    => $demo->id,
            'content'    => '',
            'poll_id'    => $poll->id,
        ]);

        PollVote::create(['poll_id' => $poll->id, 'user_id' => $demo->id, 'option_index' => 0]);
        PollVote::create(['poll_id' => $poll->id, 'user_id' => $ana->id, 'option_index' => 2]);

        $announcementChannel = $server->channels()->where('name', 'anuncios')->first();
        if ($announcementChannel) {
            Message::create([
                'channel_id' => $announcementChannel->id,
                'user_id'    => $demo->id,
                'content'    => '📢 Canal de anuncios — solo admins/owner pueden publicar aquí.',
            ]);
        }

        $conversation = Conversation::where('type', 'direct')
            ->whereHas('users', fn ($q) => $q->where('user_id', $demo->id))
            ->whereHas('users', fn ($q) => $q->where('user_id', $ana->id))
            ->first();

        if (!$conversation) {
            $conversation = Conversation::create(['type' => 'direct']);
            $conversation->users()->attach([$demo->id, $ana->id]);
        }

        DirectMessage::where('conversation_id', $conversation->id)->delete();

        DirectMessage::create([
            'conversation_id' => $conversation->id,
            'user_id'         => $ana->id,
            'content'         => 'Hola Pedro — ¿preparamos la demo del portfolio?',
        ]);

        DirectMessage::create([
            'conversation_id' => $conversation->id,
            'user_id'         => $demo->id,
            'content'         => 'Sí: landing → chat → hilo → voz → mención de la app Tauri.',
        ]);

        $this->command?->info('Demo seed complete.');
        $this->command?->line("  Login: test@example.com / password");
        $this->command?->line("  Server: " . self::SERVER_NAME);
        $this->command?->line("  Channel: #{$general->name} (id {$general->id})");
        $this->command?->line("  DM with Ana García (conversation id {$conversation->id})");
    }

    private function upsertChannel(Server $server, string $name, string $type, int $categoryId, int $position): Channel
    {
        $channel = Channel::firstOrCreate(
            ['server_id' => $server->id, 'name' => $name],
            ['type' => $type, 'category_id' => $categoryId, 'position' => $position]
        );

        $channel->update([
            'type'        => $type,
            'category_id' => $categoryId,
            'position'    => $position,
        ]);

        return $channel;
    }

    private function resetDemoContent(Server $server): void
    {
        $channelIds = $server->channels()->pluck('id');

        DB::transaction(function () use ($channelIds) {
            $threadIds = Thread::whereIn('channel_id', $channelIds)->pluck('id');

            Message::whereIn('channel_id', $channelIds)->delete();
            Thread::whereIn('id', $threadIds)->delete();

            $pollIds = Poll::whereIn('channel_id', $channelIds)->pluck('id');
            PollVote::whereIn('poll_id', $pollIds)->delete();
            Poll::whereIn('id', $pollIds)->delete();
        });
    }
}
