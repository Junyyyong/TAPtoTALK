import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out=new URL('./',import.meta.url).pathname;
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'talk-labels-before-'));
execFileSync('tar',['-xf','-','-C',tmp],{input:execFileSync('git',['archive','494c30f'],{maxBuffer:512*1024*1024})});
fs.symlinkSync(path.join(process.cwd(),'node_modules'),path.join(tmp,'node_modules'),'dir');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
 for(const side of ['before','after']){
  const root=fs.realpathSync(side==='before'?tmp:process.cwd());
  const server=await createServer({root,configFile:false,server:{fs:{allow:[root,process.cwd()]},port:5198,host:'127.0.0.1'},logLevel:'error'});await server.listen();
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  try{
   const page=await context.newPage();
   await page.route('**/src/main.ts',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('new TalkApp();','window.testApp=new TalkApp();')});});
   await page.addInitScript(()=>{let seed=123;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);});
   await page.goto('http://127.0.0.1:5198');await page.locator('#mode-alphabet').waitFor({state:'visible'});
   await page.locator('#mode-alphabet').click();await page.locator('#btn-alphabet-start').click();
   for(const [name,index] of [['consonant',0],['vowel',14],['group-4',17],['group-6',23],['endless-8',27]]){
    await page.evaluate(index=>{const app=window.testApp;app.alphabetStageIndex=index;app.beginRound();app.loadAlphabetStage();app.stopClock();},index);
    await page.evaluate(()=>document.fonts.ready);
    if(side==='after'){
     assert.equal(await page.locator('.alphabet-target-note').isVisible(),index<23);
     assert.doesNotMatch(await page.locator('#target-hint').innerText(),/[0-9×]/);
     assert.doesNotMatch(await page.locator('#target-label').innerText(),/PRACTICE|ROUND|×/);
    }
    if(name!=='endless-8')await page.screenshot({path:out+`${side}-${name}.png`});
   }
   await page.evaluate(async()=>{
    const {SYLLABLE_STAGES}=await import('/src/content/learningJourney.ts');
    const app=window.testApp;app.introMode='syllable';app.startAlphabetJourney();
    // Preview the real existing 바 lesson from each revision, not a fabricated target.
    app.syllablePractice=[SYLLABLE_STAGES.find(s=>s.target==='바')];
    app.alphabetStageIndex=0;app.beginRound();app.loadAlphabetStage();
    for(const value of ['ㅂ','ㅣ'])document.querySelector(`#letter-board button[aria-label="${value}"]:not(:disabled)`).click();
   });
   if(side==='after'){
    assert.equal(await page.locator('.syllable-target-note').innerText(),'[ba/va]');
    const dot=await page.locator('.syllable-tap.is-cheonjiin').evaluate(node=>{
     const css=getComputedStyle(node,'::before');return {width:parseFloat(css.width),height:parseFloat(css.height),underline:getComputedStyle(node).textDecorationLine};
    });
    assert.ok(dot.width<8&&dot.width>4);assert.equal(dot.width,dot.height);assert.equal(dot.underline,'none');
   }
   await page.screenshot({path:out+`${side}-syllable.png`});
   console.log(side,'labels and dot verified');
  }finally{await context.close();await server.close();}
 }
 for(const file of fs.readdirSync(out).filter(f=>f.endsWith('.png'))){const png=fs.readFileSync(out+file);assert.equal(png.readUInt32BE(16),780);assert.equal(png.readUInt32BE(20),1688);}
}finally{await browser.close();}
