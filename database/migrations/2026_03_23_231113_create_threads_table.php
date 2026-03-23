<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('threads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('channel_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('message_id'); // no FK yet — messages table added below
            $table->string('name')->nullable();
            $table->unsignedInteger('reply_count')->default(0);
            $table->timestamp('last_reply_at')->nullable();
            $table->timestamps();

            $table->foreign('message_id')->references('id')->on('messages')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('threads');
    }
};
