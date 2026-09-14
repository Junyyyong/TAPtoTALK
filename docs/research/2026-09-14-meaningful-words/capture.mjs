import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.CAPTURE_OUTPUT || new URL('./', import.meta.url).pathname;
fs.mkdirSync(output, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'talk-vocabulary-before-'));
execFileSync('tar',['-xf','-','-C',tmp],{input:execFileSync('git',['archive',process.env.BEFORE_REVISION || 'f15212e'],{maxBuffer:512*1024*1024})});
fs.symlinkSync(path.join(process.cwd(),'node_modules'),path.join(tmp,'node_modules'),'dir');
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
 for(const side of ['before','after']) {
  const root = fs.realpathSync(side==='before'?tmp:process.cwd());
  const server = await createServer({root,configFile:false,server:{fs:{allow:[root,process.cwd()]},port:5198,host:'127.0.0.1',strictPort:true},logLevel:'error'});await server.listen();
  const context = await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  try {
   const page = await context.newPage();
   await page.addInitScript(()=>{let seed=123;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);});
   await page.goto('http://127.0.0.1:5198');await page.locator('#mode-syllable').waitFor({state:'visible'});
   await page.locator('#mode-syllable').click();await page.locator('#btn-alphabet-start').click();
   await page.evaluate(async()=>{
    const {requiredBoardSymbols}=await import('/src/core/hangul/target.ts');
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    for(let i=0;i<30;i++) {
     const text=document.querySelector('#target-text .target-korean').textContent;
     for(const value of requiredBoardSymbols(text)) {
      const b=[...document.querySelectorAll('#letter-board button:not(:disabled)')].find(b=>b.getAttribute('aria-label')===(value==='ㆍ'?'Cheonjiin dot':value)&&!/(rotate|flip|--shape|stem)/.test(b.className));
      if(!b)throw Error('Missing '+value);b.click();
     }
     if(i===4||i===29){await wait(100);document.getElementById('cheer-clip').dispatchEvent(new Event('ended'));document.getElementById('cheer').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));}
     else await wait(440);
    }
    await document.fonts.ready;
   });
   await page.screenshot({path:output+side+'-main.png'});
   const png=fs.readFileSync(output+side+'-main.png');assert.equal(png.readUInt32BE(16),780);assert.equal(png.readUInt32BE(20),1688);
   console.log(side,await page.locator('#target-text').innerText());
  }finally{await context.close();await server.close();}
 }
}finally{await browser.close();}
