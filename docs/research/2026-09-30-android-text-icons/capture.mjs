// Browser regression captures, NOT Android fontScale or launcher screenshots.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repo = process.cwd(), out = path.dirname(new URL(import.meta.url).pathname);
const before = '43a49ce4a39a701e09985aefe17961489b21a4c5';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-android-presentation-'));
const oldRoot = path.join(temp, 'before');
fs.mkdirSync(oldRoot);
execFileSync('tar', ['-xf', '-', '-C', oldRoot], { input: execFileSync('git', ['archive', before], { maxBuffer: 1024 * 1024 * 1024 }) });
fs.symlinkSync(path.join(repo, 'node_modules'), path.join(oldRoot, 'node_modules'), 'dir');
const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-US', timezoneId: 'Asia/Seoul' };
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--mute-audio'] });
const report = { before, after: 'WORKTREE based on ' + before, capturedAt: new Date().toISOString(), browser: browser.version(), mobile,
  scope: 'Actual web game regression only. Native Android fontScale and launcher cannot be verified without an Android device/emulator.',
  metrics: {}, files: {}, errors: [], checks: [] };
fs.mkdirSync(path.join(out, 'screenshots'), { recursive: true });
const selectors = ['.brand-mark', '#target-label', '#target-text', '#letter-board', '#letter-board button', '#btn-alphabet-start'];
async function shot(page, side, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  const file = `${side}-${name}.png`, bytes = await page.screenshot({ path: path.join(out, 'screenshots', file) });
  assert.equal(bytes.readUInt32BE(16), 780); assert.equal(bytes.readUInt32BE(20), 1688);
  report.files[file] = { width: 780, height: 1688, sha256: createHash('sha256').update(bytes).digest('hex') };
  report.metrics[`${side}-${name}`] = await page.evaluate(selectors => {
    const metrics = {};
    for (const selector of selectors) {
      const e = document.querySelector(selector); if (!e || !e.getClientRects().length) continue;
      const rect = e.getBoundingClientRect(), style = getComputedStyle(e);
      metrics[selector] = { x: rect.x, y: rect.y, width: rect.width, height: rect.height, fontSize: style.fontSize, fontFamily: style.fontFamily };
    }
    return metrics;
  }, selectors);
}
try {
  for (const [side, folder] of [['before', oldRoot], ['after', repo]]) {
    const root = fs.realpathSync(folder);
    const server = await createServer({ root, configFile: false, cacheDir: path.join(temp, 'cache', side), logLevel: 'error',
      server: { host: '127.0.0.1', port: 5218, strictPort: true, fs: { allow: [root, repo] } } });
    await server.listen();
    const context = await browser.newContext(mobile);
    await context.addInitScript(() => {
      let seed = 9302026;
      Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    });
    await context.route('**/src/main.ts', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace('new TalkApp();', 'window.testApp = new TalkApp();') });
    });
    try {
      const page = await context.newPage(); page.on('pageerror', e => report.errors.push(`${side}: ${e.message}`));
      await page.goto('http://127.0.0.1:5218');
      await page.locator('#btn-title-settings').waitFor({ state: 'visible', timeout: 30000 });
      await shot(page, side, 'home');
      for (const mode of ['alphabet', 'syllable', 'word']) {
        await page.locator('#mode-' + mode).click();
        if (mode === 'alphabet') await shot(page, side, 'start');
        await page.locator('#btn-alphabet-start').click();
        await page.locator('#letter-board button').first().waitFor();
        // Freeze only the isolated research browser's clock for equal screenshots.
        await page.evaluate(() => {
          const app = window.testApp; app.stopClock(); app.elapsedMs = 0;
          if (app.mode === 'word') app.clock.textContent = '01:00.0';
        });
        await shot(page, side, mode);
        await page.locator('#btn-back').click();
      }
      if (side === 'after') assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).textSizeAdjust), '100%');
    } finally { await context.close(); await server.close(); }
  }
  for (const name of ['home', 'start', 'alphabet', 'syllable', 'word']) {
    assert.deepEqual(report.metrics[`after-${name}`], report.metrics[`before-${name}`], `Default-size geometry changed: ${name}`);
  }
  assert.deepEqual(report.errors, []);
  report.checks.push('All 10 PNGs are 780×1688', 'Before loaded from git archive, not current files',
    'Default text/board geometry unchanged across all 3 games', 'No page errors', 'After text-size-adjust is 100%');
  fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ checks: report.checks, temp, screenshots: Object.keys(report.files) }, null, 2));
} finally { await browser.close(); }
