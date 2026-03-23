<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class LinkPreviewController extends Controller
{
    // Private/loopback ranges to block (SSRF prevention)
    private const BLOCKED_RANGES = [
        '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16',
        '127.0.0.0/8', '169.254.0.0/16', '::1/128', 'fc00::/7',
    ];

    public function show(Request $request)
    {
        $url = $request->validate(['url' => 'required|url|max:2000'])['url'];

        // Only allow http/https
        $scheme = strtolower(parse_url($url, PHP_URL_SCHEME) ?? '');
        if (!in_array($scheme, ['http', 'https'])) {
            return response()->json(['error' => 'invalid'], 422);
        }

        // Block private IPs
        $host = parse_url($url, PHP_URL_HOST);
        if ($host && $this->isPrivateHost($host)) {
            return response()->json(['error' => 'blocked'], 403);
        }

        $cacheKey = 'link_preview_' . md5($url);

        $preview = Cache::remember($cacheKey, now()->addHours(24), function () use ($url) {
            try {
                $response = Http::timeout(5)
                    ->withHeaders(['User-Agent' => 'Mozilla/5.0 (compatible; MyTalkBot/1.0)'])
                    ->get($url);

                if (!$response->successful()) return null;

                $html = $response->body();
                return $this->parseOg($html, $url);
            } catch (\Throwable) {
                return null;
            }
        });

        if (!$preview) return response()->json(null);

        return response()->json($preview);
    }

    private function parseOg(string $html, string $url): ?array
    {
        // Limit HTML size to avoid huge DOMs
        $html = mb_substr($html, 0, 100_000);

        libxml_use_internal_errors(true);
        $doc = new \DOMDocument();
        $doc->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NOERROR | LIBXML_NOWARNING);

        $data = ['url' => $url, 'title' => null, 'description' => null, 'image' => null, 'site_name' => null];

        $metas = $doc->getElementsByTagName('meta');
        foreach ($metas as $meta) {
            $prop    = strtolower($meta->getAttribute('property') ?: $meta->getAttribute('name'));
            $content = $meta->getAttribute('content');
            if (!$content) continue;

            match ($prop) {
                'og:title'       => $data['title']       = $content,
                'og:description' => $data['description'] = $content,
                'og:image'       => $data['image']       = $content,
                'og:site_name'   => $data['site_name']   = $content,
                'twitter:title'  => $data['title']       ??= $content,
                'twitter:description' => $data['description'] ??= $content,
                'twitter:image'  => $data['image']       ??= $content,
                'description'    => $data['description'] ??= $content,
                default          => null,
            };
        }

        // Fallback to <title> tag
        if (!$data['title']) {
            $titles = $doc->getElementsByTagName('title');
            if ($titles->length > 0) {
                $data['title'] = trim($titles->item(0)->textContent);
            }
        }

        // Nothing useful found
        if (!$data['title'] && !$data['description'] && !$data['image']) return null;

        // Truncate long strings
        if ($data['title'])       $data['title']       = mb_substr($data['title'], 0, 120);
        if ($data['description']) $data['description'] = mb_substr($data['description'], 0, 200);

        // Resolve relative image URLs
        if ($data['image'] && !str_starts_with($data['image'], 'http')) {
            $base = parse_url($url, PHP_URL_SCHEME) . '://' . parse_url($url, PHP_URL_HOST);
            $data['image'] = $base . '/' . ltrim($data['image'], '/');
        }

        return $data;
    }

    private function isPrivateHost(string $host): bool
    {
        // Resolve hostname to IP
        $ip = filter_var($host, FILTER_VALIDATE_IP) ? $host : gethostbyname($host);
        if ($ip === $host && !filter_var($ip, FILTER_VALIDATE_IP)) return false;

        foreach (self::BLOCKED_RANGES as $range) {
            if ($this->ipInRange($ip, $range)) return true;
        }
        return false;
    }

    private function ipInRange(string $ip, string $cidr): bool
    {
        [$subnet, $bits] = explode('/', $cidr);
        if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) return false;
        if (!filter_var($subnet, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) return false;

        $ip     = ip2long($ip);
        $subnet = ip2long($subnet);
        $mask   = -1 << (32 - (int) $bits);
        return ($ip & $mask) === ($subnet & $mask);
    }
}
