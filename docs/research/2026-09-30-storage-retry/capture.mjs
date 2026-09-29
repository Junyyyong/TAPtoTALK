import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=process.cwd(),out=path.dirname(new URL(import.meta.url).pathname);
const before='a861ab0',after=process.env.AFTER_COMMIT||'WORKTREE',origin='http://127.0.0.1:5199';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'talk-retry-'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function archive(commit,name){
 const root=path.join(temp,name);fs.mkdirSync(root);
 execFileSync('tar',['-xf','-','-C',root],{input:execFileSync('git',['archive',commit],{maxBuffer:512*1024*1024})});
 fs.symlinkSync(path.join(repo,'node_modules'),path.join(root,'node_modules'),'dir');return root;
}
const roots={before:archive(before,'before'),after:after==='WORKTREE'?repo:archive(after,'after')};
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const mobile={viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'en-US',timezoneId:'Asia/Seoul'};
const report={before,after,capturedAt:new Date().toISOString(),browser:browser.version(),mobile,results:{},files:{}};
fs.mkdirSync(path.join(out,'screenshots'),{recursive:true});
let saved;
try{
 for(const side of ['before','after']){
  const root=fs.realpathSync(roots[side]);
  const server=await createServer({root,configFile:false,cacheDir:path.join(temp,'cache',side),
   server:{host:'127.0.0.1',port:5199,strictPort:true,fs:{allow:[root,repo]}},logLevel:'error'});
  await server.listen();
  try{
   if(side==='before'){
    const c=await browser.newContext(mobile),p=await c.newPage();await p.goto(origin);
    await p.locator('#btn-title-settings').click({timeout:30000});
    for(const id of ['talk-music','talk-sound','talk-haptics'])await p.locator('#'+id).click();
    await p.locator('#btn-settings-back').click();
    for(const mode of ['alphabet','syllable','word']){
     await p.locator('#mode-'+mode).click();await p.locator('#btn-alphabet-start').click();
     await p.locator('#letter-board button').first().waitFor();
     await p.locator('#btn-back').click();
    }
    saved=await p.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
    for(const k of ['preferences','progress.v1.alphabet','progress.v1.syllable','progress.v1.word','records'])
     assert.ok(Object.keys(saved).some(key=>key.includes(k)));
    await c.close();
   }
   const context=await browser.newContext(mobile);
   await context.addInitScript(saved=>{
    for(const[k,v]of Object.entries(saved))localStorage.setItem(k,v);
    window.storageFault=true;
    const get=Storage.prototype.getItem;
    Storage.prototype.getItem=function(key){
     if(this===localStorage&&key.startsWith('taptotalk.')&&window.storageFault)throw new DOMException('Test read failure','SecurityError');
     return get.call(this,key);
    };
   },saved);
   const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto(origin);
   const notice=p.locator('#storage-notice'),retry=notice.getByRole('button',{name:'Retry'});
   await retry.waitFor();assert.equal(await p.locator('#app').evaluate(e=>e.inert),true);
   await retry.click(); // Still failing: Retry remains actionable, saves untouched.
   await p.waitForTimeout(100);assert.equal(await retry.isEnabled(),true);
   assert.deepEqual(await p.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),saved);
   await p.evaluate(()=>window.storageFault=false);await retry.click();
   await p.locator('#btn-title-settings').waitFor({state:'visible',timeout:30000});
   await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300);
   const state=await notice.evaluate(e=>({hidden:e.hidden,blocking:e.classList.contains('storage-blocking'),display:getComputedStyle(e).display,appInert:document.getElementById('app').inert}));
   report.results[side]=state;
   assert.deepEqual(await p.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),saved);
   assert.equal(state.hidden,true);assert.equal(state.appInert,false);
   if(side==='before'){
    assert.equal(state.display,'flex');assert.equal(state.blocking,true);
    let blocked=false;try{await p.locator('#btn-title-settings').click({timeout:1200});}catch{blocked=true;}
    assert.equal(blocked,true);
   }else{
    assert.equal(state.display,'none');assert.equal(state.blocking,false);
    await p.locator('#btn-title-settings').click(); // A real, unforced pointer click.
    await p.locator('#btn-privacy').click();await p.frameLocator('#legal-frame').locator('#privacy').waitFor();
    await p.locator('#btn-legal-close').click();await p.locator('#btn-settings-back').click();
    for(const mode of ['alphabet','syllable','word']){
     await p.locator('#mode-'+mode).click();await p.locator('#btn-alphabet-start').click();
     const expected=JSON.parse(saved['taptotalk.progress.v1.'+mode]).stage;
     if(mode==='word')assert.equal((await p.locator('#target-label').innerText()).toLowerCase(),'stage 1');
     else assert.ok((await p.locator('#target-text').innerText()).length>0,expected);
     await p.locator('#letter-board button:not(:disabled)').first().click();
     await p.locator('#btn-back').click();
    }
    await p.locator('#btn-title-settings').click();
   }
   const file=side+'-retry.png',bytes=await p.screenshot({path:path.join(out,'screenshots',file)});
   assert.equal(bytes.readUInt32BE(16),780);assert.equal(bytes.readUInt32BE(20),1688);
   report.files[file]={sha256:hash(bytes),width:780,height:1688};
   assert.deepEqual(errors,[]);await context.close();
  }finally{await server.close();}
 }
 report.checks=['Reproduced hidden-but-flex blocker in previous commit','Failed Retry preserves all 3 game saves/settings/records','Successful Retry removes blocker and inert; normal clicks reach Settings/legal and all 3 games'];
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
