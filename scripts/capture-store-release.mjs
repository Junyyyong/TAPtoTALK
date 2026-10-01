// Seven genuine current-source screenshots; this tool is not bundled in the app.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output=path.resolve('store/screenshots/2026-10-01-release');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'talk-release-capture-'));
const server=await createServer({root:process.cwd(),configFile:false,cacheDir:path.join(temp,'cache'),logLevel:'error',server:{host:'127.0.0.1',port:0}});
await server.listen();
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--mute-audio']});
const report={capturedAt:new Date().toISOString(),browser:browser.version(),passed:false,actualAndroidDevice:false,
  conditions:'Chrome Android platform simulation; 390x844 CSS px, DPR2, remaining system insets0. Isolated saves, seed20261001; clocks frozen; video0.5s. Research-only routes expose app/skip splash delays. No composition or OS bars.',files:[],errors:[]};
try {
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'en-US',timezoneId:'Asia/Seoul'});
  await context.addInitScript(()=>{window.CapacitorCustomPlatform={name:'android'};
    const prefs=JSON.stringify({musicOn:false,soundOn:false,hapticsOn:false});
    for(const prefix of ['', 'CapacitorStorage.'])localStorage.setItem(prefix+'taptotalk.preferences.v1',prefs);
    let seed=20261001;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    document.addEventListener('DOMContentLoaded',()=>['top','right','bottom','left'].forEach(edge=>document.documentElement.style.setProperty('--android-game-inset-'+edge,'0px')),{once:true});
  });
  await context.route('**/src/main.ts',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('new TalkApp();','window.testApp=new TalkApp();')});});
  await context.route('**/src/config/app.ts',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('studioSplashMs: 3_000, productSplashMs: 4_000','studioSplashMs: 0, productSplashMs: 0')});});
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.httpServer.address().port);
  await page.locator('#mode-alphabet').waitFor();await page.evaluate(()=>document.fonts.ready);
  async function shot(name){
    const file=path.join(output,name);assert(!fs.existsSync(file),'Do not overwrite recorded screenshots');
    await page.waitForTimeout(120);
    await page.evaluate(()=>{for(const a of document.getAnimations())if(Number.isFinite(a.effect?.getComputedTiming().endTime))a.finish();});
    const bytes=await page.screenshot({path:file,animations:'disabled'});
    assert.equal(bytes.readUInt32BE(16),780);assert.equal(bytes.readUInt32BE(20),1688);
    report.files.push({name,width:780,height:1688,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
  async function stage(index){await page.evaluate(index=>{const a=window.testApp;a.alphabetStageIndex=index;a.roundNumber=1;
    a.beginRound();a.loadAlphabetStage();a.stopClock();a.elapsedMs=0;a.clock.textContent=a.roundSection.tutorial?'PRACTICE':'01:00.0';},index);}
  await page.evaluate(()=>{document.querySelector('#screen-title').classList.add('hidden');document.querySelector('#screen-splash').classList.remove('hidden');});
  await shot('01-cover.png');await page.evaluate(()=>{document.querySelector('#screen-splash').classList.add('hidden');window.testApp.showTitle();});
  await shot('02-main.png');
  await page.locator('#mode-alphabet').tap();await shot('03-alphabet-start.png');
  await page.locator('#btn-alphabet-start').tap();await stage(17);await shot('04-alphabet-practice.png');
  await page.evaluate(()=>window.testApp.showTitle());await page.locator('#mode-syllable').tap();await shot('05-syllable-start.png');
  await page.locator('#btn-alphabet-start').tap();await stage(18);await shot('06-syllable-game.png');
  await page.evaluate(()=>{const a=window.testApp;a.cheer.play('TIME’S UP!',300,'GREAT!',()=>{});a.cheer.dance();});
  await page.waitForFunction(()=>document.querySelector('#cheer-clip').readyState>=2);
  await page.evaluate(()=>{const a=window.testApp,v=document.querySelector('#cheer-clip');v.pause();v.currentTime=.5;clearTimeout(a.cheer.timer);});
  await page.waitForFunction(()=>!document.querySelector('#cheer-clip').seeking);await shot('07-great.png');
  assert.deepEqual(report.errors,[]);report.passed=true;await context.close();
} finally {
  fs.writeFileSync(path.join(output,'capture-verification.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();await server.close();
  console.log(JSON.stringify({passed:report.passed,count:report.files.length,errors:report.errors}));
}
