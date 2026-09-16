import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out=new URL('./',import.meta.url).pathname;
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'talk-writing-stage-'));
execFileSync('tar',['-xf','-','-C',tmp],{input:execFileSync('git',['archive','038b7ff'],{maxBuffer:512*1024*1024})});
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
   await page.goto('http://127.0.0.1:5198');await page.locator('#mode-syllable').waitFor({state:'visible'});
   await page.locator('#mode-syllable').click();await page.locator('#btn-alphabet-start').click();
   // Real lesson, checkpoint after the first consonant. No simulated board usage.
   await page.evaluate(async()=>{
    const {SYLLABLE_STAGES}=await import('/src/content/learningJourney.ts');const app=window.testApp;
    app.syllablePractice=[SYLLABLE_STAGES.find(s=>s.target==='바')];app.alphabetStageIndex=0;app.loadAlphabetStage();
    app.alphabetPartIndex=1;app.renderAlphabetTarget();app.stopClock();
   });
   await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('#typed-text').isVisible(),side==='before');
   await page.screenshot({path:out+`${side}-syllable.png`});
   await page.evaluate(()=>{const app=window.testApp;app.startWordJourney();app.stopClock();});
   assert.equal(await page.locator('#typed-text').isVisible(),true);
   if(side==='after')assert.equal(await page.locator('#target-label').innerText(),'STAGE 1');
   await page.evaluate(()=>{window.testApp.startNextWord();window.testApp.stopClock();});
   if(side==='after') {
    assert.equal(await page.locator('#target-label').innerText(),'STAGE 2');
    await page.evaluate(()=>{window.testApp.roundNumber=3;window.testApp.renderTranslatedTarget();});
    assert.equal(await page.locator('#target-label').innerText(),'STAGE 2');
   }
   await page.screenshot({path:out+`${side}-word.png`});
   if(side==='after') {
    await page.evaluate(()=>window.testApp.startNextWord());assert.equal(await page.locator('#target-label').innerText(),'STAGE 3');
    await page.evaluate(()=>{window.testApp.startWordJourney();window.testApp.stopClock();});assert.equal(await page.locator('#target-label').innerText(),'STAGE 1');
   }
   console.log(side,'writing visibility and stage checks passed');
  } finally {await context.close();await server.close();}
 }
 for(const file of fs.readdirSync(out).filter(f=>f.endsWith('.png'))) {const p=fs.readFileSync(out+file);assert.equal(p.readUInt32BE(16),780);assert.equal(p.readUInt32BE(20),1688);}
} finally {await browser.close();}
