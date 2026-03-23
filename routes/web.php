<?php

use App\Http\Controllers\BanController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\NicknameController;
use App\Http\Controllers\FriendshipController;
use App\Http\Controllers\ChannelController;
use App\Http\Controllers\DirectMessageController;
use App\Http\Controllers\GlobalSearchController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\ReactionController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\ServerController;
use App\Http\Controllers\UserStatusController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return Auth::check()
        ? redirect()->route('servers.index')
        : redirect()->route('login');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::patch('/user/status', [UserStatusController::class, 'update'])->name('user.status');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('/servers', [ServerController::class, 'index'])->name('servers.index');
    Route::post('/servers', [ServerController::class, 'store'])->name('servers.store');
    Route::post('/servers/join', [ServerController::class, 'join'])->name('servers.join');
    Route::get('/invite/{code}', [ServerController::class, 'acceptInvite'])->name('invite.accept');
    Route::get('/servers/{server}', [ServerController::class, 'show'])->name('servers.show');
    Route::delete('/servers/{server}/leave', [ServerController::class, 'leave'])->name('servers.leave');
    Route::delete('/servers/{server}', [ServerController::class, 'destroy'])->name('servers.destroy');
    Route::post('/servers/{server}/icon', [ServerController::class, 'updateIcon'])->name('servers.icon');
    Route::patch('/servers/{server}/name', [ServerController::class, 'updateName'])->name('servers.name');
    Route::patch('/servers/{server}/nickname', [NicknameController::class, 'update'])->name('servers.nickname');

    Route::get('/servers/{server}/roles', [RoleController::class, 'index'])->name('roles.index');
    Route::post('/servers/{server}/roles', [RoleController::class, 'store'])->name('roles.store');
    Route::patch('/roles/{role}', [RoleController::class, 'update'])->name('roles.update');
    Route::delete('/roles/{role}', [RoleController::class, 'destroy'])->name('roles.destroy');

    Route::patch('/servers/{server}/members/{user}', [MemberController::class, 'update'])->name('members.update');
    Route::delete('/servers/{server}/members/{user}', [MemberController::class, 'destroy'])->name('members.destroy');

    Route::get('/servers/{server}/bans', [BanController::class, 'index'])->name('bans.index');
    Route::post('/servers/{server}/bans/{user}', [BanController::class, 'store'])->name('bans.store');
    Route::delete('/servers/{server}/bans/{user}', [BanController::class, 'destroy'])->name('bans.destroy');

    Route::post('/servers/{server}/channels', [ChannelController::class, 'store'])->name('channels.store');
    Route::patch('/channels/{channel}/category', [ChannelController::class, 'assign'])->name('channels.assign');
    Route::delete('/channels/{channel}', [ChannelController::class, 'destroy'])->name('channels.destroy');

    Route::post('/servers/{server}/categories', [CategoryController::class, 'store'])->name('categories.store');
    Route::patch('/categories/{category}', [CategoryController::class, 'update'])->name('categories.update');
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy'])->name('categories.destroy');

    Route::get('/friends', [FriendshipController::class, 'index'])->name('friends.index');
    Route::post('/friends/{user}', [FriendshipController::class, 'store'])->name('friends.store');
    Route::patch('/friends/{user}', [FriendshipController::class, 'update'])->name('friends.update');
    Route::delete('/friends/{user}', [FriendshipController::class, 'destroy'])->name('friends.destroy');

    Route::get('/conversations', [ConversationController::class, 'index'])->name('conversations.index');
    Route::post('/conversations/group', [ConversationController::class, 'createGroup'])->name('conversations.group.create');
    Route::post('/conversations/open/{user}', [ConversationController::class, 'open'])->name('conversations.open');
    Route::get('/conversations/{conversation}', [ConversationController::class, 'show'])->name('conversations.show');
    Route::post('/conversations/{conversation}/messages', [ConversationController::class, 'store'])->middleware('throttle:120,1')->name('conversations.store');
    Route::patch('/conversations/{conversation}/group', [ConversationController::class, 'updateGroup'])->name('conversations.group.update');
    Route::post('/conversations/{conversation}/members', [ConversationController::class, 'addMember'])->name('conversations.members.add');
    Route::delete('/conversations/{conversation}/leave', [ConversationController::class, 'leave'])->name('conversations.leave');
    Route::patch('/direct-messages/{directMessage}', [DirectMessageController::class, 'update'])->name('direct-messages.update');
    Route::delete('/direct-messages/{directMessage}', [DirectMessageController::class, 'destroy'])->name('direct-messages.destroy');

    Route::get('/channels/{channel}', [MessageController::class, 'index'])->name('channels.show');
    Route::get('/channels/{channel}/messages', [MessageController::class, 'more'])->name('messages.more');
    Route::post('/channels/{channel}/messages', [MessageController::class, 'store'])->middleware('throttle:120,1')->name('messages.store');
    Route::patch('/messages/{message}', [MessageController::class, 'update'])->name('messages.update');
    Route::delete('/messages/{message}', [MessageController::class, 'destroy'])->name('messages.destroy');
    Route::get('/channels/{channel}/search', [MessageController::class, 'search'])->name('messages.search');
    Route::patch('/messages/{message}/pin',   [MessageController::class, 'pin'])  ->name('messages.pin');
    Route::patch('/messages/{message}/unpin', [MessageController::class, 'unpin'])->name('messages.unpin');
    Route::post('/messages/{message}/reactions', [ReactionController::class, 'toggle'])->name('messages.react');

    Route::get('/search', GlobalSearchController::class)->name('search.global');
});

require __DIR__.'/auth.php';
