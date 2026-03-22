<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->timestamp('pinned_at')->nullable()->after('attachment');
            $table->foreignId('pinned_by')->nullable()->constrained('users')->nullOnDelete()->after('pinned_at');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('pinned_by');
            $table->dropColumn('pinned_at');
        });
    }
};
