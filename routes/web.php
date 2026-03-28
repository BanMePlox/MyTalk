<?php

use App\Http\Controllers\BanController;
use App\Http\Controllers\ThreadController;
use App\Http\Controllers\LinkPreviewController;
use App\Http\Controllers\PushSubscriptionController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ChannelPermissionController;
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
use App\Http\Controllers\VoiceController;
use App\Http\Controllers\PollController;
use App\Http\Controllers\ServerFolderController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return inertia('Welcome', ['auth' => ['user' => Auth::user()]]);
})->name('home');

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
    Route::post('/servers/{server}/background', [ServerController::class, 'updateBackground'])->name('servers.background');
    Route::delete('/servers/{server}/background', [ServerController::class, 'removeBackground'])->name('servers.background.remove');
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

    Route::post('/voice/{channel}/signal', [VoiceController::class, 'signal'])->name('voice.signal');
    Route::post('/voice/{channel}/presence', [VoiceController::class, 'presence'])->name('voice.presence');

    Route::post('/servers/{server}/channels', [ChannelController::class, 'store'])->name('channels.store');
    Route::patch('/servers/{server}/channels/reorder', [ChannelController::class, 'reorder'])->name('channels.reorder');
    Route::patch('/channels/{channel}/category', [ChannelController::class, 'assign'])->name('channels.assign');
    Route::patch('/channels/{channel}/type', [ChannelController::class, 'updateType'])->name('channels.type');
    Route::delete('/channels/{channel}', [ChannelController::class, 'destroy'])->name('channels.destroy');
    Route::put('/channels/{channel}/permissions/{role}', [ChannelPermissionController::class, 'upsert'])->name('channels.permissions.upsert');
    Route::delete('/channels/{channel}/permissions/{role}', [ChannelPermissionController::class, 'destroy'])->name('channels.permissions.destroy');

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
    Route::get('/messages/{message}/edits', [MessageController::class, 'edits'])->name('messages.edits');
    Route::delete('/messages/{message}', [MessageController::class, 'destroy'])->name('messages.destroy');
    Route::get('/channels/{channel}/search', [MessageController::class, 'search'])->name('messages.search');
    Route::patch('/messages/{message}/pin',   [MessageController::class, 'pin'])  ->name('messages.pin');
    Route::patch('/messages/{message}/unpin', [MessageController::class, 'unpin'])->name('messages.unpin');
    Route::post('/messages/{message}/reactions', [ReactionController::class, 'toggle'])->name('messages.react');
    Route::post('/channels/{channel}/polls', [PollController::class, 'store'])->name('polls.store');
    Route::post('/polls/{poll}/vote', [PollController::class, 'vote'])->name('polls.vote');

    Route::get('/channels/{channel}/threads', [ThreadController::class, 'index'])->name('threads.index');
    Route::post('/messages/{message}/thread', [ThreadController::class, 'create'])->name('threads.create');
    Route::get('/threads/{thread}', [ThreadController::class, 'show'])->name('threads.show');
    Route::patch('/threads/{thread}', [ThreadController::class, 'update'])->name('threads.update');
    Route::post('/threads/{thread}/messages', [ThreadController::class, 'store'])->middleware('throttle:120,1')->name('threads.store');

    Route::get('/search', GlobalSearchController::class)->name('search.global');

    Route::get('/link-preview', [LinkPreviewController::class, 'show'])->name('link.preview');

    Route::post('/push/subscribe', [PushSubscriptionController::class, 'store'])->name('push.subscribe');
    Route::post('/push/unsubscribe', [PushSubscriptionController::class, 'destroy'])->name('push.unsubscribe');

    Route::post('/server-folders', [ServerFolderController::class, 'store'])->name('server-folders.store');
    Route::patch('/server-folders/{serverFolder}', [ServerFolderController::class, 'update'])->name('server-folders.update');
    Route::delete('/server-folders/{serverFolder}', [ServerFolderController::class, 'destroy'])->name('server-folders.destroy');
    Route::post('/server-folders/{serverFolder}/add', [ServerFolderController::class, 'addServer'])->name('server-folders.add');
    Route::post('/server-folders/{serverFolder}/remove', [ServerFolderController::class, 'removeServer'])->name('server-folders.remove');

    Route::get('/servers/{server}/emojis', [\App\Http\Controllers\ServerEmojiController::class, 'index'])->name('server.emojis.index');
    Route::post('/servers/{server}/emojis', [\App\Http\Controllers\ServerEmojiController::class, 'store'])->name('server.emojis.store');
    Route::delete('/emojis/{emoji}', [\App\Http\Controllers\ServerEmojiController::class, 'destroy'])->name('server.emojis.destroy');
});

require __DIR__.'/auth.php';
