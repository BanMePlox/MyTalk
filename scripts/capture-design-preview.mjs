import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';

const BASE = process.env.APP_URL || 'http://127.0.0.1:8000';
const OUT = path.resolve('docs/design-preview');
const EMAIL = 'test@example.com';
const PASSWORD = 'password';
const CHANNEL_ID = 1;
const CONVERSATION_ID = 1;

async function setTheme(page, theme) {
    await page.evaluate((t) => {
        localStorage.setItem('theme', t);
        document.documentElement.classList.toggle('dark', t === 'dark');
    }, theme);
}

async function login(page) {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/channels|friends|dashboard|conversations/, { timeout: 15000 });
}

async function shot(page, name, opts = {}) {
    const file = path.join(OUT, name);
    await page.screenshot({ path: file, fullPage: opts.fullPage ?? false });
    console.log('saved', name);
}

async function openServerSettings(page) {
    await page.locator('aside').nth(0).getByRole('button', { name: /Estudio Papel/i }).click();
    await page.waitForTimeout(300);
    await page.getByText('Ajustes del servidor').click();
    await page.waitForTimeout(600);
}

async function openProfileModal(page) {
    const channelSidebar = page.locator('aside').filter({ hasText: 'Estudio Papel' }).first();
    await channelSidebar.locator('button').last().click();
    await page.waitForTimeout(300);
    await page.getByText(/Mi perfil|My profile/i).click();
    await page.waitForTimeout(600);
}

async function captureTheme(browser, theme) {
    const suffix = theme === 'dark' ? '-dark' : '-light';
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    await page.goto(`${BASE}/`);
    await setTheme(page, theme);

    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await shot(page, `welcome${suffix}.png`);

    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await shot(page, `login${suffix}.png`);

    await page.goto(`${BASE}/terms`, { waitUntil: 'networkidle' });
    await shot(page, `legal${suffix}.png`, { fullPage: true });

    await login(page);

    await page.goto(`${BASE}/channels/${CHANNEL_ID}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await shot(page, `chat-layout${suffix}.png`);

    await page.goto(`${BASE}/friends`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await shot(page, `friends${suffix}.png`);

    await page.goto(`${BASE}/conversations/${CONVERSATION_ID}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await shot(page, `dm${suffix}.png`);

    await page.goto(`${BASE}/channels/${CHANNEL_ID}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await openServerSettings(page);
    await shot(page, `settings${suffix}.png`);

    await page.goto(`${BASE}/channels/${CHANNEL_ID}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    try {
        await openProfileModal(page);
        await shot(page, `profile-modal${suffix}.png`);
    } catch (err) {
        console.warn('profile-modal skip:', err.message);
    }

    await context.close();
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
    await captureTheme(browser, 'light');
    await captureTheme(browser, 'dark');
    console.log('Done.');
} finally {
    await browser.close();
}
