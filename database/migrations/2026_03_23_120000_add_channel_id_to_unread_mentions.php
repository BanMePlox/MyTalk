<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // SQLite doesn't support modifying primary keys, so recreate the table
        Schema::dropIfExists('unread_mentions');
        Schema::create('unread_mentions', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('server_id')->constrained()->cascadeOnDelete();
            $table->foreignId('channel_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('count')->default(0);
            $table->primary(['user_id', 'channel_id']);
            $table->index(['user_id', 'server_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unread_mentions');
        Schema::create('unread_mentions', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('server_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('count')->default(0);
            $table->primary(['user_id', 'server_id']);
        });
    }
};
