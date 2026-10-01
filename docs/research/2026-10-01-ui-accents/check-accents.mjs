// Supplemental paint comparison with genuinely rendered pre-neutral sources,
// plus real START renders with isolated, valid saved record fixtures.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repo=process.cwd(), dir=path.dirname(new URL(import.meta.url).pathname);
const out=path.join(dir,process.env.CHECK_RUN || 'attempt-1');
const report=JSON.parse(fs.readFileSync(path.join(out,'verification.json')));
assert(report.passed,'Complete the primary check first');
const originalFile=path.join(dir,'../2026-10-01-neutral-proportional-frame/final/verification.json');
const original=JSON.parse(fs.readFileSync(originalFile));
const pairs=[['home','.mode-name'],['home','#btn-title-settings'],['settings','#settings-title'],
  ['score','#cheer-headline'],['score','#cheer-score'],
  ...['alphabet','syllable','word'].flatMap(mode=>[
    [mode+'-start','#learning-intro-title'],[mode+'-start','.alphabet-intro-mark'],
    [mode+'-start','#btn-alphabet-start'],[mode+'-pause','#btn-resume'],[mode,'#target-label']])];
const fields=['color','background','gradient','shadow','textShadow'];
const result={originalEvidence:originalFile,originalRevision:original.revision,
  originalOverlaySha256:original.beforeOverlaySha256,paintComparisons:[],recordScreens:{},recordGeometryDifferences:[],passed:false};
for(const [name,selector] of pairs){
  const before=original.web.before[name].boxes[selector],after=report.web.after[name].boxes[selector];
  for(const f of fields)assert.equal(after[f],before[f],name+' '+selector+' original '+f);
  result.paintComparisons.push({name,selector,properties:fields});
}
const servers=[];
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--mute-audio']});
const records={version:1,alphabet:8,syllable:27,word:14};
try{
  for(const [side,root] of [['before',report.beforeRoot],['after',repo]]){
    const s=await createServer({root,configFile:false,cacheDir:path.join(report.beforeRoot,'../records-cache-'+side),logLevel:'error',
      server:{host:'127.0.0.1',port:0,fs:{allow:[root,repo]}}});
    await s.listen();servers.push(s);
    const c=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'en-US'});
    await c.addInitScript(records=>{
      localStorage.setItem('taptotalk.records.v1',JSON.stringify(records));
      localStorage.setItem('taptotalk.preferences.v1',JSON.stringify({musicOn:false,soundOn:false,hapticsOn:false}));
    },records);
    await c.route('**/src/main.ts',async route=>{
      const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('new TalkApp();','window.testApp=new TalkApp();')});
    });
    await c.route('**/src/config/app.ts',async route=>{
      const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('studioSplashMs: 3_000, productSplashMs: 4_000','studioSplashMs: 0, productSplashMs: 0')});
    });
    const p=await c.newPage();p.on('pageerror',e=>{throw e;});
    await p.goto('http://127.0.0.1:'+s.httpServer.address().port);await p.locator('#mode-alphabet').waitFor();
    result.recordScreens[side]={};
    for(const mode of ['alphabet','syllable','word']){
      await p.locator('#mode-'+mode).tap();await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(100);
      assert.equal(await p.locator('#learning-intro-best').textContent(),'Stage '+records[mode]);
      const boxes=await p.evaluate(()=>Object.fromEntries(['#learning-intro-title','.alphabet-intro-mark',
        '#learning-intro-description','.learning-intro-stats','#learning-intro-best','#btn-alphabet-start'].map(sel=>{
          const e=document.querySelector(sel),r=e.getBoundingClientRect(),s=getComputedStyle(e);
          return [sel,{x:r.x,y:r.y,w:r.width,h:r.height,font:s.fontSize,family:s.fontFamily,weight:s.fontWeight,line:s.lineHeight}];
        })));
      result.recordScreens[side][mode]=boxes;
      const file=side+'-'+mode+'-record.png',bytes=await p.screenshot({path:path.join(out,file),animations:'disabled'});
      assert.equal(bytes.readUInt32BE(16),780);assert.equal(bytes.readUInt32BE(20),1688);
      report.files[file]={width:780,height:1688,sha256:createHash('sha256').update(bytes).digest('hex')};
      await p.evaluate(()=>window.testApp.showTitle());
    }
    assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('taptotalk.records.v1'))),records,'Record fixtures are preserved');
    await c.close();
  }
  assert.deepEqual(result.recordScreens.before,result.recordScreens.after,'Record geometry and type stay unchanged');
  result.passed=true;
  fs.writeFileSync(path.join(out,'accent-verification.json'),JSON.stringify(result,null,2)+'\n');
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:result.passed,originalPaintPairs:pairs.length,recordScreens:6,totalScreens:Object.keys(report.files).length}));
}finally{
  for(const s of servers)await s.close();await browser.close();
}
