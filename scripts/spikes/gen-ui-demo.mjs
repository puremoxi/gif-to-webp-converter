// THROWAWAY DRIVER — runs generate-ui-demo-fixture.html and saves the result
// to scripts/spikes/fixtures/ui_demo.mp4. Requires the dev server running.
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'fixtures', 'ui_demo.gif');
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', m => { if (m.type() === 'error') console.log('[console.error]', m.text()); });
page.on('pageerror', e => console.log('[pageerror]', String(e)));

await page.goto('http://localhost:3000/scripts/spikes/generate-ui-demo-fixture.html', { waitUntil: 'load' });
await page.waitForFunction(() => document.getElementById('out')?.textContent.includes('DONE'), null, { timeout: 60000 });
console.log(await page.locator('#out').innerText());

const b64 = await page.evaluate(() => window.__uiDemoBase64);
if (!b64) { console.error('No output produced.'); process.exit(1); }
fs.writeFileSync(OUT, Buffer.from(b64, 'base64'));
console.log(`Saved: ${OUT} (${(fs.statSync(OUT).size/1024).toFixed(1)} KB)`);

await browser.close();
