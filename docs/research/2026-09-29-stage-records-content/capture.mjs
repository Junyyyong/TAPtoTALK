import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out = new URL('./', import.meta.url).pathname;
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-records-'));
function archive(repo, commit, name) {
  const root = path.join(temp, name); fs.mkdirSync(root);
  execFileSync('tar', ['-xf', '-', '-C', root], { input: execFileSync('git', ['-C', repo, 'archive', commit], { maxBuffer: 512 * 1024 * 1024 }) });
  fs.symlinkSync(path.join(process.cwd(), 'node_modules'), path.join(root, 'node_modules'), 'dir');
  return root;
}
const roots = { before: archive(process.cwd(), '4270bae', 'before'), after: archive(process.cwd(), '7ebf1b2', 'after') };
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const files = [], metrics = {};
let oldStorage;
async function serve(root) {
  root = fs.realpathSync(root);
  const server = await createServer({ root, cacheDir: path.join(temp, 'cache', path.basename(root)), configFile: false, server: { fs: { allow: [root, process.cwd()] }, port: 5198, strictPort: true, host: '127.0.0.1' }, logLevel: 'error' });
  await server.listen(); return server;
}
async function dimensions(p, selector) {
  return p.locator(selector).evaluate(e => {
    const r = e.getBoundingClientRect(), s = getComputedStyle(e);
    return { x: r.x, y: r.y, width: r.width, height: r.height, size: s.fontSize, weight: s.fontWeight, family: s.fontFamily, lineHeight: s.lineHeight };
  });
}
async function choose(p, mode, start = true) {
  await p.evaluate(() => window.testApp.showTitle());
  await p.locator('#mode-' + mode).click();
  if (start) await p.locator('#btn-alphabet-start').click();
}
async function stage(p, number) {
  await p.evaluate(async number => {
    let seed = 456; Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const a = window.testApp;
    const { ALPHABET_STAGES } = await import('/src/content/prompts.ts');
    a.roundNumber = 1; a.stageTransitionPending = false; a.paused = false;
    if (a.mode === 'word') {
      const { createWordJourney } = await import('/src/content/wordJourney.ts');
      a.nextWordTarget = createWordJourney();
      for (let i = 0; i < number; i++) a.wordTarget = a.nextWordTarget();
      a.wordTargetIndex = number - 1; a.beginRound(); a.input = []; a.used.clear();
      a.tiles = a.makeWordBoard(); a.renderTranslatedTarget(); a.renderBoard(); a.renderInput();
    } else {
      a.alphabetStageIndex = (a.mode === 'alphabet' ? ALPHABET_STAGES.length : a.syllablePractice.length) + number - 1;
      a.beginRound(); a.loadAlphabetStage();
    }
    a.elapsedMs = 10000; a.startClock(true); a.saveProgress(); a.stopClock();
  }, number);
}
async function shot(p, name) {
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  await p.screenshot({ path: out + name + '.png' }); files.push(name);
}
try {
  // Read-only TAPtoTEN reference. No files or saves on the user's real browser are changed.
  const ten = process.env.TEN_ROOT || '/Users/scdi/Documents/ChatGPT/TAPtoTEN';
  const referenceServer = await serve(archive(ten, '2515854', 'reference')), referenceContext = await browser.newContext(mobile);
  try {
    const p = await referenceContext.newPage(); await p.goto('http://127.0.0.1:5198');
    await p.locator('#mode-endless').click({ timeout: 30000 });
    await p.waitForTimeout(500);
    await p.evaluate(() => document.fonts.ready);
    metrics.ten = { stats: await dimensions(p, '.intro-stats'), label: await dimensions(p, '.intro-stats dt:first-child'), value: await dimensions(p, '.intro-stats dd:first-of-type'), start: await dimensions(p, '#btn-intro-start') };
    await shot(p, 'reference-ten-intro');
  } finally { await referenceContext.close(); await referenceServer.close(); }
  for (const side of ['before', 'after']) {
    const server = await serve(roots[side]);
    const context = await browser.newContext(mobile), errors = [];
    context.on('page', p => p.on('pageerror', e => { errors.push(e.message); console.log(side, p.url(), e.message); }));
    await context.route('**/src/main.ts', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace('new TalkApp();', 'window.testApp=new TalkApp();') });
    });
    if (side === 'after') await context.addInitScript(storage => {
      if (location.origin !== 'http://127.0.0.1:5198') return;
      if (!localStorage.getItem('research-seeded')) {
        for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value);
        localStorage.setItem('research-seeded', 'true');
      }
    }, oldStorage);
    try {
      let p = await context.newPage(); await p.goto('http://127.0.0.1:5198');
      await p.locator('#mode-alphabet').waitFor({ state: 'visible', timeout: 30000 });
      if (side === 'before') {
        for (const [mode, number] of [['alphabet', 10], ['syllable', 7], ['word', 12]]) {
          await choose(p, mode); await stage(p, number);
        }
        await p.evaluate(() => window.testApp.showTitle());
        oldStorage = await p.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
      }
      await choose(p, 'alphabet', false);
      if (side === 'after') {
        assert.equal(await p.locator('#learning-intro-best').innerText(), 'Stage 10');
        for (const [key, raw] of Object.entries(oldStorage).filter(([key]) => key.includes('progress'))) {
          assert.equal(await p.evaluate(key => localStorage.getItem(key), key), raw, 'Intro migration must not rewrite progress');
        }
        metrics.talk = { stats: await dimensions(p, '.learning-intro-stats'), label: await dimensions(p, '.learning-intro-stats dt'), value: await dimensions(p, '.learning-intro-stats dd'), start: await dimensions(p, '#btn-alphabet-start') };
        for (const type of ['label', 'value']) {
          assert.equal(metrics.talk[type].size, metrics.ten[type].size);
          assert.equal(metrics.talk[type].weight, metrics.ten[type].weight);
          assert.equal(metrics.talk[type].y, metrics.ten[type].y);
        }
        for (const key of ['x', 'y', 'width', 'height']) assert.equal(metrics.talk.start[key], metrics.ten.start[key]);
      }
      await shot(p, side + '-intro');
      await p.locator('#btn-alphabet-start').click(); await stage(p, 1);
      if (side === 'after') assert.equal(await p.locator('#target-label').innerText(), 'Stage 1');
      await shot(p, side + '-alphabet');
      if (side === 'after') {
        // Correct real taps advance the label, while the older high record does not fall.
        await p.evaluate(() => {
          const a = window.testApp;
          for (const value of a.learningStage.sequence) {
            const t = a.alphabetTiles.find(t => !a.used.has(t.id) && !t.transform && !t.shape && t.value === value);
            document.querySelector(`[data-tile-id="${t.id}"]`).click();
          }
        });
        await p.waitForTimeout(480); assert.equal(await p.locator('#target-label').innerText(), 'Stage 2');
        await stage(p, 11);
        await p.evaluate(() => window.testApp.showTitle());
        await p.reload(); await p.locator('#mode-alphabet').waitFor({ state: 'visible' });
        for (const [mode, expected] of [['alphabet', 11], ['syllable', 7], ['word', 12]]) {
          await choose(p, mode, false);
          assert.equal(await p.locator('#learning-intro-best').innerText(), `Stage ${expected}`);
          await p.locator('#btn-alphabet-start').click();
          assert.ok(await p.evaluate(() => window.testApp.elapsedMs < 1500));
          const label = await p.locator('#target-label').innerText();
          assert.equal(label.toLowerCase(), `stage ${expected}`);
        }
        // Tutorial labels remain categories and cannot replace highest timed records.
        await choose(p, 'alphabet');
        await p.evaluate(() => { const a = window.testApp; a.alphabetStageIndex = 0; a.beginRound(); a.loadAlphabetStage(); a.startClock(); });
        assert.match(await p.locator('#target-label').innerText(), /Consonant/);
        assert.equal(await p.locator('#run-clock').innerText(), 'PRACTICE');
        await choose(p, 'alphabet', false);
        assert.equal(await p.locator('#learning-intro-best').innerText(), 'Stage 11');
        // Counts come from the production content modules, not a screenshot fixture.
        metrics.content = await p.evaluate(async () => {
          const { SYLLABLE_GAME_TARGETS, WORD_STAGES } = await import('/src/content/learningJourney.ts');
          const { EXTRA_WORDS } = await import('/src/content/wordJourney.ts');
          return { syllables: SYLLABLE_GAME_TARGETS.length, introWords: WORD_STAGES.length, extras: Object.values(EXTRA_WORDS).flat().length };
        });
        assert.deepEqual(metrics.content, { syllables: 100, introWords: 32, extras: 100 });
        for (const viewport of [{width:320,height:568},{width:430,height:932}]) {
          await p.setViewportSize(viewport);
          for (const mode of ['alphabet','syllable','word']) {
            await choose(p, mode, false);
            const start = await p.locator('#btn-alphabet-start').boundingBox();
            assert.ok(start.y >= 0 && start.y + start.height <= viewport.height);
            assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          }
        }
      }
      assert.deepEqual(errors, []);
    } finally { await context.close(); await server.close(); }
  }
} finally { await browser.close(); }
for (const name of files) {
  const png = fs.readFileSync(out + name + '.png');
  assert.equal(png.readUInt32BE(16), 780); assert.equal(png.readUInt32BE(20), 1688);
}
console.log(JSON.stringify(metrics, null, 2));
console.log('PASS 780×1688 PNG; Stage 1→2; saved-progress migration; monotonic per-game records/reload; tutorial labels; 100/100 pools; small/large mobile fit.');
