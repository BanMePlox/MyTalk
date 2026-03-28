<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('server_members', 'folder_id')) {
            Schema::table('server_members', function (Blueprint $table) {
                $table->foreignId('folder_id')->nullable()->constrained('server_folders')->nullOnDelete()->after('role');
            });
        }
    }

    public function down(): void
    {
        Schema::table('server_members', function (Blueprint $table) {
            $table->dropForeign(['folder_id']);
            $table->dropColumn('folder_id');
        });
    }
};
