// Additional splash, footer, top-layer and six-grade checks. Current source only.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repo=process.cwd(),dir=path.dirname(new URL(import.meta.url).pathname),out=path.join(dir,process.env.EDGE_RUN || 'edge-verification.json');
assert(!fs.existsSync(out),'Choose a fresh EDGE_RUN; preserve existing verification');
const report={actualDevice:false,passed:false,profiles:[],referenceFiles:{},errors:[]};
for(const file of ['src/ui/nativeFrame.ts','src/ui/styles/nativeResponsive.css','src/ui/pickLayout.ts','src/ui/styles/title.css']){
  const full=path.join('/Users/scdi/Documents/ChatGPT/TaptoPick',file);
  report.referenceFiles[file]=createHash('sha256').update(fs.readFileSync(full)).digest('hex');
}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'talk-edge-'));
const s=await createServer({root:repo,configFile:false,cacheDir:path.join(temp,'cache'),logLevel:'error',server:{host:'127.0.0.1',port:0}});await s.listen();
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--mute-audio']});
const profiles=[{width:320,height:568,insets:[24,0,32,0]},{width:390,height:844,insets:[24,0,48,0]},
  {width:412,height:1000,insets:[28,0,48,0]},{width:800,height:1280,insets:[24,0,48,0]},
  {width:1280,height:800,insets:[24,0,48,0]},{width:844,height:390,insets:[10,44,20,40]}];
try{for(const profile of profiles){
  const c=await browser.newContext({viewport:{width:profile.width,height:profile.height},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await c.addInitScript(insets=>{window.CapacitorCustomPlatform={name:'android'};
    const prefs=JSON.stringify({musicOn:false,soundOn:false,hapticsOn:false});
    for(const prefix of ['', 'CapacitorStorage.'])localStorage.setItem(prefix+'taptotalk.preferences.v1',prefs);
    document.addEventListener('DOMContentLoaded',()=>['top','right','bottom','left'].forEach((e,i)=>
      document.documentElement.style.setProperty('--android-game-inset-'+e,insets[i]+'px')),{once:true});},profile.insets);
  await c.route('**/src/main.ts',async r=>{const res=await r.fetch();await r.fulfill({response:res,body:(await res.text()).replace('new TalkApp();','window.testApp=new TalkApp();')});});
  await c.route('**/src/config/app.ts',async r=>{const res=await r.fetch();await r.fulfill({response:res,
    body:(await res.text()).replace('studioSplashMs: 3_000, productSplashMs: 4_000','studioSplashMs: 0, productSplashMs: 0')});});
  const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));
  await p.goto('http://127.0.0.1:'+s.httpServer.address().port);await p.locator('#mode-alphabet').waitFor();await p.evaluate(()=>document.fonts.ready);
  const row={profile,splashes:[],grades:[],footer:null,legal:null,storage:null};
  for(const [id,img]of [['screen-studio-splash','.studio-splash-cover'],['screen-splash','.splash-cover']]){
    await p.evaluate(id=>{document.querySelector('#screen-title').classList.add('hidden');document.getElementById(id).classList.remove('hidden');},id);
    const m=await p.evaluate(({id,img})=>{const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
      const e=document.querySelector(img);return {screen:rect(document.getElementById(id)),image:rect(e),natural:[e.naturalWidth,e.naturalHeight],fit:getComputedStyle(e).objectFit};},{id,img});
    assert(Math.abs(m.screen.x)<.1&&Math.abs(m.screen.y)<.1&&Math.abs(m.screen.w-profile.width)<.1&&Math.abs(m.screen.h-profile.height)<.1);
    assert(Math.abs(m.image.y+m.image.h/2-profile.height/2)<.1);
    if(id==='screen-splash'){
      assert(Math.abs(m.image.w-profile.width)<.1);assert(Math.abs(m.image.h/m.image.w-m.natural[1]/m.natural[0])<.001);
      assert(Math.abs(m.image.x)<.1);
    }else{assert.equal(m.fit,'contain');assert(m.image.y>=-.1&&m.image.y+m.image.h<=profile.height+.1);}
    row.splashes.push({id,...m});await p.evaluate(id=>document.getElementById(id).classList.add('hidden'),id);await p.evaluate(()=>window.testApp.showTitle());
  }
  // The real prompt uses [hidden], unlike the reference game's .hidden class.
  await p.evaluate(()=>document.querySelector('#music-prompt').hidden=false);await p.waitForTimeout(150);
  row.footer=await p.evaluate(()=>{const r=document.querySelector('#music-prompt').getBoundingClientRect(),f=document.querySelector('#app').getBoundingClientRect();
    return {bottom:r.bottom,frameBottom:f.bottom,limited:document.querySelector('#screen-title').classList.contains('is-space-limited')};});
  assert(row.footer.bottom<=row.footer.frameBottom+.5);await p.locator('#btn-title-settings').tap();
  await p.locator('#btn-privacy').tap();await p.frameLocator('#legal-frame').locator('h1').first().waitFor();
  row.legal=await p.evaluate(()=>{const r=document.querySelector('.legal-dialog').getBoundingClientRect(),f=document.querySelector('#app').getBoundingClientRect();
    return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,frame:{x:f.x,y:f.y,right:f.right,bottom:f.bottom}};});
  assert(row.legal.x>=row.legal.frame.x&&row.legal.y>=row.legal.frame.y&&row.legal.right<=row.legal.frame.right+.1&&row.legal.bottom<=row.legal.frame.bottom+.1);
  await p.locator('#btn-legal-close').tap();await p.locator('#btn-settings-back').tap();
  row.storage=await p.evaluate(async()=>{const {StorageNotice}=await import('/src/ui/storageNotice.ts');const notice=new StorageNotice();notice.show(true,async()=>{});
    const panel=[...document.querySelectorAll('#storage-notice')].at(-1);
    const r=panel.getBoundingClientRect(),f=document.querySelector('#app').getBoundingClientRect();notice.hide();panel.remove();
    return {x:r.x,y:r.y,w:r.width,h:r.height,frame:{x:f.x,y:f.y,w:f.width,h:f.height}};});
  for(const key of ['x','y','w','h'])assert(Math.abs(row.storage[key]-row.storage.frame[key])<.1,JSON.stringify(row.storage));
  await p.locator('#mode-word').tap();await p.locator('#btn-alphabet-start').tap();await p.evaluate(()=>window.testApp.stopClock());
  for(const [score,text]of [[0,'NOT BAD!'],[100,'GOOD TRY!'],[300,'GREAT!'],[600,'AMAZING!'],[1000,'UNBELIEVABLE!!!'],[1500,'OH MY GOD!!!']]){
    await p.evaluate(({score,text})=>{const a=window.testApp;a.cheer.play('TIME’S UP!',score,text,()=>{});a.cheer.dance();clearTimeout(a.cheer.timer);},{score,text});
    await p.waitForFunction(()=>document.querySelector('#cheer-clip').readyState>=2);await p.waitForTimeout(150);
    const m=await p.evaluate(()=>{for(const a of document.getAnimations())if(Number.isFinite(a.effect?.getComputedTiming().endTime))a.finish();
      const f=document.querySelector('#app').getBoundingClientRect();return [...document.querySelectorAll('#cheer-word,#cheer-clip,#cheer-tap')].map(e=>{
        const r=e.getBoundingClientRect();return {id:e.id,x:r.x,y:r.y,right:r.right,bottom:r.bottom,frame:{x:f.x,y:f.y,right:f.right,bottom:f.bottom}};});});
    for(const r of m)assert(r.x>=r.frame.x-.5&&r.y>=r.frame.y-.5&&r.right<=r.frame.right+.5&&r.bottom<=r.frame.bottom+.5,profile.width+' '+text+' '+r.id);
    row.grades.push({score,text,boxes:m});await p.evaluate(()=>window.testApp.cheer.stop());
  }
  report.profiles.push(row);await c.close();
}assert.deepEqual(report.errors,[]);report.passed=true;
}finally{fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');await s.close();await browser.close();
  console.log(JSON.stringify({passed:report.passed,profiles:report.profiles.length,grades:report.profiles.length*6,errors:report.errors}));}
