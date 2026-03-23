<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('channel_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('channel_id')->constrained()->cascadeOnDelete();
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->boolean('can_view')->default(true);
            $table->boolean('can_send')->default(true);
            $table->timestamps();

            $table->unique(['channel_id', 'role_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('channel_permissions');
    }
};
