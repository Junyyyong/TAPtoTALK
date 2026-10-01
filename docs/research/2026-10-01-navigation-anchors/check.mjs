// Narrow navigation regression only; no videos, historical rebuild or full suite.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const dir=path.dirname(new URL(import.meta.url).pathname),temp=fs.mkdtempSync(path.join(os.tmpdir(),'talk-nav-'));
const s=await createServer({root:process.cwd(),configFile:false,cacheDir:path.join(temp,'cache'),logLevel:'error',server:{host:'127.0.0.1',port:0}});await s.listen();
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--mute-audio']});
const report={passed:false,actualDevice:false,conditions:'Chrome Android simulation, remaining bars24/48, 390x844 DPR2 PNG',checks:[],errors:[]};
try{
  const c=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await c.addInitScript(()=>{window.CapacitorCustomPlatform={name:'android'};
    const pref=JSON.stringify({musicOn:false,soundOn:false,hapticsOn:false});
    for(const pre of ['', 'CapacitorStorage.'])localStorage.setItem(pre+'taptotalk.preferences.v1',pref);
    let seed=20261001;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.setProperty('--android-game-inset-top','24px');
      document.documentElement.style.setProperty('--android-game-inset-bottom','48px');},{once:true});});
  await c.route('**/src/main.ts',async r=>{const q=await r.fetch();await r.fulfill({response:q,body:(await q.text()).replace('new TalkApp();','window.testApp=new TalkApp();')});});
  await c.route('**/src/config/app.ts',async r=>{const q=await r.fetch();await r.fulfill({response:q,
    body:(await q.text()).replace('studioSplashMs: 3_000, productSplashMs: 4_000','studioSplashMs: 0, productSplashMs: 0')});});
  const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));await p.goto('http://127.0.0.1:'+s.httpServer.address().port);
  await p.locator('#mode-alphabet').waitFor();await p.evaluate(()=>document.fonts.ready);
  async function check(name,shot=false){await p.waitForTimeout(60);
    const m=await p.evaluate(()=>{const f=document.querySelector('#app').getBoundingClientRect(),scale=f.height/parseFloat(getComputedStyle(document.querySelector('#app')).height);
      return [...document.querySelectorAll('.screen > .hud > .icon-btn')].filter(e=>e.checkVisibility()).map(e=>{const r=e.getBoundingClientRect();return {
        id:e.id,x:(r.x-f.x)/scale,y:(r.y-f.y)/scale,w:r.width/scale,h:r.height/scale,right:(f.right-r.right)/scale};});});
    for(const b of m){assert(Math.abs(b.y-11)<.05,name+': vertical shift');assert(Math.abs((b.id==='btn-pause'?b.right:b.x)-12)<.05,name+': horizontal shift');
      assert(Math.abs(b.w-40)<.05&&Math.abs(b.h-40)<.05,'button size changed');}
    report.checks.push({name,buttons:m});if(shot){const bytes=await p.screenshot({path:path.join(dir,'after-'+name+'.png'),animations:'disabled'});
      assert.equal(bytes.readUInt32BE(16),780);assert.equal(bytes.readUInt32BE(20),1688);}
  }
  for(const [width,height]of [[390,844],[270,585],[450,975],[800,1280],[1280,800]]){
    await p.setViewportSize({width,height});await p.waitForTimeout(60);const standard=width===390;
    await p.locator('#btn-title-settings').tap();await check('settings-'+width,standard);await p.locator('#btn-settings-back').tap();
    for(const mode of ['alphabet','syllable','word']){
      await p.locator('#mode-'+mode).tap();await check(mode+'-start-'+width,standard&&mode==='alphabet');
      await p.locator('#btn-alphabet-start').tap();await p.evaluate(()=>window.testApp.stopClock());await check(mode+'-game-'+width,standard&&mode==='alphabet');
      await p.locator('#btn-pause').tap();await p.locator('#btn-resume').tap();await p.evaluate(()=>window.testApp.stopClock());await check(mode+'-resumed-'+width);
      if(mode==='alphabet')for(const index of [17,23,27]){await p.evaluate(index=>{const a=window.testApp;a.alphabetStageIndex=index;a.beginRound();a.loadAlphabetStage();a.stopClock();},index);await check('grid-'+index+'-'+width);}
      await p.locator('#btn-back').tap();
    }
  }
  await c.close();assert.deepEqual(report.errors,[]);report.passed=true;
}finally{fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await s.close();
  console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,errors:report.errors}));}
