// Focused before/after Settings check, not installed-device screenshots.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repo=process.cwd(),dir=path.dirname(new URL(import.meta.url).pathname);
const temp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'talk-icon-settings-'))),before=path.join(temp,'before');
const revision='41385dbca02aed44433b26a6c85800328ca508f4';
fs.mkdirSync(before);execFileSync('tar',['-xf','-','-C',before],{input:execFileSync('git',['archive',revision,'src','public','index.html','movie','0917-movie','package.json'],{maxBuffer:1024**3}),maxBuffer:1024**3});
fs.symlinkSync(path.join(repo,'node_modules'),path.join(before,'node_modules'),'dir');
const report={revision,beforeRoot:before,actualDevice:false,passed:false,errors:[],checks:[],screens:[],conditions:'Chrome Android simulation,390x844 CSS,DPR2, remaining native insets0; isolated preferences with legacy vibration=true. Before is genuine separate commit archive.'};
const servers=[],browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--mute-audio']});
try{
  for(const [side,root]of [['before',before],['after',repo]]){
    const s=await createServer({root,configFile:false,cacheDir:path.join(temp,side+'-cache'),logLevel:'error',server:{host:'127.0.0.1',port:0,fs:{allow:[root,repo]}}});await s.listen();servers.push(s);
    const c=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    await c.addInitScript(()=>{window.CapacitorCustomPlatform={name:'android'};window.buzzCalls=[];navigator.vibrate=p=>{window.buzzCalls.push(p);return true;};
      const prefs=JSON.stringify({musicOn:false,soundOn:false,hapticsOn:true,tutorialDone:true});
      for(const prefix of ['', 'CapacitorStorage.'])localStorage.setItem(prefix+'taptotalk.preferences.v1',prefs);
      document.addEventListener('DOMContentLoaded',()=>['top','right','bottom','left'].forEach(edge=>document.documentElement.style.setProperty('--android-game-inset-'+edge,'0px')),{once:true});});
    await c.route('**/src/main.ts',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('new TalkApp();','window.testApp=new TalkApp();')});});
    await c.route('**/src/config/app.ts',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('studioSplashMs: 3_000, productSplashMs: 4_000','studioSplashMs: 0, productSplashMs: 0')});});
    const p=await c.newPage();p.setDefaultTimeout(10000);p.on('pageerror',e=>report.errors.push(e.message));
    await p.goto('http://127.0.0.1:'+s.httpServer.address().port);await p.locator('#mode-alphabet').waitFor();await p.evaluate(()=>document.fonts.ready);
    await p.locator('#btn-title-settings').tap();await p.waitForTimeout(100);
    const buttons=await p.locator('#settings-body .switch-row').count();assert.equal(buttons,side==='before'?3:2);
    const file=side+'-settings.png';const bytes=await p.screenshot({path:path.join(dir,'screenshots',file),animations:'disabled'});
    assert.equal(bytes.readUInt32BE(16),780);assert.equal(bytes.readUInt32BE(20),1688);
    report.screens.push({file,width:780,height:1688,sha256:createHash('sha256').update(bytes).digest('hex')});
    if(side==='after'){
      assert.equal(await p.locator('#talk-haptics').count(),0);assert.equal(await p.evaluate(()=>window.testApp.preferences.hapticsOn),false);
      await p.locator('#talk-sound').tap();assert.equal(await p.locator('#talk-sound [role=switch]').getAttribute('aria-checked'),'true');
      assert.equal(await p.locator('#talk-music [role=switch]').getAttribute('aria-checked'),'false');
      await p.locator('#talk-music').tap();assert.equal(await p.locator('#talk-music [role=switch]').getAttribute('aria-checked'),'true');
      await p.locator('#talk-music').tap();await p.locator('#btn-settings-back').tap();await p.locator('#mode-alphabet').tap();await p.locator('#btn-alphabet-start').tap();
      const id=await p.evaluate(()=>{const a=window.testApp;a.stopClock();return a.alphabetTiles.find(t=>!t.transform&&!t.shape&&t.value===a.learningStage.sequence[a.alphabetPartIndex]).id;});
      await p.locator(`[data-tile-id="${id}"]`).tap();assert(await p.evaluate(id=>window.testApp.used.has(id),id));
      assert.equal(await p.evaluate(()=>window.buzzCalls.length),0);
      report.checks.push('Music/Sound toggles independent; legacy haptics ignored; no vibrate on settings/start/correct tile; correct tile advances');
    }
    report.checks.push({side,switches:buttons,buzzCalls:await p.evaluate(()=>window.buzzCalls.length)});await c.close();
  }
  assert.deepEqual(report.errors,[]);report.passed=true;
}finally{fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(report,null,2)+'\n');await browser.close();for(const s of servers)await s.close();console.log(JSON.stringify(report));}
