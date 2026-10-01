// Genuine commit archive + current-source renderings, never composed mockups.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repo=process.cwd(), research=path.dirname(new URL(import.meta.url).pathname);
const out=path.join(research,process.env.CHECK_RUN || 'final');
assert(!fs.existsSync(out),'Choose a fresh CHECK_RUN; do not overwrite evidence');
fs.mkdirSync(out,{recursive:true});
const revision='b79c8b406036576fcd1c21578b32b339f08af232';
const temp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'talk-responsive-'))),before=path.join(temp,'before');
fs.mkdirSync(before);
execFileSync('tar',['-xf','-','-C',before],{input:execFileSync('git',['archive',revision],{maxBuffer:1024**3})});
fs.symlinkSync(path.join(repo,'node_modules'),path.join(before,'node_modules'),'dir');
const hash=b=>createHash('sha256').update(b).digest('hex');
const report={revision,beforeRoot:before,capturedAt:new Date().toISOString(),nativeDeviceTested:false,passed:false,
  conditions:'Chrome/macOS, Android platform hook + injected remaining insets: simulation, not an installed device. CSS390x844/DPR2 screenshots. Isolated saves, seed20261001, clocks frozen, movie0.5s. Only research routes expose app and skip splash delays.',
  files:{},screens:{before:{},after:{}},profiles:[],touch:[],live:[],errors:[],protectedFiles:{},webDifferences:[]};
const selectors=['#app','.studio-splash-cover','.splash-cover','.brand-block','.brand-mark','.mode-list','.mode-name','.mode-desc',
  '#btn-title-settings','#music-prompt','#learning-intro-title','.alphabet-intro-mark','#learning-intro-description',
  '.learning-intro-stats','#btn-alphabet-start','#run-clock','#btn-back','#btn-pause','.writing-card','.target-prompt',
  '#target-text','#target-hint','#typed-text','.letter-board-space','#letter-board','#letter-board button','.fixed-controls','#btn-backspace',
  '#settings-title','.switch-row','.switch-text b','.switch-text small','.settings-links','.help-panel','#help-title','#btn-resume',
  '#cheer-headline','#cheer-score','#cheer-word','#cheer-clip','#cheer-tap'];
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--mute-audio']});
report.browser=browser.version();const servers=[];
async function serve(root){const s=await createServer({root,configFile:false,cacheDir:path.join(temp,'cache-'+servers.length),logLevel:'error',
  server:{host:'127.0.0.1',port:0,fs:{allow:[root,repo]}}});await s.listen();servers.push(s);return 'http://127.0.0.1:'+s.httpServer.address().port;}
async function context(url,{width=390,height=844,native=true,insets=[0,0,0,0],fallback=[0,0,0,0]}={}){
  const c=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'en-US',timezoneId:'Asia/Seoul'});
  await c.addInitScript(({native,insets,fallback})=>{
    if(native)window.CapacitorCustomPlatform={name:'android'};
    const prefs=JSON.stringify({musicOn:false,soundOn:false,hapticsOn:false});
    for(const prefix of ['', 'CapacitorStorage.'])localStorage.setItem(prefix+'taptotalk.preferences.v1',prefs);
    let seed=20261001;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    document.addEventListener('DOMContentLoaded',()=>['top','right','bottom','left'].forEach((edge,i)=>{
      document.documentElement.style.setProperty('--safe-area-inset-'+edge,fallback[i]+'px');
      if(native)document.documentElement.style.setProperty('--android-game-inset-'+edge,insets[i]+'px');
    }),{once:true});
  },{native,insets,fallback});
  await c.route('**/src/main.ts',async route=>{const r=await route.fetch();await route.fulfill({response:r,
    body:(await r.text()).replace('new TalkApp();','window.testApp=new TalkApp();')});});
  await c.route('**/src/config/app.ts',async route=>{const r=await route.fetch();await route.fulfill({response:r,
    body:(await r.text()).replace('studioSplashMs: 3_000, productSplashMs: 4_000','studioSplashMs: 0, productSplashMs: 0')});});
  const p=await c.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>report.errors.push(e.message));
  await p.goto(url);await p.locator('#mode-alphabet').waitFor({state:'visible'});await settle(p);return {c,p};
}
async function settle(p){await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(120);}
async function measure(p){return p.evaluate(selectors=>{
  for(const a of document.getAnimations())if(Number.isFinite(a.effect?.getComputedTiming().endTime))a.finish();
  const app=document.querySelector('#app'),ar=app.getBoundingClientRect(),scale=ar.height/parseFloat(getComputedStyle(app).height);
  const boxes={};for(const selector of selectors){const e=document.querySelector(selector);if(!e?.checkVisibility({checkVisibilityCSS:true}))continue;
    const r=e.getBoundingClientRect(),s=getComputedStyle(e);boxes[selector]={x:r.x,y:r.y,w:r.width,h:r.height,
      lx:(r.x-ar.x)/scale,ly:(r.y-ar.y)/scale,lw:r.width/scale,lh:r.height/scale,
      font:s.fontSize,weight:s.fontWeight,line:s.lineHeight,family:s.fontFamily,color:s.color,background:s.backgroundColor,
      gradient:s.backgroundImage,shadow:s.boxShadow,textShadow:s.textShadow,filter:s.filter,border:s.borderColor};}
  const tiles=[...document.querySelectorAll('#letter-board button')].map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {
    w:r.width/scale,h:r.height/scale,label:e.getAttribute('aria-label'),gradient:s.backgroundImage,shadow:s.boxShadow,
    color:s.color,font:s.fontSize,weight:s.fontWeight,gloss:getComputedStyle(e,'::before').backgroundImage};});
  return {boxes,tiles,scale,frame:{x:ar.x,y:ar.y,w:ar.width,h:ar.height},viewport:[innerWidth,innerHeight]};
},selectors);}
async function freeze(p){await p.evaluate(()=>{const a=window.testApp;a.stopClock();a.startedAt=performance.now();a.elapsedMs=0;
  a.clock.textContent=a.roundSection.tutorial?'PRACTICE':'01:00.0';});}
async function home(p){await p.evaluate(()=>window.testApp.showTitle());await settle(p);}
async function enter(p,mode){await p.locator('#mode-'+mode).tap();await p.locator('#btn-alphabet-start').tap();await freeze(p);await settle(p);}
async function stage(p,index,round=1){await p.evaluate(({index,round})=>{const a=window.testApp;a.alphabetStageIndex=index;
  a.roundNumber=round;a.beginRound();a.loadAlphabetStage();},{index,round});await freeze(p);await settle(p);}
async function grade(p,score=300,text='GREAT!'){
  await p.evaluate(({score,text})=>{const a=window.testApp;a.cheer.play('TIME’S UP!',score,text,()=>{});a.cheer.dance();},{score,text});
  await p.waitForFunction(()=>document.querySelector('#cheer-clip').readyState>=2);
  await p.evaluate(()=>{const a=window.testApp,v=document.querySelector('#cheer-clip');v.pause();v.currentTime=.5;clearTimeout(a.cheer.timer);});
  await p.waitForFunction(()=>!document.querySelector('#cheer-clip').seeking);await settle(p);
}
function verify(m,label){
  const f=m.frame,tol=.75;
  for(const [sel,b]of Object.entries(m.boxes)){
    if(['#app','.studio-splash-cover','.splash-cover','.letter-board-space'].includes(sel))continue;
    assert(b.x>=f.x-tol&&b.y>=f.y-tol&&b.x+b.w<=f.x+f.w+tol&&b.y+b.h<=f.y+f.h+tol,label+' outside usable area: '+sel);
  }
  const b=m.boxes['#letter-board'];if(b){
    assert(Math.abs(b.w-b.h)<.05,label+' board must be square');
    for(const t of m.tiles)assert(Math.abs(t.w-t.h)<.05,label+' tile must be square');
    const w=m.boxes['.writing-card'],footer=m.boxes['.fixed-controls'];
    assert(w.y+w.h<=b.y+tol,label+' board overlaps target');
    if(footer)assert(b.y+b.h<=footer.y+tol,label+' board overlaps controls');
  }
}
async function touch(p,label){
  const id=await p.evaluate(()=>{const a=window.testApp;return a.mode==='word'?a.tiles.find(t=>!a.used.has(t.id)&&!t.transform&&!t.shape&&t.symbol==='ㅇ').id:
    a.alphabetTiles.find(t=>!a.used.has(t.id)&&!t.transform&&!t.shape&&t.value===a.learningStage.sequence[a.alphabetPartIndex]).id;});
  const r=await p.locator(`[data-tile-id="${id}"]`).boundingBox();await p.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);
  assert(await p.evaluate(id=>window.testApp.used.has(id),id),label+' coordinate tap mismatch');report.touch.push({label,id});
}
async function screens(p,record){
  await record('home');await p.locator('#btn-title-settings').tap();await record('settings');await p.locator('#btn-settings-back').tap();
  for(const mode of ['alphabet','syllable','word']){
    await p.locator('#mode-'+mode).tap();await record(mode+'-start');await p.locator('#btn-alphabet-start').tap();await freeze(p);
    await record(mode+'-practice');await p.locator('#btn-pause').tap();await record(mode+'-pause');await p.locator('#btn-resume').tap();await freeze(p);
    if(mode==='alphabet'){await stage(p,17);await record('alphabet-4x4');await stage(p,23);await record('alphabet-6x6');await stage(p,27);}
    if(mode==='syllable'){await stage(p,5);await record('syllable-4x4');await stage(p,18);}
    await record(mode+'-main');await touch(p,mode);await freeze(p);await record(mode+'-input');
    await p.evaluate(()=>{const a=window.testApp;a.cheer.play('TIME’S UP!',1500,'OH MY GOD!!!',()=>{});clearTimeout(a.cheer.timer);});
    await record(mode+'-score');await p.evaluate(()=>window.testApp.cheer.stop());
    await grade(p);await record(mode+'-great');await p.evaluate(()=>window.testApp.cheer.stop());await home(p);
  }
}
async function primary(url,side,native){
  const {c,p}=await context(url,{native,insets:native?[24,0,48,0]:[0,0,0,0]});
  async function shot(name){await settle(p);const m=await measure(p);if(side==='after'&&native)verify(m,name);
    const file=side+'-'+(native?'native-':'web-')+name+'.png';const bytes=await p.screenshot({path:path.join(out,file),animations:'disabled'});
    assert.equal(bytes.readUInt32BE(16),780);assert.equal(bytes.readUInt32BE(20),1688);report.files[file]={width:780,height:1688,sha256:hash(bytes)};
    report.screens[side][(native?'native-':'web-')+name]=m;
  }
  for(const [name,id]of [['studio','screen-studio-splash'],['cover','screen-splash']]){
    await p.evaluate(id=>{document.querySelector('#screen-title').classList.add('hidden');document.getElementById(id).classList.remove('hidden');},id);
    await shot(name);await p.evaluate(id=>document.getElementById(id).classList.add('hidden'),id);await home(p);
  }
  await screens(p,shot);await c.close();
}
try{
  const urls={before:await serve(before),after:await serve(repo)};
  for(const side of ['before','after'])for(const native of [false,true])await primary(urls[side],side,native);
  // Web remains unchanged at the reference size, including all colors and type.
  for(const [name,b]of Object.entries(report.screens.before))if(name.startsWith('web-')){
    const a=report.screens.after[name];for(const [sel,box]of Object.entries(b.boxes))for(const [key,v]of Object.entries(box)){
      const n=a.boxes[sel]?.[key];if(typeof v==='number'?Math.abs(n-v)>.08:n!==v)report.webDifferences.push({name,sel,key,before:v,after:n});
    }
    assert.deepEqual(a.tiles,b.tiles,name+' block presentation changed');
  }
  assert.deepEqual(report.webDifferences,[]);
  // All game/storage/content/media/native Java and identity/signing settings stay byte-identical.
  const protectedPaths=['src/core/hangul','src/content','src/config','public/assets/brand','public/assets/audio',
    'src/ui/talkApp.ts','src/ui/talkStorage.ts','src/ui/talkProgress.ts','src/ui/styles/talk.css','src/ui/styles/tokens.css',
    'src/ui/styles/title.css','src/ui/styles/neutral.css','src/ui/styles/overlay.css','android/app/build.gradle','android/app/src/main/java'];
  for(const entry of protectedPaths){const stat=fs.statSync(path.join(repo,entry)),files=stat.isDirectory()?fs.readdirSync(path.join(repo,entry),{recursive:true}).filter(f=>fs.statSync(path.join(repo,entry,f)).isFile()).map(f=>path.join(entry,f)):[entry];
    for(const file of files){const sha=hash(fs.readFileSync(path.join(repo,file)));assert.equal(sha,hash(fs.readFileSync(path.join(before,file))),file);report.protectedFiles[file]=sha;}}
  const profiles=[{name:'short-phone',width:320,height:568,insets:[24,0,32,0]},
    {name:'regular-phone',width:360,height:780,insets:[24,0,48,0]},
    {name:'long-phone',width:412,height:1000,insets:[28,0,48,0]},
    {name:'tablet-portrait',width:800,height:1280,insets:[24,0,48,0]},
    {name:'tablet-landscape',width:1280,height:800,insets:[24,0,48,0]},
    {name:'phone-landscape-cutout',width:844,height:390,insets:[10,44,20,40]},
    {name:'native-already-inset',width:390,height:772,insets:[0,0,0,0],fallback:[24,0,48,0]}];
  for(const profile of profiles){const {c,p}=await context(urls.after,profile);const row={profile,screens:{}};
    await screens(p,async name=>{await settle(p);const m=await measure(p);verify(m,profile.name+'/'+name);row.screens[name]=m;});
    report.profiles.push(row);await c.close();}
  // Same physical 1080x2340 device, changing logical density only. Rounding <1 physical pixel is tolerated.
  let base=null;
  for(const density of [2,2.4,3,3.6,4]){
    const profile={name:'display-zoom-'+density,width:Math.round(1080/density),height:Math.round(2340/density),insets:[72/density,0,144/density,0]};
    const {c,p}=await context(urls.after,profile);const row={profile,density,screens:{}};
    await screens(p,async name=>{await settle(p);const m=await measure(p);verify(m,profile.name+'/'+name);row.screens[name]=m;});
    if(!base)base=row;else for(const [name,m]of Object.entries(row.screens)){
      const b=base.screens[name];for(const [sel,box]of Object.entries(b.boxes))for(const key of ['lx','ly','lw','lh'])
        assert(Math.abs(m.boxes[sel][key]-box[key])<1.1,profile.name+'/'+name+'/'+sel+'/'+key+' density changed layout');
    }
    report.profiles.push(row);await c.close();
  }
  // Live density/window changes while the same game is running; the game state must survive.
  const {c,p}=await context(urls.after);await enter(p,'alphabet');await stage(p,27);
  for(const [width,height,insets]of [[270,585,[18,0,36,0]],[450,975,[30,0,60,0]],[390,844,[0,0,0,0]]]){
    const state=await p.evaluate(()=>({stage:window.testApp.alphabetStageIndex,n:window.testApp.alphabetPartIndex}));
    await p.setViewportSize({width,height});await p.evaluate(insets=>['top','right','bottom','left'].forEach((e,i)=>
      document.documentElement.style.setProperty('--android-game-inset-'+e,insets[i]+'px')),insets);await settle(p);
    const m=await measure(p);verify(m,'live');assert.deepEqual(await p.evaluate(()=>({stage:window.testApp.alphabetStageIndex,n:window.testApp.alphabetPartIndex})),state);
    await touch(p,'live-'+width);report.live.push({width,height,insets,frame:m.frame});
  }
  await c.close();assert.deepEqual(report.errors,[]);report.passed=true;
}finally{
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');
  for(const s of servers)await s.close();await browser.close();
  console.log(JSON.stringify({passed:report.passed,screenshots:Object.keys(report.files).length,profiles:report.profiles.length,
    touch:report.touch.length,protectedFiles:Object.keys(report.protectedFiles).length,errors:report.errors,webDifferences:report.webDifferences.length}));
}
