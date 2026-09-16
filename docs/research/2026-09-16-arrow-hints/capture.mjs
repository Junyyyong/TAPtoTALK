import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out=new URL('./',import.meta.url).pathname;
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'talk-arrows-'));
execFileSync('tar',['-xf','-','-C',tmp],{input:execFileSync('git',['archive','8b07881'],{maxBuffer:512*1024*1024})});
fs.symlinkSync(path.join(process.cwd(),'node_modules'),path.join(tmp,'node_modules'),'dir');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
 for(const side of ['before','after']) {
  const root=fs.realpathSync(side==='before'?tmp:process.cwd());
  const server=await createServer({root,configFile:false,server:{fs:{allow:[root,process.cwd()]},port:5198,host:'127.0.0.1'},logLevel:'error'});await server.listen();
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  try {
   const page=await context.newPage();
   await page.route('**/src/main.ts',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('new TalkApp();','window.testApp=new TalkApp();')});});
   await page.addInitScript(()=>{let seed=123;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);});
   await page.goto('http://127.0.0.1:5198');await page.locator('#mode-alphabet').waitFor({state:'visible'});
   await page.locator('#mode-alphabet').click();await page.locator('#btn-alphabet-start').click();
   for(const mode of ['alphabet','syllable','word']) {
    await page.evaluate(async mode=>{
     const app=window.testApp;
     if(mode==='word') {
      const {WORD_TARGETS}=await import('/src/content/prompts.ts');const {createWordBoard}=await import('/src/core/hangul/board.ts');
      app.startWord();app.wordTarget=WORD_TARGETS.find(t=>t.word==='나비');app.input=[{value:'ㄴ'}];app.used.clear();
      app.tiles=createWordBoard(app.wordTarget.word);app.renderTranslatedTarget();app.renderBoard();app.renderInput();
     } else {
      app.introMode=mode;app.startAlphabetJourney();
      if(mode==='alphabet')app.alphabetStageIndex=17;
      else {const {SYLLABLE_STAGES}=await import('/src/content/learningJourney.ts');app.syllablePractice=[SYLLABLE_STAGES.find(s=>s.target==='바')];app.alphabetStageIndex=0;}
      app.loadAlphabetStage();app.alphabetPartIndex=1;app.renderAlphabetTarget();
     }
     app.stopClock();
    },mode);
    await page.evaluate(()=>document.fonts.ready);
    if(side==='after') {
     const selector=mode==='alphabet'?'.alphabet-target-jamo.is-current':'.syllable-tap.is-current';
     const style=await page.locator(selector).evaluate(n=>({background:getComputedStyle(n).backgroundColor,line:getComputedStyle(n).textDecorationLine}));
     assert.equal(style.background,'rgba(0, 0, 0, 0)');assert.equal(style.line,'none');
     assert.ok(await page.locator('.tap-arrow').count()>0);
     if(mode==='word') {
      const current=()=>page.locator('.vocabulary-taps .is-current').getAttribute('aria-label');
      assert.equal(await current(),'ㅣ');
      await page.evaluate(()=>{window.testApp.input.push({value:'×'});window.testApp.renderInput();});assert.equal(await current(),'ㅣ');
      await page.evaluate(()=>{window.testApp.input.pop();window.testApp.input.pop();window.testApp.renderInput();});assert.equal(await current(),'ㄴ');
      await page.evaluate(()=>{window.testApp.input.push({value:'ㄴ'});window.testApp.renderInput();});
     }
    }
    await page.screenshot({path:out+`${side}-${mode}.png`});
   }
   console.log(side,'three modes verified');
  } finally {await context.close();await server.close();}
 }
 for(const file of fs.readdirSync(out).filter(f=>f.endsWith('.png'))) {const p=fs.readFileSync(out+file);assert.equal(p.readUInt32BE(16),780);assert.equal(p.readUInt32BE(20),1688);}
} finally {await browser.close();}
