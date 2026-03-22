<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('channels', function (Blueprint $table) {
            $table->foreignId('category_id')->nullable()->after('server_id')
                ->constrained('channel_categories')->nullOnDelete();
            $table->unsignedSmallInteger('position')->default(0)->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('channels', function (Blueprint $table) {
            $table->dropConstrainedForeignId('category_id');
            $table->dropColumn('position');
        });
    }
};
