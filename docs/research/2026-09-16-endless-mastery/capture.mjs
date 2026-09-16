import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = new URL('./', import.meta.url).pathname;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-mastery-before-'));
execFileSync('tar', ['-xf', '-', '-C', tmp], { input: execFileSync('git', ['archive', '5fbb471'], {maxBuffer:512*1024*1024}) });
fs.symlinkSync(path.join(process.cwd(),'node_modules'),path.join(tmp,'node_modules'),'dir');
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
 for (const side of (process.env.AFTER_ONLY ? ['after'] : ['before','after'])) {
  const root = fs.realpathSync(side === 'before' ? tmp : process.cwd());
  const server = await createServer({root,configFile:false,server:{fs:{allow:[root,process.cwd()]},port:5198,host:'127.0.0.1',strictPort:true},logLevel:'error'});
  await server.listen();
  const context = await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  try {
   const page = await context.newPage();
   // Test harness exposes the real instance, without altering either repository.
   await page.route('**/src/main.ts',async route=>{
    const response=await route.fetch(); const body=(await response.text()).replace('new TalkApp();','window.testApp = new TalkApp();');
    await route.fulfill({response,body});
   });
   await page.addInitScript(()=>{let seed=123;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);});
   await page.goto('http://127.0.0.1:5198');
   await page.locator('#mode-syllable').waitFor({state:'visible'});
   await page.locator('#mode-syllable').click();await page.locator('#btn-alphabet-start').click();
   await page.evaluate(async()=>{
    const {requiredBoardSymbols}=await import('/src/core/hangul/target.ts');
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    window.solve=async()=>{
     const text=document.querySelector('#target-text .target-korean').textContent;
     for(const value of requiredBoardSymbols(text)) {
      const b=[...document.querySelectorAll('#letter-board button:not(:disabled)')].find(b=>b.getAttribute('aria-label')===(value==='ㆍ'?'Cheonjiin dot':value)&&!/(rotate|flip|--shape|stem)/.test(b.className));
      if(!b)throw Error('Missing '+value);b.click();
     }
     await wait(440);
    };
    window.continueVideo=()=>{
     document.getElementById('cheer-clip').dispatchEvent(new Event('ended'));
     document.getElementById('cheer').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
    };
    for(let i=0;i<30;i++){await window.solve();if(i===4||i===29)window.continueVideo();}
    for(let i=0;i<15;i++)await window.solve();
    if(window.testApp.roundUnits!==15)throw Error('Expected 15 completed');
    // Expire the real round clock after the same number of real correct inputs.
    window.testApp.startedAt=performance.now()-60001;
   });
   await page.waitForTimeout(250);
   await page.screenshot({path:output+side+'-15-score.png'});
   await page.waitForTimeout(2000);
   await page.screenshot({path:output+side+'-15-grade.png'});
   if(side==='after'){
    await page.evaluate(()=>window.continueVideo());
    assert.equal(await page.evaluate(()=>window.testApp.syllableDifficulty),1);
    assert.equal(await page.locator('#letter-board button').evaluateAll(bs=>bs.filter(b=>/(rotate|flip|--shape|stem)/.test(b.className)).length),19);
    await page.screenshot({path:output+'after-challenge.png'});
    await page.evaluate(async()=>{for(let i=0;i<15;i++)await window.solve();window.testApp.startedAt=performance.now()-60001;});
    await page.waitForTimeout(2300);await page.evaluate(()=>window.continueVideo());
    assert.equal(await page.evaluate(()=>window.testApp.syllableDifficulty),2);
    const swapped=await page.evaluate(()=>{
     const app=window.testApp; app.stopClock();
     const ids=()=>[...document.querySelectorAll('#letter-board button')].map(b=>b.dataset.tileId);
     const before=ids();app.windows.update(6180);
     const part=app.alphabetPartIndex;
     document.querySelector('#letter-board button:not(:disabled)').click();
     if(app.alphabetPartIndex!==part)throw Error('Accepted covered input');
     app.elapsedMs=6400;app.startClock(true);app.stopClock();
     return {before,after:ids()};
    });
    assert.equal(swapped.before.filter((id,i)=>id!==swapped.after[i]).length,2);
    console.log('window state',await page.evaluate(()=>({elapsed:window.testApp.elapsedMs,busy:window.testApp.windows.busy,doors:document.querySelectorAll('.is-swap-door').length})));
    assert.equal(await page.locator('.is-swap-door').count(),2);
    await page.screenshot({path:output+'after-windows-closed.png'});
    await page.evaluate(()=>{const app=window.testApp;app.elapsedMs=6840;app.startClock(true);app.stopClock();});
    assert.equal(await page.locator('.is-swap-door').count(),0);
    await page.screenshot({path:output+'after-windows-open.png'});
    await page.evaluate(()=>{window.testApp.pauseGame();});
    assert.equal(await page.evaluate(()=>window.testApp.paused),true);
    await page.evaluate(()=>{window.testApp.resumeGame();window.testApp.showTitle();window.testApp.showAlphabetIntro('syllable');window.testApp.startAlphabetJourney();});
    assert.equal(await page.evaluate(()=>window.testApp.syllableDifficulty),0);
   }
   console.log(side,'verified');
  } finally {await context.close();await server.close();}
 }
 for(const file of fs.readdirSync(output).filter(f=>f.endsWith('.png'))){
  const png=fs.readFileSync(path.join(output,file));assert.equal(png.readUInt32BE(16),780);assert.equal(png.readUInt32BE(20),1688);
 }
}finally{await browser.close();}
