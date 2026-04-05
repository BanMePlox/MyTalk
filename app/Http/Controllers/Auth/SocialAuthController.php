<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;

class SocialAuthController extends Controller
{
    private const SUPPORTED = ['google', 'github', 'linkedin'];

    // Maps URL-friendly provider name → Socialite driver name
    private const DRIVER_MAP = [
        'linkedin' => 'linkedin-openid',
    ];

    private function driver(string $provider): string
    {
        return self::DRIVER_MAP[$provider] ?? $provider;
    }

    /**
     * Redirect the user to the provider's OAuth page.
     */
    public function redirect(string $provider): RedirectResponse
    {
        abort_unless(in_array($provider, self::SUPPORTED), 404);

        $scopes = match ($provider) {
            'github' => ['user:email'],
            default  => [],
        };

        $driver = Socialite::driver($this->driver($provider));

        if ($scopes) {
            $driver->scopes($scopes);
        }

        return $driver->redirect();
    }

    /**
     * Handle the OAuth callback from the provider.
     */
    public function callback(string $provider): RedirectResponse
    {
        abort_unless(in_array($provider, self::SUPPORTED), 404);

        try {
            $social = Socialite::driver($this->driver($provider))->user();
        } catch (InvalidStateException) {
            return redirect()->route('login')->withErrors(['oauth' => __('OAuth state mismatch. Please try again.')]);
        }

        $email = $social->getEmail();

        // Some GitHub accounts have no public email — reject gracefully
        if (!$email) {
            return redirect()->route('login')
                ->withErrors(['oauth' => __('Your :provider account has no public email address. Please add a public email or register manually.', ['provider' => ucfirst($provider)])]);
        }

        $idField = "{$provider}_id";

        // 1. Find by provider ID (returning user via same provider)
        $user = User::where($idField, $social->getId())->first();

        if (!$user) {
            // 2. Find by email (link existing account)
            $user = User::where('email', $email)->first();
        }

        if ($user) {
            // Update provider ID and avatar if not already set
            $updates = [$idField => $social->getId()];
            if (!$user->avatar && !$user->avatar_external) {
                $updates['avatar_external'] = $social->getAvatar();
            }
            $user->update($updates);
        } else {
            // 3. Create new user
            $user = User::create([
                'name'             => $social->getName() ?? $social->getNickname() ?? explode('@', $email)[0],
                'email'            => $email,
                'password'         => null,
                $idField           => $social->getId(),
                'avatar_external'  => $social->getAvatar(),
                'email_verified_at'=> now(),
            ]);
        }

        Auth::login($user, remember: true);

        return redirect()->intended(route('friends.index', absolute: false));
    }
}
