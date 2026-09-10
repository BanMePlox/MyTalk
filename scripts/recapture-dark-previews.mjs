import { chromium } from 'playwright';
import path from 'path';

const BASE = process.env.APP_URL || 'http://127.0.0.1:8000';
const OUT = path.resolve('docs/design-preview');
const EMAIL = 'test@example.com';
const PASSWORD = 'password';
const CHANNEL_ID = 1;
const CONVERSATION_ID = 1;

async function ensureDark(page) {
    await page.evaluate(() => {
        localStorage.setItem('theme', 'dark');
        document.documentElement.classList.add('dark');
    });
    await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
    // ThemeProvider may strip .dark briefly on hydrate — wait for it to stick
    await page.waitForTimeout(300);
    const ok = await page.evaluate(() => ({
        ls: localStorage.getItem('theme'),
        dark: document.documentElement.classList.contains('dark'),
        bg: getComputedStyle(document.body).backgroundColor,
    }));
    if (!ok.dark || ok.ls !== 'dark') {
        throw new Error(`Dark mode not applied: ${JSON.stringify(ok)}`);
    }
    return ok;
}

async function login(page) {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await ensureDark(page);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/channels|friends|dashboard|conversations/, { timeout: 15000 });
    await ensureDark(page);
}

async function shot(page, name) {
    const state = await ensureDark(page);
    const file = path.join(OUT, name);
    await page.screenshot({ path: file });
    console.log('saved', name, 'body-bg=', state.bg);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

// Apply dark theme before any document loads in this context
await context.addInitScript(() => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
});

const page = await context.newPage();

try {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await shot(page, 'welcome-dark.png');

    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await shot(page, 'login-dark.png');

    await page.goto(`${BASE}/terms`, { waitUntil: 'networkidle' });
    await ensureDark(page);
    await page.screenshot({ path: path.join(OUT, 'legal-dark.png'), fullPage: true });
    console.log('saved legal-dark.png');

    await login(page);

    await page.goto(`${BASE}/channels/${CHANNEL_ID}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await shot(page, 'chat-layout-dark.png');

    await page.goto(`${BASE}/friends`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await shot(page, 'friends-dark.png');

    await page.goto(`${BASE}/conversations/${CONVERSATION_ID}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await shot(page, 'dm-dark.png');

    console.log('Done — dark previews recaptured.');
} finally {
    await browser.close();
}
