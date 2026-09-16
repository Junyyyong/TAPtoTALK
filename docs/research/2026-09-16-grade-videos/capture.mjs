import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out=new URL('./',import.meta.url).pathname;
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'talk-grade-videos-'));
execFileSync('tar',['-xf','-','-C',tmp],{input:execFileSync('git',['archive','57550ad'],{maxBuffer:512*1024*1024})});
fs.symlinkSync(path.join(process.cwd(),'node_modules'),path.join(tmp,'node_modules'),'dir');
const grades=[['notbad',0,'NOT BAD','notbad'],['goodtry',1,'GOOD TRY','GOOD TRY'],['great',300,'GREAT!','tipi'],['amazing',600,'AMAZING!','AMAZING'],['unbelievable',1000,'UNBELIEVABLE!','taepi'],['ohmygod',1400,'OH MY GOD!','OH MY GOD']];
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
 for(const side of ['before','after']) {
  const root=fs.realpathSync(side==='before'?tmp:process.cwd());
  const server=await createServer({root,configFile:false,server:{fs:{allow:[root,process.cwd()]},port:5198,host:'127.0.0.1'},logLevel:'error'});await server.listen();
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  try {
   const page=await context.newPage();
   await page.addInitScript(()=>{Math.random=()=>.4;});
   await page.goto('http://127.0.0.1:5198');await page.locator('#mode-syllable').waitFor({state:'visible'});
   await page.locator('#mode-syllable').click();await page.locator('#btn-alphabet-start').click();
   for(const [name,score,text,file] of grades) {
    await page.evaluate(async({score,text})=>{
     window.clipPreview?.stop();const {Cheer}=await import('/src/ui/screens/cheer.ts');
     window.clipPreview=new Cheer();window.clipPreview.play('TIME’S UP!',score,text,()=>{});
    },{score,text});
    await page.waitForTimeout(2400);
    await page.waitForFunction(()=>document.getElementById('cheer-clip').readyState>=2);
    await page.evaluate(async()=>{
     const video=document.getElementById('cheer-clip');video.pause();document.getElementById('cheer-sound').pause();
     await new Promise(resolve=>{video.addEventListener('seeked',resolve,{once:true});video.currentTime=.5;});await document.fonts.ready;
    });
    const expected=side==='after'?file:score<600?'tipi':'taepi';
    const sources=await page.evaluate(()=>({video:document.getElementById('cheer-clip').src,sound:document.getElementById('cheer-sound').src}));
    assert.ok(decodeURI(sources.video).endsWith(`/movie/${expected}.webm`));assert.ok(decodeURI(sources.sound).endsWith(`/movie/${expected}.mp3`));
    await page.screenshot({path:out+`${side}-${name}.png`});
    console.log(side,name,sources);
   }
   if(side==='after') {
    // Check iPhone selection in Chrome; this is not a real Safari codec test.
    await page.evaluate(()=>Object.defineProperty(navigator,'userAgent',{value:'iPhone',configurable:true}));
    for(const [,score,text,file] of grades) {
     await page.evaluate(({score,text})=>{window.clipPreview.stop();window.clipPreview.play('TIME’S UP!',score,text,()=>{});},{score,text});
     await page.waitForTimeout(2200);
     const src=await page.locator('#cheer-clip').getAttribute('src');assert.ok(decodeURI(src).endsWith(`/movie/${file}.mp4`));
     assert.ok((await page.request.get(src)).ok());
    }
   }
  } finally {await context.close();await server.close();}
 }
 for(const file of fs.readdirSync(out).filter(f=>f.endsWith('.png'))) {const p=fs.readFileSync(out+file);assert.equal(p.readUInt32BE(16),780);assert.equal(p.readUInt32BE(20),1688);}
} finally {await browser.close();}
