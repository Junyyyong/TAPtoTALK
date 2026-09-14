import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const output=new URL('./',import.meta.url).pathname;
const tmp=fs.mkdtempSync('/private/tmp/talk-menu-before-');execFileSync('tar',['-xf','-','-C',tmp],{input:execFileSync('git',['archive','bd8e4ec'],{maxBuffer:512*1024*1024})});fs.symlinkSync(path.join(process.cwd(),'node_modules'),path.join(tmp,'node_modules'),'dir');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});const metrics={};
try{for(const [side,root] of [['reference','/Users/scdi/Documents/ChatGPT/TAPtoTEN'],['before',tmp],['after',process.cwd()]]){
 const server=await createServer({root,cacheDir:path.join(tmp,'cache-'+side),configFile:false,server:{host:'127.0.0.1',port:5195,strictPort:true,fs:{allow:[root,process.cwd()]}},logLevel:'error'});await server.listen();
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 try{await page.goto('http://127.0.0.1:5195');await page.locator('#btn-title-settings').waitFor({state:'visible',timeout:20000});await page.evaluate(()=>document.fonts.ready);metrics[side]={};
  for(const [w,h] of [[390,844],[375,667],[320,568]]){await page.setViewportSize({width:w,height:h});await page.waitForTimeout(300);
   metrics[side][h]=await page.evaluate(()=>Object.fromEntries(['.mode-list','.mode-btn','#btn-title-settings'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return[s,{x:r.x,y:r.y,w:r.width,h:r.height}]})));
   if(w===390){await page.screenshot({path:output+side+'.png'});const bytes=fs.readFileSync(output+side+'.png');assert.equal(bytes.readUInt32BE(16),780);assert.equal(bytes.readUInt32BE(20),1688);}
  }
 }finally{await page.close();await server.close();}
}
fs.writeFileSync(output+'metrics.json',JSON.stringify(metrics,null,2));
for(const h of [844,667,568])for(const s of ['.mode-list','.mode-btn','#btn-title-settings'])for(const k of ['x','y','w','h'])assert(Math.abs(metrics.after[h][s][k]-metrics.reference[h][s][k])<1,`${h} ${s} ${k}: ${metrics.after[h][s][k]} vs ${metrics.reference[h][s][k]}`);
console.log('PASS all button bounds match TEN within 1 CSS px at 3 mobile sizes');
}finally{await browser.close();}
