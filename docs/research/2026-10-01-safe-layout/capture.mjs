// Historical commit is executed without edits in a separate temporary directory.
// Fixtures expose the original game instance only inside an isolated browser.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const side = process.argv[2] || 'after';
assert(['before', 'after'].includes(side));
const repo = process.cwd(), out = path.dirname(new URL(import.meta.url).pathname);
const revision = '43a49ce4a39a701e09985aefe17961489b21a4c5';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-safe-layout-'));
let root = repo;
if (side === 'before') {
  root = path.join(temp, 'before'); fs.mkdirSync(root);
  execFileSync('tar', ['-xf', '-', '-C', root], { input: execFileSync('git', ['archive', revision], { maxBuffer: 1024 ** 3 }) });
  fs.symlinkSync(path.join(repo, 'node_modules'), path.join(root, 'node_modules'), 'dir');
}
root = fs.realpathSync(root);
const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-US', timezoneId: 'Asia/Seoul' };
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--mute-audio'] });
const server = await createServer({ root, configFile: false, cacheDir: path.join(temp, 'cache'), logLevel: 'error',
  server: { host: '127.0.0.1', port: side === 'before' ? 5230 : 5231, strictPort: true, fs: { allow: [root, repo] } } });
const report = { side, revision: side === 'before' ? revision : 'WORKTREE based on ' + revision, capturedAt: new Date().toISOString(), browser: browser.version(), mobile, temp,
  limitations: 'macOS Chromium mobile emulation, NOT Android device screenshots. Insets are test simulations, not measured hardware values. Seeded targets, stopped clocks and grade previews use original renderers. No user storage is read.',
  files: {}, metrics: {}, fonts: {}, errors: [], overflow: [], overlaps: [], checks: [] };
const selectors = ['.brand-mark','.brand-version','.mode-list','.mode-btn','.mode-name','.mode-desc','#btn-title-settings','#music-prompt',
  '#learning-intro-title','.alphabet-intro-mark','#learning-intro-description','.learning-intro-stats','#btn-alphabet-start',
  '#run-clock','#target-label','#target-text','#target-hint','#typed-text','#letter-board','#letter-board button','#btn-backspace',
  '#settings-title','.switch-text b','.switch-text small','.settings-links','.help-panel','#btn-resume',
  '#cheer-headline','#cheer-score','#cheer-word','#cheer-clip','#cheer-tap','.legal-dialog-header','#legal-frame'];
const profiles = [
  { width:320,height:568,insets:[0,0,0,0] }, { width:360,height:640,insets:[24,0,24,0] },
  { width:390,height:660,insets:[0,0,0,0] }, { width:390,height:844,insets:[0,0,0,0] },
  { width:390,height:844,insets:[24,0,48,0] }, { width:412,height:915,insets:[32,0,24,0] },
  { width:430,height:932,insets:[59,0,34,0] }, { width:390,height:844,insets:[24,18,34,8] },
];
fs.mkdirSync(path.join(out, 'screenshots'), { recursive: true });
let page, cdp;
const hash = b => createHash('sha256').update(b).digest('hex');
async function metric(name) {
  const m = await page.evaluate(selectors => {
    const results = {};
    for (const selector of selectors) {
      const e = document.querySelector(selector);
      if (!e || !e.checkVisibility({ checkVisibilityCSS:true })) continue;
      const r = e.getBoundingClientRect(), s = getComputedStyle(e);
      results[selector] = { x:r.x,y:r.y,width:r.width,height:r.height,fontSize:s.fontSize,fontWeight:s.fontWeight,
        lineHeight:s.lineHeight,fontFamily:s.fontFamily,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth };
    }
    return results;
  }, selectors);
  report.metrics[name] = m;
  return m;
}
async function shot(name) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  await metric(name);
  const file = `${side}-${name}.png`, bytes = await page.screenshot({ path:path.join(out,'screenshots',file), animations:'disabled' });
  assert.equal(bytes.readUInt32BE(16),780); assert.equal(bytes.readUInt32BE(20),1688);
  report.files[file] = { width:780,height:1688,sha256:hash(bytes) };
}
async function font(name, selector) {
  const { root } = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId:root.nodeId, selector });
  report.fonts[name] = (await cdp.send('CSS.getPlatformFontsForNode',{nodeId})).fonts;
}
async function profile(p) {
  await page.setViewportSize({width:p.width,height:p.height});
  await page.evaluate(insets => ['top','right','bottom','left'].forEach((edge,i) =>
    document.documentElement.style.setProperty('--safe-area-inset-'+edge, insets[i]+'px')), p.insets);
  await page.waitForTimeout(60);
}
async function reset() { await profile(profiles[3]); }
async function safeShot(name) { await profile(profiles[4]); await shot(name+'-safe-insets'); await reset(); }
async function matrix(name, selected, game=false) {
  for (const p of profiles) {
    await profile(p);
    const key = `${name}-${p.width}x${p.height}-insets-${p.insets.join('-')}`, m = await metric(key);
    const [top,right,bottom,left] = p.insets;
    for (const selector of selected) {
      const r=m[selector]; if (!r) continue;
      if (r.x < left-1 || r.x+r.width > p.width-right+1 || r.y < top-1 || r.y+r.height > p.height-bottom+1 || r.scrollWidth > r.clientWidth+1)
        report.overflow.push({name:key,selector,rect:r});
    }
    if (game) {
      const b=m['#letter-board'], tile=m['#letter-board button'], card=m['#target-hint'], del=m['#btn-backspace'];
      if (Math.abs(b.width-b.height)>1 || Math.abs(tile.width-tile.height)>1 || b.width<=0 ||
        (card && card.y+card.height>b.y+1) || (del && b.y+b.height>del.y+1))
        report.overlaps.push({name:key,board:b,tile,card,del});
    }
  }
  await reset();
}
async function freezeVideo() {
  await page.evaluate(async () => {
    const v=document.querySelector('#cheer-clip'); v.pause();
    if (v.readyState>=2) {
      await new Promise(resolve => { v.addEventListener('seeked',resolve,{once:true}); v.currentTime=.5; setTimeout(resolve,1000); });
    }
  });
}
try {
  await server.listen();
  const context = await browser.newContext(mobile);
  await context.addInitScript(() => {
    let seed=9302026; Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  });
  await context.route('**/src/main.ts',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:(await response.text()).replace('new TalkApp();','window.testApp = new TalkApp();')});
  });
  page=await context.newPage(); cdp=await context.newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto('http://127.0.0.1:'+(side==='before'?5230:5231));
  await page.locator('#btn-title-settings').waitFor({state:'visible',timeout:30000});
  await shot('home'); await font('menu','.mode-name');
  await safeShot('home');
  await matrix('home',['.brand-mark','.mode-list','#btn-title-settings']);
  await page.evaluate(()=>document.querySelector('#music-prompt').hidden=false);
  await matrix('music-hint',['#music-prompt']);
  await page.evaluate(()=>document.querySelector('#music-prompt').hidden=true);
  await page.locator('#btn-title-settings').click(); await shot('settings'); await font('settings','.switch-text b');
  await safeShot('settings');
  await matrix('settings',['#settings-title','.settings-links']);
  for (const kind of ['privacy','licenses']) {
    await page.locator('#btn-'+kind).click();
    await page.frameLocator('#legal-frame').locator('h1').first().waitFor();
    await shot(kind);
    await matrix(kind,['.legal-dialog-header','#legal-frame']);
    await page.locator('#btn-legal-close').click();
  }
  await page.locator('#btn-settings-back').click();
  for (const mode of ['alphabet','syllable','word']) {
    await page.locator('#mode-'+mode).click(); await shot(mode+'-start');
    await safeShot(mode+'-start');
    await matrix(mode+'-start',['#learning-intro-title','.alphabet-intro-mark','#learning-intro-description','.learning-intro-stats','#btn-alphabet-start']);
    await page.locator('#btn-alphabet-start').click();
    await page.evaluate(()=>{window.testApp.stopClock();window.testApp.clock.textContent=window.testApp.mode==='word'?'01:00.0':'PRACTICE';});
    await shot(mode); await font(mode+'-target',mode==='alphabet'?'.alphabet-target-jamo':mode==='word'?'.target-character':'.target-korean');
    await safeShot(mode);
    await matrix(mode,['#run-clock','#target-label','#target-text','#target-hint','#letter-board','#btn-backspace'],true);
    await page.locator('#btn-pause').click(); await shot(mode+'-pause');
    await matrix(mode+'-pause',['.help-panel','#btn-resume']);
    await page.locator('#btn-resume').click();
    await page.evaluate(()=>{const a=window.testApp;a.stopClock();a.clock.textContent=a.roundSection.tutorial?'PRACTICE':'01:00.0';});
    if (mode!=='word') {
      const indices = mode==='alphabet' ? [17,23,27] : [5,8,11,13,16,18];
      for (const index of indices) {
        await page.evaluate(index=>{const a=window.testApp;a.alphabetStageIndex=index;a.beginRound();a.loadAlphabetStage();a.clock.textContent=a.roundSection.tutorial?'PRACTICE':'01:00.0';},index);
        const name=mode+'-stage-'+index;
        await shot(name);
        await matrix(name,['#run-clock','#target-label','#target-text','#target-hint','#letter-board','#btn-backspace'],true);
      }
      if (mode==='syllable') {
        await page.evaluate(()=>{const a=window.testApp;a.roundNumber=2;a.beginRound();a.loadAlphabetStage();});
        await shot('syllable-8x8');
        await matrix('syllable-8x8',['#target-text','#letter-board'],true);
      }
      await safeShot(mode+'-timed');
    }
    if (mode==='word') {
      // Long real vocabulary example exercises the existing one-syllable guide.
      await page.evaluate(async()=>{
        const a=window.testApp;
        const { WORD_TARGETS }=await import('/src/content/prompts.ts');
        a.wordTarget=WORD_TARGETS.find(t=>t.word==='어슬렁어슬렁');
        if(!a.wordTarget)throw new Error('Long word fixture missing');
        a.input=[];a.used.clear();a.tiles=a.makeWordBoard();a.renderTranslatedTarget();a.renderBoard();a.renderInput();
      });
      await shot('word-long');
      await matrix('word-long',['#target-text','#target-hint','#typed-text','#letter-board','#btn-backspace'],true);
      await safeShot('word-long');
      await page.evaluate(()=>{const a=window.testApp;a.roundUnits=6;a.startedAt=performance.now()-60000;a.finishRound(false);});
      await shot('score');
      await page.evaluate(()=>window.testApp.cheer.stop());
      const grades=await page.evaluate(async()=>(await import('/src/content/timedStages.ts')).SCORE_GRADES);
      for (const {at:score,text:grade} of grades) {
        await page.evaluate(({score,grade})=>{window.testApp.cheer.play('TIME’S UP!',score,grade,()=>{});window.testApp.cheer.dance();},{score,grade});
        await page.waitForTimeout(700); await freezeVideo();
        await shot('grade-'+score);
        await page.evaluate(()=>document.querySelector('#cheer-tap').style.visibility='visible');
        await matrix('grade-'+score,['#cheer-word','#cheer-clip','#cheer-tap']);
        await page.evaluate(()=>window.testApp.cheer.stop());
      }
      // The score phase uses the same component for all three modes.
      await page.evaluate(()=>window.testApp.cheer.play('TIME’S UP!',1500,'OH MY GOD!!!',()=>{}));
      // Stop its phase timer only in the isolated research browser.
      await page.evaluate(()=>{ const a=window.testApp.cheer; clearTimeout(a.timer); });
      await matrix('score',['#cheer-headline','#cheer-score']);
      await page.evaluate(()=>window.testApp.cheer.stop());
    }
    await page.locator('#btn-back').click();
  }
  if(side==='after') {
    assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).textSizeAdjust),'100%');
    assert(!report.fonts.menu.some(f=>f.isCustomFont),'Menu must retain device font');
    assert(report.fonts['syllable-target'].some(f=>f.isCustomFont && f.familyName.includes('Serif')),'Learning serif must stay bundled');
    const prior=JSON.parse(fs.readFileSync(path.join(out,'before-verification.json'),'utf8'));
    const compare=['home','settings','privacy','licenses','alphabet-start','syllable-start','word-start','alphabet','syllable','word',
      'alphabet-pause','syllable-pause','word-pause','alphabet-stage-17','alphabet-stage-23','alphabet-stage-27','syllable-stage-5','syllable-stage-18','score'];
    report.referenceDifferences=[];
    for(const name of compare) for(const [selector,b] of Object.entries(prior.metrics[name])) {
      const a=report.metrics[name][selector]; if(!a)continue;
      for(const field of ['x','y','width','height','fontSize','fontWeight','lineHeight','fontFamily']) {
        if(typeof a[field]==='number'? Math.abs(a[field]-b[field])>.03:a[field]!==b[field])
          report.referenceDifferences.push({name,selector,field,before:b[field],after:a[field]});
      }
    }
    assert.deepEqual(report.referenceDifferences,[],'390×844 reference geometry/type changed');
    assert.deepEqual(report.overflow,[],'Viewport/inset overflow');
    assert.deepEqual(report.overlaps,[],'Square board or vertical overlap');
    report.checks.push('390×844 standard typography and geometry match historical commit','Device UI font and bundled learning serif preserved','Square boards fit remaining space','Tested safe-area profiles have no overflow/overlap');
  }
  assert.deepEqual(report.errors,[]);
  report.checks.push('All screenshots 780×1688','No page errors');
  await context.close();
} finally {
  report.sourceHashes = Object.fromEntries(['index.html','src/ui/styles/tokens.css','src/ui/styles/title.css','src/ui/styles/talk.css',
    'src/ui/styles/overlay.css','src/ui/styles/legal.css','src/ui/styles/storage.css','src/ui/talkApp.ts','src/ui/persistentStore.ts',
    'src/ui/talkStorage.ts','src/ui/talkProgress.ts','src/config/app.ts','public/assets/fonts/NotoSansKR-Variable.woff2','public/assets/fonts/NotoSerifKR-Variable.woff2']
    .map(p=>[p,hash(fs.readFileSync(path.join(root,p)))]));
  report.historicalReferenceHashes = Object.fromEntries([
    '2026-09-30-android-text-icons/screenshots/after-home.png','2026-09-30-android-text-icons/screenshots/after-start.png',
    '2026-09-30-android-text-icons/screenshots/after-alphabet.png','2026-09-30-android-text-icons/screenshots/after-syllable.png',
    '2026-09-30-android-text-icons/screenshots/after-word.png','2026-09-29-play-policy/screenshots/after-settings.png',
    '2026-09-17-videos/after-unbelievable.png','2026-09-20-short-practice/after.png']
    .map(p=>[p,hash(fs.readFileSync(path.join(repo,'docs/research',p)))]));
  fs.writeFileSync(path.join(out,side+'-verification.json'),JSON.stringify(report,null,2)+'\n');
  await server.close(); await browser.close();
  console.log(JSON.stringify({side,screenshots:Object.keys(report.files).length,overflows:report.overflow.length,overlaps:report.overlaps.length,checks:report.checks,temp}));
}
