import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = new URL('./', import.meta.url).pathname;
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--autoplay-policy=user-gesture-required']});
const checks = [];
try {
 for (const side of ['before','after']) {
  const root = side === 'before' ? process.env.BEFORE_ROOT : process.cwd();
  const server = await createServer({root,configFile:false,server:{host:'127.0.0.1',port:5199,strictPort:true},logLevel:'error'});
  await server.listen();
  const context = await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  try {
   const page = await context.newPage();
   await page.addInitScript(() => {
    window.musicSources=[];
    const create=AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource=function(){
     const source=create.call(this), item={source,context:this,stopped:false};window.musicSources.push(item);
     const stop=source.stop.bind(source);source.stop=(...args)=>{item.stopped=true;return stop(...args);};return source;
    };
   });
   await page.goto('http://127.0.0.1:5199');
   await page.locator('#btn-title-settings').waitFor({state:'visible',timeout:20000});
   await page.locator('#btn-title-settings').click();
   await page.evaluate(()=>document.fonts.ready);
   await page.screenshot({path:output+side+'-settings.png'});
   const bytes=fs.readFileSync(output+side+'-settings.png');assert.equal(bytes.readUInt32BE(16),780);assert.equal(bytes.readUInt32BE(20),1688);
   if(side==='before') continue;
   const music=async(duration)=>{
    await page.waitForFunction(d=>{
     const active=window.musicSources.filter(x=>!x.stopped&&x.source.loop&&x.context.state==='running');
     return d===0?active.length===0:active.length===1&&Math.abs(active[0].source.buffer.duration-d)<0.1;
    },duration,{timeout:15000});
   };
   await music(30);checks.push('Menu: one decoded 30-second looping track');
   await page.locator('#talk-sound').click();await music(30);checks.push('Sound toggle leaves music playing');
   await page.locator('#talk-music').click();await music(0);
   await page.locator('#talk-music').click();await music(30);checks.push('Independent Music off/on');
   await page.locator('#btn-help-close').click();
   for(const mode of ['alphabet','syllable','word']){
    await page.locator('#mode-'+mode).click();await music(40.5634);
    await page.locator('#btn-alphabet-start').click();await music(40.5634);
    await page.locator('#btn-pause').click();await music(0);
    await page.locator('#btn-resume').click();await music(40.5634);
    await page.locator('#btn-back').click();await music(30);
    checks.push(mode+': intro/game switch, pause silence, resume, menu return');
   }
   await page.locator('#mode-word').click();await page.locator('#btn-alphabet-start').click();
   await page.clock.install();await page.clock.runFor(63000);await music(0);
   checks.push('Word timeout/result: background music silent');
  } finally {await context.close();await server.close();}
 }
 fs.writeFileSync(output+'verification.json',JSON.stringify({before:'f7a7d8a',viewport:'390x844 @2',checks},null,2)+'\n');
} finally {await browser.close();}
