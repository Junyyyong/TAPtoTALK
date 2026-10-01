// Real source renderings: archived local candidate vs current tree.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repo=process.cwd(), dir=path.dirname(new URL(import.meta.url).pathname);
const out=path.join(dir,process.env.CHECK_RUN || 'final');
assert(!fs.existsSync(out),'Preserve previous results: choose a new CHECK_RUN');
fs.mkdirSync(out,{recursive:true});
const revision='43a49ce4a39a701e09985aefe17961489b21a4c5';
const temp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'talk-bare-stats-'))),before=path.join(temp,'before');
fs.mkdirSync(before);
execFileSync('tar',['-xf','-','-C',before],{input:execFileSync('git',['archive',revision],{maxBuffer:1024**3})});
execFileSync('tar',['-xzf',path.join(dir,'before-source-overlay.tar.gz'),'-C',before]);
fs.symlinkSync(path.join(repo,'node_modules'),path.join(before,'node_modules'),'dir');
const hash=b=>createHash('sha256').update(b).digest('hex');
const report={revision,beforeRoot:before,beforeOverlaySha256:hash(fs.readFileSync(path.join(dir,'before-source-overlay.tar.gz'))),
  capturedAt:new Date().toISOString(),nativeDeviceTested:false,canvas:[390,844],png:[780,1688],
  conditions:'Chrome/macOS, isolated saves, records 8/27/14, seed 20261001, clock frozen. Native hook + remaining insets 24/48 are simulated, not installed Android.',
  files:{},screens:{before:{},after:{}},differences:[],errors:[],touch:[],passed:false};
const selectors=['#app','#learning-intro-title','.alphabet-intro-mark','#learning-intro-description','.learning-intro-stats',
  '#learning-intro-best','#btn-alphabet-start','.run-heading','.run-stat-number','#run-clock','#btn-back','#btn-pause',
  '#target-label','#target-text','#target-hint','#typed-text','#letter-board','#btn-backspace'];
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--mute-audio']});
report.browser=browser.version();const servers=[];
async function render(side,root,native=false){
  const s=await createServer({root,configFile:false,cacheDir:path.join(temp,'cache-'+side+'-'+native),logLevel:'error',
    server:{host:'127.0.0.1',port:0,fs:{allow:[root,repo]}}});await s.listen();servers.push(s);
  const c=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'en-US'});
  await c.addInitScript(native=>{
    if(native)window.CapacitorCustomPlatform={name:'android'};
    const records=JSON.stringify({version:1,alphabet:8,syllable:27,word:14}),prefs=JSON.stringify({musicOn:false,soundOn:false,hapticsOn:false});
    for(const prefix of ['', 'CapacitorStorage.']){
      localStorage.setItem(prefix+'taptotalk.records.v1',records);localStorage.setItem(prefix+'taptotalk.preferences.v1',prefs);
    }
    let seed=20261001;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    if(native)document.addEventListener('DOMContentLoaded',()=>['top','right','bottom','left'].forEach((edge,i)=>
      document.documentElement.style.setProperty('--safe-area-inset-'+edge,[24,0,48,0][i]+'px')),{once:true});
  },native);
  await c.route('**/src/main.ts',async route=>{const r=await route.fetch();await route.fulfill({response:r,
    body:(await r.text()).replace('new TalkApp();','window.testApp=new TalkApp();')});});
  await c.route('**/src/config/app.ts',async route=>{const r=await route.fetch();await route.fulfill({response:r,
    body:(await r.text()).replace('studioSplashMs: 3_000, productSplashMs: 4_000','studioSplashMs: 0, productSplashMs: 0')});});
  const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));
  await p.goto('http://127.0.0.1:'+s.httpServer.address().port);await p.locator('#mode-alphabet').waitFor();
  async function shot(name){
    await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(100);
    const data=await p.evaluate(selectors=>{
      const boxes={};for(const sel of selectors){const e=document.querySelector(sel);if(!e?.checkVisibility({checkVisibilityCSS:true}))continue;
        const r=e.getBoundingClientRect(),s=getComputedStyle(e);boxes[sel]={x:r.x,y:r.y,w:r.width,h:r.height,font:s.fontSize,family:s.fontFamily,
          weight:s.fontWeight,line:s.lineHeight,color:s.color,background:s.backgroundColor,gradient:s.backgroundImage,shadow:s.boxShadow,
          outline:s.outlineStyle,border:s.borderStyle,radius:s.borderRadius};}
      const tiles=[...document.querySelectorAll('#letter-board button')].map(e=>{const s=getComputedStyle(e);return {
        label:e.getAttribute('aria-label'),background:s.backgroundImage,shadow:s.boxShadow,color:s.color,
        gloss:getComputedStyle(e,'::before').backgroundImage,font:s.fontSize,weight:s.fontWeight};});return {boxes,tiles};
    },selectors);
    const key=(native?'native-':'')+name,file=side+'-'+key+'.png',bytes=await p.screenshot({path:path.join(out,file),animations:'disabled'});
    assert.equal(bytes.readUInt32BE(16),780);assert.equal(bytes.readUInt32BE(20),1688);
    report.files[file]={width:780,height:1688,sha256:hash(bytes)};report.screens[side][key]=data;
    if(side==='after')for(const sel of ['.learning-intro-stats','.run-stat-number'])if(data.boxes[sel]){
      const b=data.boxes[sel];assert.equal(b.background,'rgba(0, 0, 0, 0)');assert.equal(b.gradient,'none');
      assert.equal(b.outline,'none');assert.equal(b.border,'none');assert.equal(b.shadow,'none');assert.equal(b.radius,'0px');
    }
  }
  for(const mode of native?['word']:['alphabet','syllable','word']){
    await p.locator('#mode-'+mode).tap();await shot(mode+'-start');await p.locator('#btn-alphabet-start').tap();
    await p.evaluate(mode=>{const a=window.testApp;if(mode!=='word'){
      a.alphabetStageIndex=mode==='alphabet'?27:18;a.roundNumber=1;a.beginRound();a.loadAlphabetStage();
    }a.stopClock();a.elapsedMs=0;a.clock.textContent='01:00.0';},mode);
    await shot(mode+'-main');
    const id=await p.evaluate(()=>{const a=window.testApp;return a.mode==='word'?
      a.tiles.find(t=>!t.transform&&!t.shape&&t.symbol==='ㅇ').id:
      a.alphabetTiles.find(t=>!t.transform&&!t.shape&&t.value===a.learningStage.sequence[0]).id;});
    const b=await p.locator(`#letter-board [data-tile-id="${id}"]`).boundingBox();
    await p.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);
    assert(await p.evaluate(id=>window.testApp.used.has(id),id),'Coordinate tap must select the intended block');
    report.touch.push({side,native,mode,id});await p.evaluate(()=>window.testApp.showTitle());
  }
  await c.close();
}
try{
  for(const [side,root]of [['before',before],['after',repo]]){await render(side,root);await render(side,root,true);}
  for(const [name,b]of Object.entries(report.screens.before)){
    const a=report.screens.after[name];assert.deepEqual(a.tiles,b.tiles,name+' tile effects stay unchanged');
    for(const [sel,box]of Object.entries(b.boxes))for(const f of ['x','y','w','h','font','family','weight','line','color']){
      const n=a.boxes[sel]?.[f];if(typeof box[f]==='number'?Math.abs(n-box[f])>.05:n!==box[f])report.differences.push({name,sel,f,before:box[f],after:n});
    }
  }
  assert.deepEqual(report.differences,[]);assert.deepEqual(report.errors,[]);
  // The sole runtime change must be the two surface rules and their comment.
  const oldCss=fs.readFileSync(path.join(before,'src/ui/styles/neutral.css'),'utf8'),newCss=fs.readFileSync('src/ui/styles/neutral.css','utf8');
  assert.equal(newCss,oldCss.replace('.run-stat-number, .learning-intro-stats { background: var(--ui-surface); border-radius: 6px; }\n','')
    .replace('.run-stat-number { outline: 1px solid var(--ui-border); outline-offset: -1px; }\n','')
    .replace('/* Records are emphasis, while their surrounding surface stays neutral. */','/* Records and the clock sit directly on the screen, without added boxes. */'));
  const sourceFiles=fs.readdirSync(path.join(repo,'src'),{recursive:true}).filter(p=>fs.statSync(path.join(repo,'src',p)).isFile()&&p!=='ui/styles/neutral.css');
  for(const file of sourceFiles)assert.equal(hash(fs.readFileSync(path.join(before,'src',file))),hash(fs.readFileSync(path.join(repo,'src',file))),file);
  report.unchangedSourceFiles=sourceFiles.length;report.passed=true;
}finally{
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');
  for(const s of servers)await s.close();await browser.close();
  console.log(JSON.stringify({passed:report.passed,screenshots:Object.keys(report.files).length,touchChecks:report.touch.length,
    unchangedSourceFiles:report.unchangedSourceFiles,differences:report.differences.length,errors:report.errors}));
}
