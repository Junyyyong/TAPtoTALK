import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out=new URL('./',import.meta.url).pathname;
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'talk-word-hints-'));
execFileSync('tar',['-xf','-','-C',tmp],{input:execFileSync('git',['archive','33f0f17'],{maxBuffer:512*1024*1024})});
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
   await page.goto('http://127.0.0.1:5198');await page.locator('#mode-word').waitFor({state:'visible'});
   await page.locator('#mode-word').click();await page.locator('#btn-alphabet-start').click();
   for(const name of ['butterfly','long-word']) {
    const expected=await page.evaluate(async name=>{
     const {WORD_TARGETS}=await import('/src/content/prompts.ts');
     const {EXTRA_WORDS}=await import('/src/content/wordJourney.ts');
     const {createWordBoard}=await import('/src/core/hangul/board.ts');
     const {requiredBoardSymbols}=await import('/src/core/hangul/target.ts');
     const target=name==='butterfly'?WORD_TARGETS.find(t=>t.word==='나비'):EXTRA_WORDS[5][0];
     const app=window.testApp;app.stopClock();app.wordTarget=target;app.input=[];app.used.clear();
     app.tiles=createWordBoard(target.word);app.renderTranslatedTarget();app.renderBoard();app.renderInput();
     return requiredBoardSymbols(target.word);
    },name);
    await page.evaluate(()=>document.fonts.ready);
    if(side==='after') {
     assert.equal(await page.locator('#target-label').innerText(),'STAGE');
     assert.deepEqual(await page.locator('.vocabulary-taps > span').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label'))),expected);
     if(name==='butterfly')assert.deepEqual(expected,['ㄴ','ㅣ','ㆍ','ㅂ','ㅣ']);
     const board=await page.locator('#letter-board').boundingBox();assert.ok(Math.abs(board.width-board.height)<1);
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    await page.screenshot({path:out+`${side}-${name}.png`});
   }
   console.log(side,'Vocabulary verified');
  } finally {await context.close();await server.close();}
 }
 for(const file of fs.readdirSync(out).filter(f=>f.endsWith('.png'))) {
  const png=fs.readFileSync(out+file);assert.equal(png.readUInt32BE(16),780);assert.equal(png.readUInt32BE(20),1688);
 }
} finally {await browser.close();}
