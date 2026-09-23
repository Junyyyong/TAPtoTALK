import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=new URL('./',import.meta.url).pathname,tmp=fs.mkdtempSync(path.join(os.tmpdir(),'talk-resume-'));
execFileSync('tar',['-xf','-','-C',tmp],{input:execFileSync('git',['archive','a4f2c00'],{maxBuffer:512*1024*1024})});
fs.symlinkSync(path.join(process.cwd(),'node_modules'),path.join(tmp,'node_modules'),'dir');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {for(const side of ['before','after']){
 const root=fs.realpathSync(side==='before'?tmp:process.cwd()),server=await createServer({root,configFile:false,server:{fs:{allow:[root,process.cwd()]},port:5198,host:'127.0.0.1'},logLevel:'error'});await server.listen();
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await context.route('**/src/main.ts',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('new TalkApp();','window.testApp=new TalkApp();')});});
 await context.addInitScript(()=>{let seed=123;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);});
 async function open(mode){const p=await context.newPage();await p.goto('http://127.0.0.1:5198');await p.locator('#screen-studio-splash').waitFor({state:'visible'});await p.locator('#mode-'+mode).waitFor({state:'visible'});await p.locator('#mode-'+mode).click();await p.locator('#btn-alphabet-start').click();return p;}
 async function restart(p,mode){await p.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await p.close();return open(mode);}
 try{
  let p=await open('alphabet');
  await p.evaluate(()=>{const a=window.testApp;a.alphabetStageIndex=9;a.beginRound();a.loadAlphabetStage();a.startClock();a.saveProgress?.();});
  p=await restart(p,'alphabet');
  assert.equal(await p.evaluate(()=>window.testApp.alphabetStageIndex),side==='after'?9:0);
  await p.screenshot({path:out+side+'.png'});
  if(side==='after'){
   await p.evaluate(()=>window.testApp.showTitle());await p.locator('#mode-syllable').click();await p.locator('#btn-alphabet-start').click();
   const expected=await p.evaluate(()=>{const a=window.testApp;a.alphabetStageIndex=8;a.beginRound();a.loadAlphabetStage();a.startClock();const t=a.alphabetTiles.find(t=>!t.shape&&!t.transform&&t.value===a.learningStage.sequence[0]);document.querySelector('[data-tile-id="'+t.id+'"]').click();a.saveProgress();return {stage:a.learningStage,tiles:a.alphabetTiles,practice:a.syllablePractice,part:a.alphabetPartIndex};});
   p=await restart(p,'syllable');
   assert.deepEqual(await p.evaluate(()=>{const a=window.testApp;return {stage:a.learningStage,tiles:a.alphabetTiles,practice:a.syllablePractice,part:a.alphabetPartIndex};}),expected);
   await p.evaluate(()=>window.testApp.showTitle());await p.locator('#mode-word').click();await p.locator('#btn-alphabet-start').click();
   const word=await p.evaluate(()=>{const a=window.testApp;for(let i=0;i<9;i++)a.startNextWord();a.roundUnits=3;a.elapsedMs=25000;a.startClock(true);const t=a.tiles.find(t=>t.required);document.querySelector('[data-tile-id="'+t.id+'"]').click();a.saveProgress();return {target:a.wordTarget,input:a.input,tiles:a.tiles,index:a.wordTargetIndex};});
   p=await restart(p,'word');
   assert.deepEqual(await p.evaluate(()=>{const a=window.testApp;return {target:a.wordTarget,input:a.input,tiles:a.tiles,index:a.wordTargetIndex};}),word);
   assert.equal(await p.evaluate(()=>window.testApp.roundUnits),3);
   assert.ok(await p.evaluate(()=>window.testApp.elapsedMs>=25000&&window.testApp.elapsedMs<28000));
   // Exiting during the result must retain score/clip and advance only on continue.
   await p.evaluate(()=>{const a=window.testApp;a.roundUnits=6;a.startedAt=performance.now()-60000;a.finishRound(false);});
   p=await restart(p,'word');
   assert.equal(await p.evaluate(()=>window.testApp.roundEnded),true);
   assert.equal(await p.evaluate(()=>window.testApp.roundUnits),6);
   await p.evaluate(()=>window.testApp.cheer.done());
   assert.equal(await p.evaluate(()=>window.testApp.roundNumber),2);
   assert.equal(await p.evaluate(()=>window.testApp.roundUnits),0);
   // Independent Alphabet save remains at stage ten.
   await p.evaluate(()=>window.testApp.showTitle());await p.locator('#mode-alphabet').click();await p.locator('#btn-alphabet-start').click();
   assert.equal(await p.evaluate(()=>window.testApp.alphabetStageIndex),9);
   console.log('PASS: startup flow, all three independent saves, random practice/board/input, remaining time/score, result continuation');
  }
  await p.close();
 }finally{await context.close();await server.close();}
}for(const name of ['before','after']){const png=fs.readFileSync(out+name+'.png');assert.equal(png.readUInt32BE(16),780);assert.equal(png.readUInt32BE(20),1688);}}finally{await browser.close();}
