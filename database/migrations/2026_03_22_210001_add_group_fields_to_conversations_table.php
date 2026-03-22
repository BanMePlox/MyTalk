<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->enum('type', ['direct', 'group'])->default('direct')->after('id');
            $table->string('name')->nullable()->after('type');
            $table->string('icon_color', 7)->nullable()->after('name');
            $table->foreignId('owner_id')->nullable()->after('icon_color')
                ->constrained('users')->nullOnDelete();
        });

        Schema::table('conversation_user', function (Blueprint $table) {
            $table->enum('role', ['member', 'admin'])->default('member')->after('last_read_message_id');
        });
    }

    public function down(): void
    {
        Schema::table('conversation_user', function (Blueprint $table) {
            $table->dropColumn('role');
        });
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('owner_id');
            $table->dropColumn(['type', 'name', 'icon_color']);
        });
    }
};
