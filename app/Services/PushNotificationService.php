<?php

namespace App\Services;

use App\Models\PushSubscription;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class PushNotificationService
{
    private WebPush $webPush;

    public function __construct()
    {
        $this->webPush = new WebPush([
            'VAPID' => [
                'subject'    => config('services.vapid.subject'),
                'publicKey'  => config('services.vapid.public_key'),
                'privateKey' => config('services.vapid.private_key'),
            ],
        ]);
    }

    /**
     * Send a push notification to all subscriptions of a given user.
     */
    public function sendToUser(int $userId, string $title, string $body, string $url = '/', ?string $icon = null): void
    {
        $subscriptions = PushSubscription::where('user_id', $userId)->get();
        if ($subscriptions->isEmpty()) return;

        $payload = json_encode(['title' => $title, 'body' => $body, 'url' => $url, 'icon' => $icon ?? '/icon.svg']);

        foreach ($subscriptions as $sub) {
            $subscription = Subscription::create([
                'endpoint'        => $sub->endpoint,
                'keys'            => ['p256dh' => $sub->p256dh, 'auth' => $sub->auth],
                'contentEncoding' => 'aesgcm',
            ]);
            $this->webPush->queueNotification($subscription, $payload);
        }

        foreach ($this->webPush->flush() as $report) {
            if (!$report->isSuccess()) {
                PushSubscription::where('endpoint', $report->getEndpoint())->delete();
            }
        }
    }
}
