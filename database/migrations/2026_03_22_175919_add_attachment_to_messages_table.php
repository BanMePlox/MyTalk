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
        Schema::table('messages', function (Blueprint $table) {
            $table->string('attachment')->nullable()->after('content');
        });

        Schema::table('direct_messages', function (Blueprint $table) {
            $table->string('attachment')->nullable()->after('content');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn('attachment');
        });

        Schema::table('direct_messages', function (Blueprint $table) {
            $table->dropColumn('attachment');
        });
    }
};
