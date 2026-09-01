// THROWAWAY SPIKE DRIVER — Increment 1 harness proof-of-life for
// webp-anim-encoder-spike.html (WebPAnimEncoder vs FFmpeg benchmark).
// Requires the dev server running (npm run serve).
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', m => { if (m.type() === 'error') console.log('[console.error]', m.text()); });
page.on('pageerror', e => console.log('[pageerror]', String(e)));
await page.goto('http://localhost:3000/scripts/spikes/webp-anim-encoder-spike.html', { waitUntil: 'load' });
await page.waitForFunction(() => document.getElementById('out')?.textContent.includes('DONE'), null, { timeout: 30000 });
console.log(await page.locator('#out').innerText());
await browser.close();
