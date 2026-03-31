<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SystemUserSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'system@mytalk.internal'],
            [
                'name'       => 'MyTalk',
                'password'   => Hash::make(Str::random(64)),
                'is_system'  => true,
                'is_admin'   => false,
                'status'     => 'online',
                'bio'        => 'Cuenta oficial de MyTalk.',
            ]
        );
    }
}
