import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out=new URL('./',import.meta.url).pathname;
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'talk-clips-before-'));
execFileSync('tar',['-xf','-','-C',tmp],{input:execFileSync('git',['archive','144e7b1'],{maxBuffer:512*1024*1024})});
fs.symlinkSync(path.join(process.cwd(),'node_modules'),path.join(tmp,'node_modules'),'dir');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
 for(const side of ['before','after']){
  const root=fs.realpathSync(side==='before'?tmp:process.cwd());
  const server=await createServer({root,configFile:false,server:{fs:{allow:[root,process.cwd()]},port:5198,host:'127.0.0.1'},logLevel:'error'});await server.listen();
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  try{
   const page=await context.newPage();
   await page.addInitScript(()=>{Math.random=()=>.4;});
   await page.goto('http://127.0.0.1:5198');await page.locator('#mode-syllable').waitFor({state:'visible'});
   await page.locator('#mode-syllable').click();await page.locator('#btn-alphabet-start').click();
   for(const [name,score,text] of [['great',300,'GREAT!'],['amazing',600,'AMAZING!']]){
    await page.evaluate(async({score,text})=>{
     window.clipPreview?.stop();
     const {Cheer}=await import('/src/ui/screens/cheer.ts');
     window.clipPreview=new Cheer();window.clipPreview.play('TIME’S UP!',score,text,()=>{});
    },{score,text});
    await page.waitForTimeout(2500);
    await page.evaluate(async()=>{
     const video=document.getElementById('cheer-clip');video.pause();
     if(video.readyState<2)await new Promise(resolve=>video.addEventListener('loadeddata',resolve,{once:true}));
     await new Promise(resolve=>{video.addEventListener('seeked',resolve,{once:true});video.currentTime=.5;});
     await document.fonts.ready;
    });
    const src=await page.locator('#cheer-clip').getAttribute('src');
    assert.match(src,new RegExp(`/movie/${side==='before'?(name==='great'?'1':'4'):(name==='great'?'tipi':'taepi')}\\.`));
    await page.screenshot({path:out+`${side}-${name}.png`});
    const png=fs.readFileSync(out+`${side}-${name}.png`);assert.equal(png.readUInt32BE(16),780);assert.equal(png.readUInt32BE(20),1688);
    console.log(side,name,src);
   }
  }finally{await context.close();await server.close();}
 }
}finally{await browser.close();}
