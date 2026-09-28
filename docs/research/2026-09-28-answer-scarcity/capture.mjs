import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=new URL('./',import.meta.url).pathname,tmp=fs.mkdtempSync(path.join(os.tmpdir(),'talk-scarcity-'));
execFileSync('tar',['-xf','-','-C',tmp],{input:execFileSync('git',['archive','fe16865'],{maxBuffer:512*1024*1024})});
fs.symlinkSync(path.join(process.cwd(),'node_modules'),path.join(tmp,'node_modules'),'dir');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const files=[],counts={};
try {for(const side of ['before','after']){
 const root=fs.realpathSync(side==='before'?tmp:process.cwd());
 const server=await createServer({root,configFile:false,server:{fs:{allow:[root,process.cwd()]},port:5198,strictPort:true,host:'127.0.0.1'},logLevel:'error'});await server.listen();
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 await context.route('**/src/main.ts',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('new TalkApp();','window.testApp=new TalkApp();')});});
 async function open(mode){const p=await context.newPage();await p.goto('http://127.0.0.1:5198');await p.locator('#mode-'+mode).waitFor({state:'visible'});await p.locator('#mode-'+mode).click();await p.locator('#btn-alphabet-start').click();await p.evaluate(()=>document.fonts.ready);return p;}
 async function select(p,mode){await p.evaluate(()=>window.testApp.showTitle());await p.locator('#mode-'+mode).click();await p.locator('#btn-alphabet-start').click();}
 async function stage(p,number,target){await p.evaluate(async({number,target})=>{
  let seed=456;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const a=window.testApp;const {ALPHABET_STAGES}=await import('/src/content/prompts.ts');
  const {learningStageAt}=await import('/src/content/learningJourney.ts');
  a.roundNumber=2;a.stageTransitionPending=false;a.paused=false;
  if(a.mode==='word'){
   const {createWordJourney}=await import('/src/content/wordJourney.ts');
   a.nextWordTarget=createWordJourney();for(let i=0;i<number;i++)a.wordTarget=a.nextWordTarget();
   a.wordTargetIndex=number-1;a.beginRound();a.input=[];a.used.clear();a.tiles=a.makeWordBoard();a.renderTranslatedTarget();a.renderBoard();a.renderInput();
  }else{
   a.alphabetStageIndex=(a.mode==='alphabet'?ALPHABET_STAGES.length:a.syllablePractice.length)+number-1;
   a.beginRound();const override=target?learningStageAt(a.mode,a.alphabetStageIndex,'',Math.random,2,a.syllablePractice,()=>target):undefined;
   a.loadAlphabetStage(override);
  }
  a.elapsedMs=10000;a.startClock(true);a.saveProgress();
 },{number,target});}
 async function multiplicity(p){return p.evaluate(async()=>{
  const a=window.testApp;const {requiredBoardSymbols}=await import('/src/core/hangul/target.ts');
  const seq=a.mode==='word'?requiredBoardSymbols(a.wordTarget.word):a.learningStage.sequence;
  const board=a.mode==='word'?a.tiles:a.alphabetTiles;
  return Object.fromEntries([...new Set(seq)].map(value=>[value,{needed:seq.filter(v=>v===value).length,actual:board.filter(t=>!t.transform&&!t.shape&&(t.value??t.symbol)===value).length}]));
 });}
 async function assertCounts(p,extra){for(const value of Object.values(await multiplicity(p)))assert.equal(value.actual,value.needed+extra);}
 async function shot(p,name){files.push(name);await p.screenshot({path:out+name+'.png'});}
 try{
  let p=await open('syllable');await stage(p,21,'강');await p.evaluate(()=>window.testApp.stopClock());
  counts[side]=await multiplicity(p);if(side==='after')await assertCounts(p,0);
  await shot(p,side+'-stage21');
  await p.evaluate(()=>{const a=window.testApp;a.elapsedMs=10000;a.startClock(true);a.stopClock();const t=a.alphabetTiles.find(t=>t.transform||t.shape);document.querySelector(`[data-tile-id="${t.id}"]`).click();a.stopClock();});
  await shot(p,side+'-mistake');
  if(side==='after'){
   await p.waitForTimeout(550);assert.equal(await p.locator('#screen-game').evaluate(e=>e.classList.contains('is-mistake-feedback')),false);
   // Verify tier boundaries in all three live UI paths, not just the pure board builders.
   for(const mode of ['alphabet','syllable','word']){
    await select(p,mode);
    for(const [number,extra] of [[1,2],[10,2],[11,1],[20,1],[21,0],[100,0]]){await stage(p,number);await assertCounts(p,extra);}
    // Pause, menu and browser restart cannot reset the scarcity tier.
    await stage(p,21);await p.evaluate(()=>{const a=window.testApp;a.pauseGame();a.resumeGame();a.saveProgress();});
    await p.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await p.close();p=await open(mode);await assertCounts(p,0);
    assert.ok(await p.evaluate(()=>window.testApp.elapsedMs<1500));
    // Complete stage20 via real buttons and verify that stage21 loses the last spare.
    await stage(p,20);await p.evaluate(async()=>{
     const a=window.testApp;const {requiredBoardSymbols}=await import('/src/core/hangul/target.ts');
     const seq=a.mode==='word'?requiredBoardSymbols(a.wordTarget.word):a.learningStage.sequence;
     for(const value of seq){const t=(a.mode==='word'?a.tiles:a.alphabetTiles).find(t=>!a.used.has(t.id)&&!t.transform&&!t.shape&&(t.value??t.symbol)===value);document.querySelector(`[data-tile-id="${t.id}"]`).click();}
    });
    await p.waitForTimeout(480);await assertCounts(p,0);assert.equal(await p.evaluate(()=>window.testApp.roundUnits),1);
   }
   // Scarcity does not change any tutorial's existing board policy or add time penalties.
   await select(p,'alphabet');await p.evaluate(()=>{const a=window.testApp;a.alphabetStageIndex=0;a.beginRound();a.loadAlphabetStage();a.startClock();});
   await assertCounts(p,0);await p.evaluate(()=>{const a=window.testApp;const t=a.alphabetTiles.find(t=>t.transform);document.querySelector(`[data-tile-id="${t.id}"]`).click();});
   assert.equal(await p.locator('#screen-game').evaluate(e=>e.classList.contains('is-mistake-feedback')),false);
   assert.equal(await p.evaluate(()=>window.testApp.elapsedMs),0);
   await stage(p,21);await p.emulateMedia({reducedMotion:'reduce'});
   const feedback=await p.evaluate(()=>{
    const a=window.testApp;const before=performance.now()-a.startedAt;const t=a.alphabetTiles.find(t=>t.transform||t.shape);
    document.querySelector(`[data-tile-id="${t.id}"]`).click();
    return {difference:a.elapsedMs-before,tint:getComputedStyle(a.game,'::after').opacity,shake:getComputedStyle(a.board).animationName,pointer:getComputedStyle(a.game,'::after').pointerEvents};
   });
   assert.ok(feedback.difference>=1000&&feedback.difference<1150);assert.equal(feedback.tint,'1');assert.equal(feedback.shake,'none');assert.equal(feedback.pointer,'none');
   await p.evaluate(()=>window.testApp.pauseGame());assert.equal(await p.locator('#screen-game').evaluate(e=>e.classList.contains('is-mistake-feedback')),false);
   await p.emulateMedia({reducedMotion:'no-preference'});await p.evaluate(()=>window.testApp.resumeGame());
   const mash=await p.evaluate(()=>{
    const a=window.testApp;const before=performance.now()-a.startedAt;const t=a.alphabetTiles.find(t=>t.transform||t.shape);
    for(let i=0;i<4;i++)document.querySelector(`[data-tile-id="${t.id}"]`).click();
    return a.elapsedMs-before;
   });assert.ok(mash>=4000&&mash<4150);
   await p.evaluate(()=>{const a=window.testApp;a.startedAt=performance.now()-59500;const t=a.alphabetTiles.find(t=>t.transform||t.shape);document.querySelector(`[data-tile-id="${t.id}"]`).click();});
   assert.equal(await p.evaluate(()=>window.testApp.roundEnded),true);
   assert.equal(await p.locator('#screen-game').evaluate(e=>e.classList.contains('is-mistake-feedback')),false);
   assert.equal(await p.locator('#letter-board button:not(:disabled)').count(),0);
   console.log('PASS all three UI tiers/boundaries, completion with unique buttons, resume/menu/pause, tutorial unchanged, penalty/feedback cleanup, reduced motion and input-transparent overlay');
  }
  assert.deepEqual(errors,[]);await p.close();
 }finally{await context.close();await server.close();}
}}
finally{await browser.close();}
for(const name of files){const png=fs.readFileSync(out+name+'.png');assert.equal(png.readUInt32BE(16),780);assert.equal(png.readUInt32BE(20),1688);}
console.log(JSON.stringify(counts));console.log('PASS screenshots 780×1688 PNG');
