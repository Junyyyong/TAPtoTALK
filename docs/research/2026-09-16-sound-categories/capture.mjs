import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=new URL('./',import.meta.url).pathname,tmp=fs.mkdtempSync(path.join(os.tmpdir(),'talk-sound-labels-'));
execFileSync('tar',['-xf','-','-C',tmp],{input:execFileSync('git',['archive','98c8be4'],{maxBuffer:512*1024*1024})});fs.symlinkSync(path.join(process.cwd(),'node_modules'),path.join(tmp,'node_modules'),'dir');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {for(const side of ['before','after']) {
 const root=fs.realpathSync(side==='before'?tmp:process.cwd()),server=await createServer({root,configFile:false,server:{fs:{allow:[root,process.cwd()]},port:5198,host:'127.0.0.1'},logLevel:'error'});await server.listen();
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 try {
  const page=await context.newPage();
  await page.route('**/src/main.ts',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('new TalkApp();','window.testApp=new TalkApp();')});});
  await page.addInitScript(()=>{let seed=123;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);});
  await page.goto('http://127.0.0.1:5198');await page.locator('#mode-syllable').waitFor({state:'visible'});await page.locator('#mode-syllable').click();await page.locator('#btn-alphabet-start').click();
  for(const name of ['syllable','dot-board']) {
   await page.evaluate(async name=>{
    const app=window.testApp;
    if(name==='syllable') {const {SYLLABLE_STAGES}=await import('/src/content/learningJourney.ts');app.syllablePractice=[SYLLABLE_STAGES.find(s=>s.target==='바')];app.alphabetStageIndex=0;app.loadAlphabetStage();}
    else {app.introMode='alphabet';app.startAlphabetJourney();app.alphabetStageIndex=14;app.loadAlphabetStage();}
    app.stopClock();
   },name);
   await page.evaluate(()=>document.fonts.ready);
   if(side==='after'&&name==='syllable') {
    assert.equal(await page.locator('#target-label').innerText(),'Letter Combinations');
    const width=await page.locator('.syllable-tap.is-cheonjiin').evaluate(n=>parseFloat(getComputedStyle(n,'::before').width));assert.ok(width<=4.5);
   }
   await page.screenshot({path:out+`${side}-${name}.png`});
  }
  if(side==='after') {
   // Use the real gesture-unlocked app Cheer; do not create another instance.
   await page.evaluate(()=>{const app=window.testApp;app.music.setScene('silent');app.cheer.setSound(true);app.cheer.play('TIME’S UP!',600,'AMAZING!',()=>{});});
   await page.waitForFunction(()=>window.testApp.cheer.soundtrack.source?.buffer?.duration>0);
   const audio=await page.evaluate(()=>{const c=window.testApp.cheer,b=c.soundtrack.source.buffer;return {state:c.soundtrack.context.state,duration:b.duration,nonzero:b.getChannelData(0).some(v=>Math.abs(v)>.01),position:document.getElementById('cheer-clip').currentTime};});
   assert.equal(audio.state,'running');assert.ok(audio.duration>0&&audio.nonzero);console.log('decoded soundtrack running',audio);
   await page.evaluate(()=>window.testApp.cheer.setSound(false));assert.ok(await page.evaluate(()=>!window.testApp.cheer.soundtrack.source));
   await page.evaluate(()=>{window.testApp.cheer.stop();});
   // Force both playback paths to reject and verify the visible recovery button.
   await page.evaluate(()=>{const c=window.testApp.cheer;c.setSound(true);c.soundtrack.play=async()=>{throw Error('blocked');};document.getElementById('cheer-sound').play=async()=>{throw Error('blocked');};c.play('TIME’S UP!',600,'AMAZING!',()=>{});});
   await page.locator('.cheer-sound-retry').waitFor({state:'visible'});
   await page.screenshot({path:out+'after-sound-retry.png'});
   await page.evaluate(()=>{window.retried=false;window.testApp.cheer.soundtrack.play=async()=>{window.retried=true;};});
   await page.locator('.cheer-sound-retry').click();assert.ok(await page.evaluate(()=>window.retried));
  }
  console.log(side,'verified');
 } finally {await context.close();await server.close();}
}for(const file of fs.readdirSync(out).filter(f=>f.endsWith('.png'))) {const p=fs.readFileSync(out+file);assert.equal(p.readUInt32BE(16),780);assert.equal(p.readUInt32BE(20),1688);}} finally {await browser.close();}
