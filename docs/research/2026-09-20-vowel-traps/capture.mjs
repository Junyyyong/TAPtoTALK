import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=new URL('./',import.meta.url).pathname,tmp=fs.mkdtempSync(path.join(os.tmpdir(),'talk-dot-'));
execFileSync('tar',['-xf','-','-C',tmp],{input:execFileSync('git',['archive','2e99c8a'],{maxBuffer:512*1024*1024})});fs.symlinkSync(path.join(process.cwd(),'node_modules'),path.join(tmp,'node_modules'),'dir');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const sizes=[];
try {for(const side of ['before','after']) {
 const root=fs.realpathSync(side==='before'?tmp:process.cwd()),server=await createServer({root,configFile:false,server:{fs:{allow:[root,process.cwd()]},port:5198,host:'127.0.0.1'},logLevel:'error'});await server.listen();
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 try {
  const page=await context.newPage();
  await page.route('**/src/main.ts',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('new TalkApp();','window.testApp=new TalkApp();')});});
  await page.addInitScript(()=>{let seed=123;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);});
  await page.goto('http://127.0.0.1:5198');await page.locator('#mode-alphabet').waitFor({state:'visible'});await page.locator('#mode-alphabet').click();await page.locator('#btn-alphabet-start').click();
  await page.evaluate(()=>{const a=window.testApp;a.alphabetStageIndex=18;a.beginRound();a.loadAlphabetStage();a.stopClock();return document.fonts.ready;});
  await page.evaluate(()=>{const a=window.testApp;a.alphabetStageIndex=14;a.beginRound();a.loadAlphabetStage();a.stopClock();});
  await page.screenshot({path:out+`${side}-dot.png`});
  await page.evaluate(()=>{const a=window.testApp;a.alphabetStageIndex=7;a.beginRound();a.loadAlphabetStage();a.stopClock();});
  await page.screenshot({path:out+`${side}-ieung.png`});
  await page.evaluate(()=>{window.testApp.startWordJourney();window.testApp.stopClock();});
  if(side==='after') {
    const shapes=await page.evaluate(()=>window.testApp.tiles.filter(t=>t.shape).map(t=>t.shape));
    assert.equal(shapes.length,5);
    await page.evaluate(()=>{const a=window.testApp;const t=a.tiles.find(t=>t.shape);document.querySelector('[data-tile-id="'+t.id+'"]').click();if(a.input.at(-1).value!=='×')throw Error('Trap accepted');a.backspace();if(a.input.length)throw Error('Delete failed');});
  }
  await page.screenshot({path:out+`${side}-word.png`});
 } finally {await context.close();await server.close();}
}
for(const file of ['before-dot.png','after-dot.png','before-ieung.png','after-ieung.png','before-word.png','after-word.png']) {const p=fs.readFileSync(out+file);assert.equal(p.readUInt32BE(16),780);assert.equal(p.readUInt32BE(20),1688);}} finally {await browser.close();}
