<?php

use App\Http\Controllers\ChannelController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ServerController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return Auth::check()
        ? redirect()->route('servers.index')
        : redirect()->route('login');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('/servers', [ServerController::class, 'index'])->name('servers.index');
    Route::post('/servers', [ServerController::class, 'store'])->name('servers.store');
    Route::post('/servers/join', [ServerController::class, 'join'])->name('servers.join');
    Route::get('/servers/{server}', [ServerController::class, 'show'])->name('servers.show');
    Route::delete('/servers/{server}', [ServerController::class, 'destroy'])->name('servers.destroy');

    Route::post('/servers/{server}/channels', [ChannelController::class, 'store'])->name('channels.store');

    Route::get('/channels/{channel}', [MessageController::class, 'index'])->name('channels.show');
    Route::post('/channels/{channel}/messages', [MessageController::class, 'store'])->name('messages.store');
});

require __DIR__.'/auth.php';
