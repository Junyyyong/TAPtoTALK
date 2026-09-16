import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=new URL('./',import.meta.url).pathname;
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'talk-intro-score-'));
execFileSync('tar',['-xf','-','-C',tmp],{input:execFileSync('git',['archive','7f715fb'],{maxBuffer:512*1024*1024})});
fs.symlinkSync(path.join(process.cwd(),'node_modules'),path.join(tmp,'node_modules'),'dir');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
 for(const side of ['before','after']) {
  const root=fs.realpathSync(side==='before'?tmp:process.cwd());
  const server=await createServer({root,configFile:false,server:{fs:{allow:[root,process.cwd()]},port:5198,host:'127.0.0.1'},logLevel:'error'});
  await server.listen();
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  try {
   const page=await context.newPage();
   await page.route('**/src/main.ts',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('new TalkApp();','window.testApp=new TalkApp();')});});
   await page.addInitScript(()=>{let seed=123;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);});
   const styles={};
   for(const mode of ['alphabet','syllable','word']) {
    await page.goto('http://127.0.0.1:5198');
    await page.locator(`#mode-${mode}`).waitFor({state:'visible'});
    const description=await page.locator(`#mode-${mode} .mode-desc`).innerText();
    await page.locator(`#mode-${mode}`).click();
    await page.evaluate(()=>document.fonts.ready);
    if(side==='after') {
     assert.equal(await page.locator('#learning-intro-description').innerText(),description);
     assert.equal(await page.locator('#learning-intro-description').evaluate(e=>getComputedStyle(e).fontSize),'14px');
     const gap=await page.evaluate(()=>document.querySelector('#learning-intro-description').getBoundingClientRect().top-document.querySelector('#learning-intro-mark').getBoundingClientRect().bottom);
     assert.equal(gap,16);
    }
    await page.screenshot({path:out+`${side}-intro-${mode}.png`});
    await page.locator('#btn-alphabet-start').click();
    await page.evaluate(()=>window.testApp.stopClock());
    if(mode!=='alphabet') {
     styles[mode]=await page.locator('.syllable-taps').evaluate(e=>{const s=getComputedStyle(e);return {fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight};});
     await page.screenshot({path:out+`${side}-hints-${mode}.png`});
    }
   }
   console.log(side,styles);
   if(side==='after')assert.deepEqual(styles.word,styles.syllable);
  } finally {await context.close();await server.close();}
 }
 for(const name of fs.readdirSync(out).filter(n=>n.endsWith('.png'))) {
  const p=fs.readFileSync(out+name);assert.equal(p.readUInt32BE(16),780);assert.equal(p.readUInt32BE(20),1688);
 }
} finally {await browser.close();}
