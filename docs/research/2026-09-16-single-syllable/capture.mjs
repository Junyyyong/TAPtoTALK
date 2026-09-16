import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=new URL('./',import.meta.url).pathname,tmp=fs.mkdtempSync(path.join(os.tmpdir(),'talk-single-syllable-'));
execFileSync('tar',['-xf','-','-C',tmp],{input:execFileSync('git',['archive','43923ed'],{maxBuffer:512*1024*1024})});fs.symlinkSync(path.join(process.cwd(),'node_modules'),path.join(tmp,'node_modules'),'dir');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {for(const side of ['before','after']) {
 const root=fs.realpathSync(side==='before'?tmp:process.cwd()),server=await createServer({root,configFile:false,server:{fs:{allow:[root,process.cwd()]},port:5198,host:'127.0.0.1'},logLevel:'error'});await server.listen();
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 try {
  const page=await context.newPage();
  await page.route('**/src/main.ts',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('new TalkApp();','window.testApp=new TalkApp();')});});
  await page.addInitScript(()=>{let seed=123;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);});
  await page.goto('http://127.0.0.1:5198');await page.locator('#mode-alphabet').waitFor({state:'visible'});await page.locator('#mode-alphabet').click();await page.locator('#btn-alphabet-start').click();
  const sizes=[];
  for(const index of [17,21,23]) {
   await page.evaluate(index=>{const a=window.testApp;a.alphabetStageIndex=index;a.beginRound();a.loadAlphabetStage();a.stopClock();},index);
   await page.evaluate(()=>document.fonts.ready);
   sizes.push(await page.locator('#target-text').evaluate(e=>getComputedStyle(e).fontSize));
   await page.screenshot({path:out+`${side}-alphabet-${index}.png`});
  }
  await page.evaluate(()=>{const a=window.testApp;a.showAlphabetIntro('syllable');});await page.locator('#btn-alphabet-start').click();
  await page.evaluate(()=>{window.testApp.stopClock();return document.fonts.ready;});
  sizes.push(await page.locator('#target-text').evaluate(e=>getComputedStyle(e).fontSize));
  await page.screenshot({path:out+`${side}-syllable.png`});
  await page.evaluate(()=>window.testApp.showAlphabetIntro('word'));await page.locator('#btn-alphabet-start').click();
  await page.evaluate(async()=>{
   const a=window.testApp;
   const {WORD_TARGETS}=await import('/src/content/prompts.ts');
   a.nextWordTarget=()=>WORD_TARGETS.find(t=>t.word==='어슬렁어슬렁');a.startWord();a.stopClock();
  });
  await page.evaluate(()=>document.fonts.ready);
  sizes.push(await page.locator('#target-text').evaluate(e=>getComputedStyle(e).fontSize));
  await page.screenshot({path:out+`${side}-word-start.png`});
  if(side==='after') {
   assert.deepEqual([...new Set(sizes)],['44px']);
   assert.equal(await page.locator('.vocabulary-taps').getAttribute('data-syllable'),'어');
   // Real tile clicks, then real Delete, exercise navigation and error recovery.
   for(const value of ['ㅇ','ㆍ','ㅣ']) {
    const id=await page.evaluate(value=>window.testApp.tiles.find(t=>!t.transform&&t.symbol===value&&!window.testApp.used.has(t.id)).id,value);
    await page.locator(`[data-tile-id="${id}"]`).click();
   }
   assert.equal(await page.locator('.vocabulary-taps').getAttribute('data-syllable'),'슬');
   await page.screenshot({path:out+'after-word-next.png'});
   await page.locator('#btn-backspace').click();
   assert.equal(await page.locator('.vocabulary-taps').getAttribute('data-syllable'),'어');
   assert.equal(await page.locator('.vocabulary-taps .syllable-tap.is-done').count(),2);
   for(const width of [320,390,430]) {
    await page.setViewportSize({width,height:844});
    const bounds=await page.locator('.target-korean').evaluate(e=>({left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}));
    assert.ok(bounds.left>=0&&bounds.right<=width);
   }
  }
  console.log(side,sizes);
 } finally {await context.close();await server.close();}
}for(const file of fs.readdirSync(out).filter(n=>n.endsWith('.png'))) {const p=fs.readFileSync(out+file);assert.equal(p.readUInt32BE(16),780);assert.equal(p.readUInt32BE(20),1688);}} finally {await browser.close();}
