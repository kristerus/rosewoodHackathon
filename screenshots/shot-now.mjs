import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(`PAGE: ${e.message}`));
page.on('console', m => { if (m.type() === 'error') errors.push(`CONSOLE: ${m.text()}`); });
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(800);
await page.screenshot({ path: 'now-dashboard.png', fullPage: false });
await page.goto('http://localhost:3000/badge', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(500);
await page.screenshot({ path: 'now-badge.png', fullPage: false });
await browser.close();
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); } else { console.log('No JS errors.'); }
