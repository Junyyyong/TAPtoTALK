import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=new URL('./',import.meta.url).pathname;
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'talk-checkpoints-'));
execFileSync('tar',['-xf','-','-C',tmp],{input:execFileSync('git',['archive','f152899'],{maxBuffer:512*1024*1024})});
fs.symlinkSync(path.join(process.cwd(),'node_modules'),path.join(tmp,'node_modules'),'dir');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const options={viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true};
let legacyState, legacyWord;
const files=[];
try {for(const side of ['before','after']){
 const root=fs.realpathSync(side==='before'?tmp:process.cwd());
 const server=await createServer({root,configFile:false,server:{fs:{allow:[root,process.cwd()]},port:5198,strictPort:true,host:'127.0.0.1'},logLevel:'error'});
 await server.listen();
 const context=await browser.newContext({...options,...(side==='after'?{storageState:legacyState}:{})});
 const errors=[];
 context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 await context.route('**/src/main.ts',async route=>{
  const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('new TalkApp();','window.testApp=new TalkApp();')});
 });
 await context.addInitScript(()=>{let seed=123;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);});
 async function open(mode){
  const p=await context.newPage();await p.goto('http://127.0.0.1:5198');
  await p.locator('#mode-'+mode).waitFor({state:'visible'});await p.locator('#mode-'+mode).click();await p.locator('#btn-alphabet-start').click();
  await p.evaluate(()=>document.fonts.ready);return p;
 }
 async function select(p,mode){await p.evaluate(()=>window.testApp.showTitle());await p.locator('#mode-'+mode).click();await p.locator('#btn-alphabet-start').click();}
 async function restart(p,mode){await p.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await p.close();return open(mode);}
 async function shot(p,name){files.push(name);await p.screenshot({path:out+name+'.png'});}
 async function fresh(p){assert.ok(await p.evaluate(()=>window.testApp.elapsedMs<1500));assert.equal(await p.evaluate(()=>window.testApp.roundUnits),0);}
 try {
  let p=await open('word');
  if(side==='before'){
   legacyWord=await p.evaluate(()=>{
    const a=window.testApp;for(let i=0;i<9;i++)a.startNextWord();
    a.roundUnits=3;a.elapsedMs=25000;a.startClock(true);
    const t=a.tiles.find(t=>t.required&&!t.transform&&!t.shape);document.querySelector(`[data-tile-id="${t.id}"]`).click();a.saveProgress();
    return a.wordTarget;
   });
   legacyState=await context.storageState();p=await restart(p,'word');
   assert.equal(await p.evaluate(()=>window.testApp.roundUnits),3);
   assert.ok(await p.evaluate(()=>window.testApp.elapsedMs>=25000));
  }else{
   await fresh(p);assert.deepEqual(await p.evaluate(()=>window.testApp.wordTarget),legacyWord);
   assert.equal(await p.evaluate(()=>window.testApp.wordTargetIndex),9);
   assert.deepEqual(await p.evaluate(()=>window.testApp.input),[]);
   console.log('PASS legacy web save → updated app: same word/stage, fresh minute/score/input');
  }
  await p.evaluate(()=>window.testApp.stopClock());await shot(p,side+'-resume');
  await select(p,'alphabet');
  await p.evaluate(()=>{
   let seed=456;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
   const a=window.testApp;a.alphabetStageIndex=27;a.beginRound();a.loadAlphabetStage();a.elapsedMs=20000;a.startClock(true);a.stopClock();
  });
  const difference=await p.evaluate(()=>{
   const a=window.testApp;const before=a.elapsedMs;
   const t=a.alphabetTiles.find(t=>t.transform||t.shape);document.querySelector(`[data-tile-id="${t.id}"]`).click();a.stopClock();
   return a.elapsedMs-before;
  });
  assert.ok(side==='after'?difference>=1000&&difference<1400:difference<400);
  await shot(p,side+'-penalty');
  if(side==='after'){
   // Repeated wrong choices cost exactly 1s each; correct/used/paused picks do not.
   const penalty=await p.evaluate(()=>{
    const a=window.testApp;const start=a.elapsedMs;
    const trap=a.alphabetTiles.find(t=>t.transform||t.shape);
    for(let i=0;i<3;i++)document.querySelector(`[data-tile-id="${trap.id}"]`).click();
    const three=a.elapsedMs-start;
    const t=a.alphabetTiles.find(t=>!t.shape&&!t.transform&&t.value===a.learningStage.sequence[0]);
    document.querySelector(`[data-tile-id="${t.id}"]`).click();const correct=a.elapsedMs;
    document.querySelector(`[data-tile-id="${t.id}"]`).click();a.pauseGame();
    document.querySelector(`[data-tile-id="${trap.id}"]`).click();
    return {three,correct,paused:a.elapsedMs};
   });
   assert.ok(penalty.three>=3000&&penalty.three<3200);assert.ok(penalty.paused-penalty.correct<100);
   await p.evaluate(()=>window.testApp.resumeGame());
   const target=await p.evaluate(()=>{const a=window.testApp;a.saveProgress();return a.learningStage.target;});
   p=await restart(p,'alphabet');await fresh(p);
   assert.equal(await p.evaluate(()=>window.testApp.learningStage.target),target);
   assert.equal(await p.evaluate(()=>window.testApp.alphabetPartIndex),0);
   // Tutorials are free and resume at the same item, not at the beginning of a lesson.
   await p.evaluate(()=>{const a=window.testApp;a.alphabetStageIndex=9;a.beginRound();a.loadAlphabetStage();a.startClock();const t=a.alphabetTiles.find(t=>t.transform||t.shape);document.querySelector(`[data-tile-id="${t.id}"]`).click();});
   assert.equal(await p.evaluate(()=>window.testApp.elapsedMs),0);
   assert.equal(await p.locator('#time-penalty').evaluate(e=>e.classList.contains('is-visible')),false);
   p=await restart(p,'alphabet');assert.equal(await p.evaluate(()=>window.testApp.alphabetStageIndex),9);
   await select(p,'syllable');
   const lesson=await p.evaluate(()=>{
    const a=window.testApp;a.alphabetStageIndex=8;a.beginRound();a.loadAlphabetStage();a.startClock();
    const t=a.alphabetTiles.find(t=>!t.transform&&!t.shape&&t.value===a.learningStage.sequence[0]);document.querySelector(`[data-tile-id="${t.id}"]`).click();a.saveProgress();
    return {stage:a.learningStage,practice:a.syllablePractice};
   });
   p=await restart(p,'syllable');
   assert.deepEqual(await p.evaluate(()=>({stage:window.testApp.learningStage,practice:window.testApp.syllablePractice})),lesson);
   assert.equal(await p.evaluate(()=>window.testApp.alphabetPartIndex),0);
   // Completed tutorial boundary advances once, and main-game results do not replay a spent clock.
   await p.evaluate(()=>{const a=window.testApp;a.alphabetStageIndex=a.syllablePractice.length-1;a.beginRound();a.loadAlphabetStage();a.stageTransitionPending=true;a.finishRound(true);});
   p=await restart(p,'syllable');await fresh(p);
   assert.equal(await p.evaluate(()=>window.testApp.alphabetStageIndex),18);
   assert.equal(await p.evaluate(()=>window.testApp.learningStage.boardSide),6);
   await p.evaluate(()=>{const a=window.testApp;a.roundUnits=8;a.startedAt=performance.now()-60000;a.finishRound(false);});
   p=await restart(p,'syllable');await fresh(p);
   assert.equal(await p.evaluate(()=>window.testApp.roundNumber),2);
   assert.equal(await p.evaluate(()=>window.testApp.syllableDifficulty),1);
   assert.equal(await p.evaluate(()=>window.testApp.learningStage.boardSide),8);
   // Word traps and wrong jamo each cost one second. Delete and correct taps are free.
   await select(p,'word');
   const wordPenalty=await p.evaluate(()=>{
    const a=window.testApp;a.stopClock();a.startedAt=performance.now();a.elapsedMs=0;
    const t=a.tiles.find(t=>t.transform||t.shape);document.querySelector(`[data-tile-id="${t.id}"]`).click();
    const trap=a.elapsedMs;document.querySelector('#btn-backspace').click();const deletion=a.elapsedMs;
    const wrong=a.tiles.find(t=>!t.transform&&!t.shape&&t.symbol!==a.targetHint.querySelector('.syllable-tap').getAttribute('aria-label'));
    document.querySelector(`[data-tile-id="${wrong.id}"]`).click();return {trap,deletion,wrong:a.elapsedMs};
   });
   assert.ok(wordPenalty.trap>=1000&&wordPenalty.trap<1200);assert.ok(wordPenalty.deletion-wordPenalty.trap<100);assert.ok(wordPenalty.wrong-wordPenalty.deletion>=1000);
   await p.evaluate(()=>{
    const a=window.testApp;a.startedAt=performance.now()-59500;a.elapsedMs=59500;
    const t=a.tiles.find(t=>!a.used.has(t.id)&&(t.transform||t.shape));document.querySelector(`[data-tile-id="${t.id}"]`).click();
   });
   assert.equal(await p.evaluate(()=>window.testApp.roundEnded),true);
   assert.equal(await p.locator('#letter-board button:not(:disabled)').count(),0);
   p=await restart(p,'word');await fresh(p);
   // A correct answer pending its transition is never replayed on a new START.
   await p.evaluate(()=>{const a=window.testApp;a.stageTransitionPending=true;a.roundUnits=1;a.saveProgress();});
   const index=await p.evaluate(()=>window.testApp.wordTargetIndex);
   p=await restart(p,'word');assert.equal(await p.evaluate(()=>window.testApp.wordTargetIndex),index+1);await fresh(p);
   await select(p,'alphabet');assert.equal(await p.evaluate(()=>window.testApp.alphabetStageIndex),9);
   console.log('PASS independent modes, pending/result boundaries, fresh timer, preserved targets/bags, correct/used/delete/pause/tutorial exemptions, rapid misses, time-up lock');
   await p.evaluate(()=>window.testApp.showTitle());
   // Recovery via web backup; then unrecoverable corruption blocks play without overwriting data.
   await p.evaluate(()=>{localStorage.setItem('taptotalk.progress.v1.alphabet','{broken');});
   await p.reload();await p.locator('#mode-alphabet').waitFor({state:'visible'});
   assert.notEqual(await p.evaluate(()=>localStorage.getItem('taptotalk.progress.v1.alphabet')),'{broken');
   await p.evaluate(()=>{localStorage.setItem('taptotalk.progress.v1.alphabet','{broken');localStorage.removeItem('taptotalk.progress.v1.alphabet.backup');});
   await p.reload();await p.locator('#storage-notice').waitFor({state:'visible'});
   assert.equal(await p.evaluate(()=>localStorage.getItem('taptotalk.progress.v1.alphabet')),'{broken');
   assert.equal(await p.evaluate(()=>document.querySelector('#app').inert),true);
   console.log('PASS backup recovery and blocking load failure without resetting data');
  }
  assert.deepEqual(errors,[]);await p.close();
 } finally {await context.close();await server.close();}
}}
finally {await browser.close();}
for(const name of files){const png=fs.readFileSync(out+name+'.png');assert.equal(png.readUInt32BE(16),780);assert.equal(png.readUInt32BE(20),1688);}
console.log('PASS all screenshots 780×1688 PNG');
