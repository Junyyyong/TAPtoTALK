import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out=new URL('./',import.meta.url).pathname;
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'talk-remove-windows-'));
execFileSync('tar',['-xf','-','-C',tmp],{input:execFileSync('git',['archive','b098a33'],{maxBuffer:512*1024*1024})});
fs.symlinkSync(path.join(process.cwd(),'node_modules'),path.join(tmp,'node_modules'),'dir');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
 for(const side of ['before','after']){
  const root=fs.realpathSync(side==='before'?tmp:process.cwd());
  const server=await createServer({root,configFile:false,server:{fs:{allow:[root,process.cwd()]},port:5198,host:'127.0.0.1'},logLevel:'error'});await server.listen();
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  try{
   const page=await context.newPage();
   await page.route('**/src/main.ts',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('new TalkApp();','window.testApp=new TalkApp();')});});
   await page.addInitScript(()=>{let seed=123;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);});
   await page.goto('http://127.0.0.1:5198');await page.locator('#mode-syllable').waitFor({state:'visible'});
   await page.locator('#mode-syllable').click();await page.locator('#btn-alphabet-start').click();
   await page.evaluate(async()=>{
    const {requiredBoardSymbols}=await import('/src/core/hangul/target.ts');
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const next=()=>{document.getElementById('cheer-clip').dispatchEvent(new Event('ended'));document.getElementById('cheer').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));};
    const solve=async()=>{
     const word=document.querySelector('#target-text .target-korean').textContent;
     for(const value of requiredBoardSymbols(word)){
      const label=value==='ㆍ'?'Cheonjiin dot':value;
      const button=[...document.querySelectorAll('#letter-board button:not(:disabled)')].find(b=>b.getAttribute('aria-label')===label);
      if(!button)throw Error('Missing '+value);button.click();
     }await wait(440);
    };
    for(let i=0;i<30;i++){await solve();if(i===4||i===29)next();}
    for(let round=0;round<2;round++){
     for(let i=0;i<15;i++)await solve();
     if(window.testApp.roundUnits!==15)throw Error('Expected fifteen correct targets');
     window.testApp.startedAt=performance.now()-60001;await wait(2300);next();
    }
    const app=window.testApp;app.stopClock();
    window.beforeIds=[...document.querySelectorAll('#letter-board button')].map(b=>b.dataset.tileId);
    for(const elapsed of [6180,6400]){app.elapsedMs=elapsed;app.startClock(true);app.stopClock();}
    await document.fonts.ready;
   });
   const result=await page.evaluate(()=>({tier:window.testApp.syllableDifficulty,doors:document.querySelectorAll('.is-swap-door').length,
    changed:[...document.querySelectorAll('#letter-board button')].filter((b,i)=>b.dataset.tileId!==window.beforeIds[i]).length}));
   assert.deepEqual(result,side==='before'?{tier:2,doors:2,changed:2}:{tier:1,doors:0,changed:0});
   await page.screenshot({path:out+side+'.png'});
   const png=fs.readFileSync(out+side+'.png');assert.equal(png.readUInt32BE(16),780);assert.equal(png.readUInt32BE(20),1688);
   console.log(side,result);
  }finally{await context.close();await server.close();}
 }
}finally{await browser.close();}
