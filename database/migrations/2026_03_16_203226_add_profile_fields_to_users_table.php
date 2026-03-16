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
        Schema::table('users', function (Blueprint $table) {
            $table->string('avatar')->nullable()->after('status');
            $table->string('bio', 160)->nullable()->after('avatar');
            $table->string('custom_status', 60)->nullable()->after('bio');
            $table->string('banner_color', 7)->default('#6366f1')->after('custom_status');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['avatar', 'bio', 'custom_status', 'banner_color']);
        });
    }
};
