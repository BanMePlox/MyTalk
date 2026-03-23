<?php

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PushSubscriptionController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'endpoint' => 'required|string',
            'p256dh'   => 'required|string',
            'auth'     => 'required|string',
        ]);

        PushSubscription::updateOrCreate(
            ['endpoint' => $data['endpoint']],
            array_merge($data, ['user_id' => Auth::id()])
        );

        return response()->noContent();
    }

    public function destroy(Request $request)
    {
        $endpoint = $request->validate(['endpoint' => 'required|string'])['endpoint'];

        PushSubscription::where('user_id', Auth::id())
            ->where('endpoint', $endpoint)
            ->delete();

        return response()->noContent();
    }
}
