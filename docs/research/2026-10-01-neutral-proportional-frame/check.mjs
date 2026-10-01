// Actual renderers in isolated Chrome profiles. No device data or production
// routes are modified. The historical tree runs only in a temporary directory.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repo=process.cwd(), research=path.dirname(new URL(import.meta.url).pathname);
const out=path.join(research,process.env.CHECK_RUN || 'attempt-1');
assert(!fs.existsSync(out),'Use a new output directory; preserve earlier runs');
fs.mkdirSync(out,{recursive:true});
const revision='43a49ce4a39a701e09985aefe17961489b21a4c5';
const temp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'talk-neutral-frame-')));
const before=path.join(temp,'before'); fs.mkdirSync(before);
execFileSync('tar',['-xf','-','-C',before],{input:execFileSync('git',['archive',revision],{maxBuffer:1024**3})});
execFileSync('tar',['-xzf',path.join(research,'before-source-overlay.tar.gz'),'-C',before]);
fs.symlinkSync(path.join(repo,'node_modules'),path.join(before,'node_modules'),'dir');
const hash=b=>createHash('sha256').update(b).digest('hex');
const report={revision,beforeOverlaySha256:hash(fs.readFileSync(path.join(research,'before-source-overlay.tar.gz'))),
  capturedAt:new Date().toISOString(),nativeDeviceTested:false,canvas:[390,844],
  conditions:'Chrome on macOS; Android custom-platform hook and simulated remaining insets. Not installed Android screenshots. No system-bar artwork is composited. Seed 20261001, isolated saves, clocks frozen, media at 0.5s. Splash timers shortened only in research browser.',
  beforeRoot:before,files:{},web:{before:{},after:{}},native:[],input:[],feedback:{},differences:[],errors:[],sourceHashes:{}};
const selectors=['#app','.brand-mark','.brand-version','.mode-list','.mode-btn','.mode-name','.mode-desc','#btn-title-settings','#music-prompt',
  '#learning-intro-title','.alphabet-intro-mark','#learning-intro-description','.learning-intro-stats','#btn-alphabet-start',
  '#run-clock','#btn-back','#btn-pause','#target-label','#target-text','#target-hint','#typed-text','#letter-board','#letter-board button','#btn-backspace',
  '#settings-title','.switch-row','.switch-text b','.switch-text small','.settings-links','.help-panel','#help-title','#btn-resume',
  '#cheer-headline','#cheer-score','#cheer-word','#cheer-clip','#cheer-tap','.legal-dialog','#legal-frame','#storage-notice'];
const servers=[];
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--mute-audio']});
report.browser=browser.version();
async function serve(root) {
  const s=await createServer({root,configFile:false,cacheDir:path.join(temp,'cache-'+servers.length),logLevel:'error',
    server:{host:'127.0.0.1',port:0,fs:{allow:[root,repo]}}});
  await s.listen(); servers.push(s); return 'http://127.0.0.1:'+s.httpServer.address().port;
}
async function context(url,{width=390,height=844,native=false,insets=[0,0,0,0]}={}) {
  const c=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'en-US',timezoneId:'Asia/Seoul'});
  await c.addInitScript(({native,insets})=>{
    if(native)window.CapacitorCustomPlatform={name:'android'};
    const prefs=JSON.stringify({musicOn:false,soundOn:false,hapticsOn:false});
    localStorage.setItem('taptotalk.preferences.v1',prefs);localStorage.setItem('CapacitorStorage.taptotalk.preferences.v1',prefs);
    let seed=20261001; Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    document.addEventListener('DOMContentLoaded',()=>['top','right','bottom','left'].forEach((edge,i)=>
      document.documentElement.style.setProperty('--safe-area-inset-'+edge,insets[i]+'px')),{once:true});
  },{native,insets});
  await c.route('**/src/main.ts',async route=>{
    const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('new TalkApp();','window.testApp=new TalkApp();')});
  });
  await c.route('**/src/config/app.ts',async route=>{
    const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('studioSplashMs: 3_000, productSplashMs: 4_000','studioSplashMs: 0, productSplashMs: 0')});
  });
  const p=await c.newPage(); p.setDefaultTimeout(15000);p.on('pageerror',e=>report.errors.push(e.message));
  await p.goto(url);await p.locator('#mode-alphabet').waitFor({state:'visible'}); await settle(p); return {c,p};
}
async function settle(p) {await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(100);}
async function measure(p) {
  return p.evaluate(selectors=>{
    // Finish finite entrance animations before measuring; indefinite guidance
    // remains active. Otherwise the 420ms score entrance has race-dependent bounds.
    for(const a of document.getAnimations())if(Number.isFinite(a.effect?.getComputedTiming().endTime))a.finish();
    const app=document.querySelector('#app'),ar=app.getBoundingClientRect(),scale=ar.width/app.offsetWidth;
    const boxes={};
    for(const selector of selectors){const e=document.querySelector(selector);if(!e?.checkVisibility({checkVisibilityCSS:true}))continue;
      const r=e.getBoundingClientRect(),s=getComputedStyle(e);boxes[selector]={x:r.x,y:r.y,w:r.width,h:r.height,
        lx:(r.x-ar.x)/scale,ly:(r.y-ar.y)/scale,lw:r.width/scale,lh:r.height/scale,
        font:s.fontSize,weight:s.fontWeight,line:s.lineHeight,family:s.fontFamily,
        color:s.color,background:s.backgroundColor,gradient:s.backgroundImage,shadow:s.boxShadow,textShadow:s.textShadow,filter:s.filter,
        border:s.borderColor,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth};}
    const tileStyles=[...document.querySelectorAll('#letter-board button')].map(e=>{const s=getComputedStyle(e);return {
      label:e.getAttribute('aria-label'),classes:e.className,background:s.backgroundImage,color:s.color,
      shadow:s.boxShadow,textShadow:s.textShadow,border:s.borderColor,font:s.fontSize,weight:s.fontWeight,line:s.lineHeight,
      before:getComputedStyle(e,'::before').backgroundImage,disabled:e.disabled};});
    return {scale,boxes,tileStyles,frame:{x:ar.x,y:ar.y,w:ar.width,h:ar.height},viewport:[innerWidth,innerHeight]};
  },selectors);
}
async function shot(p,side,name) {
  await settle(p);const file=side+'-'+name+'.png';const bytes=await p.screenshot({path:path.join(out,file),animations:'disabled'});
  assert.equal(bytes.readUInt32BE(16),780);assert.equal(bytes.readUInt32BE(20),1688);
  report.files[file]={width:780,height:1688,sha256:hash(bytes)};return measure(p);
}
async function freeze(p) {await p.evaluate(()=>{const a=window.testApp;a.stopClock();a.startedAt=performance.now();a.elapsedMs=0;a.clock.textContent=a.roundSection.tutorial?'PRACTICE':'01:00.0';});}
async function enter(p,mode) {await p.locator('#mode-'+mode).tap();await p.locator('#btn-alphabet-start').tap();await freeze(p);await settle(p);}
async function stage(p,index,round=1) {await p.evaluate(({index,round})=>{const a=window.testApp;a.cheer.stop();a.alphabetStageIndex=index;a.roundNumber=round;a.beginRound();a.loadAlphabetStage();}, {index,round});await freeze(p);await settle(p);}
async function returnHome(p) {await p.evaluate(()=>window.testApp.showTitle());await settle(p);}
async function inputTest(p,label) {
  const initial=await p.evaluate(()=>{const a=window.testApp;return {mode:a.mode,n:a.mode==='word'?a.input.length:a.alphabetPartIndex};});
  const id=await p.evaluate(()=>{const a=window.testApp;
    if(a.mode==='word')return a.tiles.find(t=>!a.used.has(t.id)&&!t.transform&&!t.shape&&t.symbol==='ㅇ')?.id;
    return a.alphabetTiles.find(t=>!a.used.has(t.id)&&!t.transform&&!t.shape&&t.value===a.learningStage.sequence[a.alphabetPartIndex]).id;});
  assert.notEqual(id,undefined);const button=p.locator(`#letter-board [data-tile-id="${id}"]`);
  const box=await button.boundingBox();await p.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
  const result=await p.evaluate(({id,initial})=>{const a=window.testApp;return {used:a.used.has(id),n:a.mode==='word'?a.input.length:a.alphabetPartIndex,initial,
    disabled:document.querySelector(`[data-tile-id="${id}"]`).disabled};},{id,initial});
  assert(result.used&&result.disabled&&result.n===initial.n+1,label+': coordinate tap');
  report.input.push({label,box,...result});
}
async function feedbackTest(p,side) {
  const wrong=await p.evaluate(()=>window.testApp.alphabetTiles.find(t=>t.transform||t.shape).id);
  await p.locator(`#letter-board [data-tile-id="${wrong}"]`).tap();
  const error=await p.evaluate(id=>({
    tile:getComputedStyle(document.querySelector(`[data-tile-id="${id}"]`)).animationName,
    tint:getComputedStyle(document.querySelector('#screen-game'),'::after').animationName,
    shake:getComputedStyle(document.querySelector('#letter-board')).animationName,
    penalty:document.querySelector('.time-penalty').classList.contains('is-visible'),
  }),wrong);
  assert.equal(error.tile,'wrong-pick');assert.equal(error.tint,'mistake-tint');assert.equal(error.shake,'mistake-shake');assert(error.penalty);
  await inputTest(p,side+'-feedback');await freeze(p);
  report.web[side]['alphabet-input']=await shot(p,side,'alphabet-input');
  const partial=await p.evaluate(()=>[...document.querySelectorAll('.alphabet-target-jamo')].map(e=>({classes:e.className,color:getComputedStyle(e).color})));
  while(await p.evaluate(()=>window.testApp.alphabetPartIndex<window.testApp.learningStage.sequence.length)) {
    const id=await p.evaluate(()=>{const a=window.testApp;return a.alphabetTiles.find(t=>!a.used.has(t.id)&&!t.transform&&!t.shape&&t.value===a.learningStage.sequence[a.alphabetPartIndex]).id;});
    await p.locator(`#letter-board [data-tile-id="${id}"]`).tap();await p.evaluate(()=>clearTimeout(window.testApp.stageTimer));
  }
  report.web[side]['alphabet-complete']=await shot(p,side,'alphabet-complete');
  const complete=await p.evaluate(()=>{const e=document.querySelector('.target-prompt');return {class:e.className,background:getComputedStyle(e).backgroundColor,text:getComputedStyle(document.querySelector('#target-text')).color};});
  report.feedback[side]={error,partial,complete};
}
async function grade(p,score,text) {
  await p.evaluate(({score,text})=>{const a=window.testApp;a.cheer.play('TIME’S UP!',score,text,()=>{});a.cheer.dance();},{score,text});
  await p.waitForFunction(()=>document.querySelector('#cheer-clip').readyState>=2);
  await p.evaluate(()=>{const v=document.querySelector('#cheer-clip');v.pause();v.currentTime=.5;clearTimeout(window.testApp.cheer.timer);});
  await p.waitForFunction(()=>!document.querySelector('#cheer-clip').seeking);await settle(p);
}
async function browserSequence(url,side) {
  const {c,p}=await context(url);const metrics=report.web[side];
  metrics.home=await shot(p,side,'home');
  const rect=await p.locator('#mode-alphabet').boundingBox();await p.mouse.move(rect.x+20,rect.y+20);await p.mouse.down();
  await shot(p,side,'home-pressed');await p.mouse.up();await returnHome(p);
  await p.locator('#btn-title-settings').tap();metrics.settings=await shot(p,side,'settings');
  for(const kind of ['privacy','licenses']) {await p.locator('#btn-'+kind).tap();await p.frameLocator('#legal-frame').locator('h1').first().waitFor();
    metrics[kind]=await shot(p,side,kind);await p.locator('#btn-legal-close').tap();}
  await p.locator('#btn-settings-back').tap();
  for(const mode of ['alphabet','syllable','word']) {
    await p.locator('#mode-'+mode).tap();metrics[mode+'-start']=await shot(p,side,mode+'-start');
    await p.locator('#btn-alphabet-start').tap();await freeze(p);metrics[mode]=await shot(p,side,mode);
    await p.locator('#btn-pause').tap();metrics[mode+'-pause']=await shot(p,side,mode+'-pause');
    await p.locator('#btn-resume').tap();await freeze(p);
    if(mode!=='word')for(const [name,index,round] of mode==='alphabet'?[['alphabet-4x4',17,1],['alphabet-6x6',23,1],['alphabet-main',27,1]]:
      [['syllable-4x4',5,1],['syllable-main',18,1],['syllable-8x8',18,2]]) {await stage(p,index,round);metrics[name]=await shot(p,side,name);}
    if(mode==='alphabet')await feedbackTest(p,side);
    if(mode==='word') {
      await inputTest(p,side+'-word');metrics['word-input']=await shot(p,side,'word-input');
      await p.evaluate(async()=>{const a=window.testApp;const {WORD_TARGETS}=await import('/src/content/prompts.ts');
        a.wordTarget=WORD_TARGETS.find(t=>t.word==='어슬렁어슬렁');a.input=[];a.used.clear();a.tiles=a.makeWordBoard();a.renderTranslatedTarget();a.renderBoard();a.renderInput();});
      metrics['word-long']=await shot(p,side,'word-long');
      await p.evaluate(()=>{const a=window.testApp;a.cheer.play('TIME’S UP!',1500,'OH MY GOD!!!',()=>{});clearTimeout(a.cheer.timer);});
      metrics.score=await shot(p,side,'score');await p.evaluate(()=>window.testApp.cheer.stop());
      await grade(p,1000,'UNBELIEVABLE!!!');
      metrics.grade=await shot(p,side,'grade');await p.evaluate(()=>window.testApp.cheer.stop());
    }
    await returnHome(p);
  }
  // Web keeps its responsive behavior at each existing breakpoint.
  for(const [width,height] of [[320,568],[360,640],[390,660],[390,700],[390,701],[412,915]]) {
    await p.setViewportSize({width,height});await settle(p);metrics[`web-${width}x${height}-home`]=await measure(p);
    await p.locator('#mode-word').tap();await p.locator('#btn-alphabet-start').tap();await freeze(p);await settle(p);
    metrics[`web-${width}x${height}-word`]=await measure(p);await returnHome(p);
  }
  await c.close();
}
function compareWeb() {
  for(const [name,b] of Object.entries(report.web.before)) {const a=report.web.after[name];
    for(const [selector,v] of Object.entries(b.boxes)) {const n=a.boxes[selector];if(!n){report.differences.push({name,selector,missing:true});continue;}
      for(const field of ['x','y','w','h','font','weight','line','family']) if(typeof v[field]==='number'?Math.abs(v[field]-n[field])>.05:v[field]!==n[field])
        report.differences.push({name,selector,field,before:v[field],after:n[field]});}
    assert.deepEqual(a.tileStyles,b.tileStyles,name+': block colours/effects must stay unchanged');
  }
  assert.deepEqual(report.differences,[],'Web geometry/typography changed');
  assert.deepEqual(report.feedback.after.error,report.feedback.before.error,'Wrong feedback stays unchanged');
  assert.deepEqual(report.feedback.after.complete,report.feedback.before.complete,'Completion feedback stays unchanged');
  const active=items=>items.filter(x=>/is-done|is-current/.test(x.classes));
  assert.deepEqual(active(report.feedback.after.partial),active(report.feedback.before.partial),'Correct/current colours stay unchanged');
  for(const m of Object.values(report.web.after))for(const [selector,s] of Object.entries(m.boxes)){
    if(['.mode-btn','#btn-back','#btn-pause','#btn-alphabet-start','.switch-row','.help-panel','#btn-resume','#btn-backspace','.legal-dialog'].includes(selector)){
      assert.equal(s.gradient,'none',selector+' flat face');assert.equal(s.shadow,'none',selector+' no dimensional shadow');
    }
  }
  assert.equal(report.web.after.home.boxes['.brand-mark'].filter,'none');
}
function validateNative(label,m,width,height,insets,reference) {
  const [top,right,bottom,left]=insets;const scale=Math.min((width-left-right)/390,(height-top-bottom)/844);
  assert(Math.abs(scale-m.scale)<.002,label+': uniform fit');
  assert(m.frame.x>=left-.1&&m.frame.y>=top-.1&&m.frame.x+m.frame.w<=width-right+.1&&m.frame.y+m.frame.h<=height-bottom+.1,label+': safe bounds');
  for(const [selector,b] of Object.entries(m.boxes)) {
    if(['#legal-frame','.legal-dialog','#storage-notice'].includes(selector))continue;
    assert(b.lx>=-.5&&b.ly>=-.5&&b.lx+b.lw<=390+.5&&b.ly+b.lh<=844+.5,label+' '+selector+': canvas bounds');
    if(reference?.boxes[selector]) {const r=reference.boxes[selector];for(const field of ['lx','ly','lw','lh','font','weight','line','family'])
      assert(typeof b[field]==='number'?Math.abs(b[field]-r[field])<.15:b[field]===r[field],`${label} ${selector} ${field}: reference composition`);}
  }
  const board=m.boxes['#letter-board'];if(board)assert(Math.abs(board.lw-board.lh)<.05,label+': square board');
  report.native.push({label,width,height,insets,...m});
}
async function nativeSequence(url) {
  const base={};
  const profiles=[{width:390,height:844,insets:[0,0,0,0]},
    ...[2,2.4,3,3.6,4].map(d=>({width:1080/d,height:2340/d,insets:[72/d,0,144/d,0],density:d})),
    {width:320,height:568,insets:[24,0,48,0]}, {width:412,height:915,insets:[30,18,36,8]},
    {width:844,height:390,insets:[8,30,16,20]},
    {width:390,height:844,insets:[24,0,48,0]}];
  for(let i=0;i<profiles.length;i++) {
    console.log('Android simulation profile '+(i+1)+'/'+profiles.length);
    const profile=profiles[i],{width,height,insets}=profile;const {c,p}=await context(url,{...profile,native:true});
    async function record(name) {await settle(p);const m=await measure(p);if(!i)base[name]=m;
      validateNative(name+'-profile-'+i,m,width,height,insets,base[name]);if(width===390&&height===844)await shot(p,'native'+i,name);}
    await record('home');
    await p.locator('#btn-title-settings').tap();await record('settings');
    await p.locator('#btn-privacy').tap();await p.frameLocator('#legal-frame').locator('h1').first().waitFor();await record('privacy');
    const dlg=await p.locator('#legal-dialog').boundingBox();assert(dlg.y>=insets[0]&&dlg.y+dlg.height<=height-insets[2], 'legal top-layer bounds');
    await p.locator('#btn-legal-close').tap();await p.locator('#btn-settings-back').tap();
    for(const mode of ['alphabet','syllable','word']) {
      await p.locator('#mode-'+mode).tap();await record(mode+'-start');await p.locator('#btn-alphabet-start').tap();await freeze(p);await record(mode);
      await p.locator('#btn-pause').tap();await record(mode+'-pause');await p.locator('#btn-resume').tap();await freeze(p);
      if(mode!=='word')for(const [name,index,round] of mode==='alphabet'?[['alphabet-4x4',17,1],['alphabet-6x6',23,1],['alphabet-main',27,1]]:
        [['syllable-4x4',5,1],['syllable-main',18,1],['syllable-8x8',18,2]]) {await stage(p,index,round);await record(name);}
      await inputTest(p,mode+'-profile-'+i);
      if(mode==='word') {
        // Delete is tested by touch, not a programmatic click.
        await p.locator('#btn-backspace').tap();assert.equal(await p.evaluate(()=>window.testApp.input.length),0);
        await p.evaluate(()=>{const a=window.testApp;a.cheer.play('TIME’S UP!',1500,'OH MY GOD!!!',()=>{});clearTimeout(a.cheer.timer);});
        await record('score');await p.evaluate(()=>window.testApp.cheer.stop());
        for(const [score,text] of [[0,'NOT BAD'],[1,'GOOD TRY'],[300,'GREAT'],[600,'AMAZING'],[1000,'UNBELIEVABLE'],[1500,'OH MY GOD']]) {
          await grade(p,score,text);await record('grade-'+score);await p.evaluate(()=>window.testApp.cheer.stop());
        }
      }
      await returnHome(p);
    }
    if(i===3) {
      // Change viewport density while the same game is running; don't reload.
      await enter(p,'word');const original=await measure(p);
      for(const density of [4,2,3.6,3]) {const w=1080/density,h=2340/density,bars=[72/density,0,144/density,0];
        await p.setViewportSize({width:w,height:h});await p.evaluate(bars=>['top','right','bottom','left'].forEach((side,i)=>{
          document.documentElement.style.setProperty('--safe-area-inset-'+side,bars[i]+'px');
          document.documentElement.style.setProperty('--android-game-inset-'+side,bars[i]+'px');}),bars);await settle(p);
        validateNative('live-density-'+density,await measure(p),w,h,bars,original);}
      // Native padding path is authoritative zero, even if old CSS says 24/48.
      await p.setViewportSize({width:360,height:708});await p.evaluate(()=>['top','right','bottom','left'].forEach(side=>document.documentElement.style.setProperty('--android-game-inset-'+side,'0px')));
      await settle(p);validateNative('already-padded',await measure(p),360,708,[0,0,0,0],original);
      await p.evaluate(()=>{document.documentElement.style.setProperty('--android-game-inset-left','10px');document.documentElement.style.setProperty('--android-game-inset-right','20px');});
      await settle(p);validateNative('inset-only-change',await measure(p),360,708,[0,20,0,10],original);
    }
    await c.close();
  }
}
try {
  const beforeURL=await serve(before),afterURL=await serve(repo);
  await browserSequence(beforeURL,'before');await browserSequence(afterURL,'after');compareWeb();
  await nativeSequence(afterURL);
  assert.deepEqual(report.errors,[]);
  report.passed=true;
} finally {
  for(const [name,root] of [['before',before],['after',repo]])report.sourceHashes[name]=Object.fromEntries([
    'src/ui/talkApp.ts','src/config/app.ts','src/config/glyphAssets.ts','src/config/introMarks.ts',
    'src/ui/talkStorage.ts','src/ui/persistentStore.ts','src/ui/talkProgress.ts','src/ui/stageRecords.ts','src/ui/styles/motion.css',
    'public/assets/brand/taptotalk-logo-0911.png','public/assets/brand/taptotalk-cover-0911-v2.png',
    'public/assets/fonts/NotoSansKR-Variable.woff2','public/assets/fonts/NotoSerifKR-Variable.woff2',
    'public/assets/audio/talk-lobby.mp3','public/assets/audio/talk-game-acoustic-142.mp3',
    ...['src/core/hangul','src/content'].flatMap(dir=>fs.readdirSync(path.join(root,dir),{recursive:true}).filter(p=>fs.statSync(path.join(root,dir,p)).isFile()).map(p=>dir+'/'+p)),
  ].map(p=>[p,hash(fs.readFileSync(path.join(root,p)))]));
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');
  for(const s of servers)await s.close();await browser.close();
  console.log(JSON.stringify({passed:report.passed,screenshots:Object.keys(report.files).length,nativeChecks:report.native.length,inputChecks:report.input.length,webDifferences:report.differences.length,errors:report.errors,out}));
}
