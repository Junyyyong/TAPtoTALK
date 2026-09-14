import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const output=new URL('./',import.meta.url).pathname;
const tmp=fs.mkdtempSync('/private/tmp/talk-settings-before-');
execFileSync('tar',['-xf','-','-C',tmp],{input:execFileSync('git',['archive','f26124d'],{maxBuffer:512*1024*1024})});
fs.symlinkSync(path.join(process.cwd(),'node_modules'),path.join(tmp,'node_modules'),'dir');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
 for(const side of ['before','after']){
  const root=fs.realpathSync(side==='before'?tmp:process.cwd());
  const server=await createServer({root,configFile:false,server:{host:'127.0.0.1',port:5196,strictPort:true,fs:{allow:[root,process.cwd()]}},logLevel:'error'});await server.listen();
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  try{
   await page.goto('http://127.0.0.1:5196');await page.locator('#btn-title-settings').click({timeout:20000});
   await page.evaluate(()=>document.fonts.ready);
   await page.screenshot({path:output+side+'.png'});
   const png=fs.readFileSync(output+side+'.png');assert.equal(png.readUInt32BE(16),780);assert.equal(png.readUInt32BE(20),1688);
   if(side==='before')continue;
   assert(await page.locator('#screen-title').isHidden());assert(await page.locator('#help-layer').isHidden());
   for(const id of ['talk-music','talk-sound','talk-haptics']){
    await page.locator('#'+id).click();assert.equal(await page.locator('#'+id+' [role=switch]').getAttribute('aria-checked'),'false');
    assert(await page.locator('#screen-settings').isVisible());
   }
   await page.locator('#btn-settings-back').click();assert(await page.locator('#screen-settings').isHidden());
   await page.locator('#btn-title-settings').click();
   for(const id of ['talk-music','talk-sound','talk-haptics'])assert.equal(await page.locator('#'+id+' [role=switch]').getAttribute('aria-checked'),'false');
   await page.setViewportSize({width:320,height:568});
   await page.locator('#talk-haptics').scrollIntoViewIfNeeded();assert(await page.locator('#talk-haptics').isVisible());
   await page.locator('#btn-settings-back').click();await page.locator('#mode-word').click();await page.locator('#btn-alphabet-start').click();
   await page.locator('#btn-pause').click();assert(await page.locator('#help-layer').isVisible());assert(await page.locator('#screen-settings').isHidden());
   await page.locator('#btn-resume').click();assert(await page.locator('#help-layer').isHidden());
   console.log('PASS fullscreen, toggles, return/persistence, small viewport, unchanged pause/resume');
  }finally{await page.close();await server.close();}
 }
}finally{await browser.close();}
