// Replays historical commits in isolated directories; never checks out the user's tree.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repo = process.cwd(), out = path.dirname(new URL(import.meta.url).pathname);
const before = '717c4252d2bddcc433e40843e996235d43833ccf';
const reference = 'cae2e49b5af230a95b2f1890daf01b47b321b621';
const after = process.env.AFTER_COMMIT || 'WORKTREE';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'talk-legal-'));
const hash = data => createHash('sha256').update(data).digest('hex');
function archive(repository, commit, name) {
  const root = path.join(temp, name); fs.mkdirSync(root);
  execFileSync('tar', ['-xf', '-', '-C', root], {input:execFileSync('git', ['-C', repository, 'archive', commit], {maxBuffer:512*1024*1024})});
  fs.symlinkSync(path.join(repo, 'node_modules'), path.join(root, 'node_modules'), 'dir');
  return root;
}
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const mobile = { viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'en-US',timezoneId:'Asia/Seoul' };
const report = { before, after, reference, capturedAt:new Date().toISOString(), browser:browser.version(), viewport:mobile, metrics:{}, files:{}, checks:[] };
const shotDir = path.join(out,'screenshots'); fs.mkdirSync(shotDir,{recursive:true});
const origin='http://127.0.0.1:5199';
let oldStorage;
async function serve(root) {
  root=fs.realpathSync(root);
  const server=await createServer({root,cacheDir:path.join(temp,'vite',path.basename(root)),configFile:false,
    server:{fs:{allow:[root,repo]},host:'127.0.0.1',port:5199,strictPort:true},logLevel:'error'});
  await server.listen(); return server;
}
async function shot(page,name) {
  await page.evaluate(()=>document.fonts.ready); await page.waitForTimeout(200);
  const bytes=await page.screenshot({path:path.join(shotDir,name+'.png')});
  assert.equal(bytes.readUInt32BE(16),780); assert.equal(bytes.readUInt32BE(20),1688);
  report.files[name+'.png']={sha256:hash(bytes),width:780,height:1688};
}
async function measure(page) {
  return page.evaluate(()=>{
    const result={};
    for(const s of ['.settings-links','#btn-privacy','#btn-licenses','.switch-list','.switch-row','.legal-dialog','#btn-legal-close']) {
      const e=document.querySelector(s); if(!e)continue;
      const r=e.getBoundingClientRect(), c=getComputedStyle(e);
      result[s]={x:r.x,y:r.y,width:r.width,height:r.height,fontSize:c.fontSize,fontWeight:c.fontWeight,
        fontFamily:c.fontFamily,lineHeight:c.lineHeight,padding:c.padding,gap:c.gap,marginTop:c.marginTop};
    } return result;
  });
}
async function choose(page,mode,start=true) {
  await page.evaluate(()=>window.testApp.showTitle());
  await page.locator('#mode-'+mode).click();
  if(start)await page.locator('#btn-alphabet-start').click();
}
async function seedGames(page) {
  for (const [mode,n] of [['alphabet',10],['syllable',7],['word',12]]) {
    await choose(page,mode);
    await page.evaluate(async n=>{
      const a=window.testApp; a.roundNumber=1;a.stageTransitionPending=false;a.paused=false;
      if(a.mode==='word') {
        const {createWordJourney}=await import('/src/content/wordJourney.ts');
        a.nextWordTarget=createWordJourney();
        for(let i=0;i<n;i++)a.wordTarget=a.nextWordTarget();
        a.wordTargetIndex=n-1;a.beginRound();a.input=[];a.used.clear();
        a.tiles=a.makeWordBoard();a.renderTranslatedTarget();a.renderBoard();a.renderInput();
      } else {
        const {ALPHABET_STAGES}=await import('/src/content/prompts.ts');
        a.alphabetStageIndex=(a.mode==='alphabet'?ALPHABET_STAGES.length:a.syllablePractice.length)+n-1;
        a.beginRound();a.loadAlphabetStage();
      }
      a.elapsedMs=10000;a.startClock(true);a.saveProgress();a.stopClock();
    },n);
  }
  await page.evaluate(()=>window.testApp.showTitle());
}
try {
  const versions=[
    ['reference',archive(process.env.TEN_ROOT||'/Users/scdi/Documents/ChatGPT/TAPtoTEN',reference,'reference')],
    ['before',archive(repo,before,'before')],
    ['after',after==='WORKTREE'?repo:archive(repo,after,'after')]
  ];
  for(const [side,root] of versions) {
    const server=await serve(root),context=await browser.newContext(mobile),errors=[],external=[];
    // Instrument only this isolated browser response, never source or deployment.
    if(side!=='reference')await context.route('**/src/main.ts',async route=>{
      const response=await route.fetch();
      await route.fulfill({response,body:(await response.text()).replace('new TalkApp();','window.testApp=new TalkApp();')});
    });
    await context.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(!['data:','blob:'].includes(url.protocol)&&url.origin!==origin){external.push(url.href);await route.abort();}
      else await route.fallback();
    });
    if(side==='after')await context.addInitScript(storage=>{
      if(location.origin!=='http://127.0.0.1:5199'||localStorage.getItem('research-seeded'))return;
      for(const [k,v] of Object.entries(storage))localStorage.setItem(k,v);
      localStorage.setItem('research-seeded','true');
    },oldStorage);
    try {
      const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
      await p.goto(origin);await p.locator('#btn-title-settings').waitFor({state:'visible',timeout:30000});
      if(side==='before') {await seedGames(p);oldStorage=await p.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));}
      await p.locator('#btn-title-settings').click();await shot(p,side+'-settings');
      report.metrics[side]=await measure(p);
      if(side!=='before') {
        const saved=await p.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
        await p.locator('#btn-privacy').click();
        const frame=p.frameLocator('#legal-frame');
        await frame.locator('#privacy').waitFor();
        await shot(p,side+'-privacy-en');
        report.metrics[side].dialog=await measure(p);
        await frame.getByRole('link',{name:'한국어'}).click();
        if(side==='after')await shot(p,'after-privacy-ko');
        await frame.locator('#korean h1').click();await p.keyboard.press('Escape');
        await p.waitForFunction(()=>!document.getElementById('legal-dialog').open&&document.activeElement.id==='btn-privacy');
        await p.locator('#btn-licenses').click();
        await frame.getByRole('heading',{name:'Open-source licenses'}).waitFor();
        if(side==='after') {
          await shot(p,'after-licenses');
          await frame.getByText('Noto Serif KR (SIL Open Font License 1.1)',{exact:true}).click();
          assert.ok(await frame.getByText('SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007',{exact:false}).count()>0);
        }
        await p.locator('#btn-legal-close').click();
        await p.waitForFunction(()=>document.activeElement.id==='btn-licenses');
        assert.deepEqual(await p.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),saved);
        // Safari-like capability: the enabled vibration switch must show its note
        // without colliding with legal links; geometry still matches the reference.
        await p.evaluate(()=>Object.defineProperty(navigator,'vibrate',{value:undefined,configurable:true}));
        await p.locator('#btn-settings-back').click();await p.locator('#btn-title-settings').click();
        await p.locator('.settings-note').waitFor();
        await p.waitForTimeout(500);
        report.metrics[side].noVibration=await measure(p);
        if(side==='after')await shot(p,'after-settings-no-vibration');
        if(side==='after') {
          for(const [k,v] of Object.entries(oldStorage))assert.equal(saved[k],v,'Update must not change old saves');
          // Open, close and immediately reopen: a queued close event must not clear the new frame.
          await p.evaluate(()=>{
            document.getElementById('btn-privacy').click();document.getElementById('btn-legal-close').click();
            document.getElementById('btn-licenses').click();
          });
          await frame.getByRole('heading',{name:'Open-source licenses'}).waitFor();
          await p.locator('#btn-legal-close').click();
          await p.reload();await p.locator('#btn-title-settings').waitFor({state:'visible'});
          for(const [mode,n] of [['alphabet',10],['syllable',7],['word',12]]) {
            await choose(p,mode,false);
            assert.equal(await p.locator('#learning-intro-best').innerText(),'Stage '+n);
            await p.locator('#btn-alphabet-start').click();
            assert.equal((await p.locator('#target-label').innerText()).toLowerCase(),'stage '+n);
            assert.ok(await p.evaluate(()=>window.testApp.elapsedMs<1500));
          }
          await p.evaluate(()=>window.testApp.showTitle());await p.locator('#btn-title-settings').click();
          for(const viewport of [{width:320,height:568},{width:430,height:932}]) {
            await p.setViewportSize(viewport);await p.locator('#btn-privacy').click();
            const b=await p.locator('#legal-dialog').boundingBox();
            assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=viewport.width&&b.y+b.height<=viewport.height);
            await frame.locator('#privacy').waitFor();
            assert.ok(await frame.locator('body').evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
            await p.locator('#btn-legal-close').click();
          }
          report.checks.push('Esc from iframe; close focus restoration; rapid reopen; legal localStorage unchanged; prior-version saves and all 3 best stages resumed; 320/390/430px fit');
        }
      }
      assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    }finally{await context.close();await server.close();}
  }
  console.log('Legal links:',JSON.stringify(Object.fromEntries(Object.entries(report.metrics).map(([k,v])=>[k,{normal:v['.settings-links'],noVibration:v.noVibration?.['.settings-links']}]))));
  if(process.env.STRICT_METRICS==='1') {
    for(const selector of ['.settings-links','#btn-privacy','#btn-licenses']) {
      const ref=report.metrics.reference[selector], actual=report.metrics.after[selector];
      for(const key of ['x','y','width','height','fontSize','fontWeight','gap','padding'])assert.equal(actual[key],ref[key],selector+' '+key);
    }
    for(const selector of ['.legal-dialog','#btn-legal-close'])assert.deepEqual(report.metrics.after.dialog[selector],report.metrics.reference.dialog[selector]);
    for(const key of ['x','y','width','height'])assert.equal(report.metrics.after.noVibration['.settings-links'][key],report.metrics.reference.noVibration['.settings-links'][key]);
    report.checks.push('Settings legal links and dialog geometry/typography match TAPtoTEN');
  }
  report.checks.push('All PNGs 780×1688; zero page exceptions; zero external requests in captured flows');
  for(const file of ['public/privacy.html','public/licenses.html','public/legal/dependencies.json','src/ui/screens/legalDocuments.ts','src/ui/styles/legal.css'])
    report.files[file]={sha256:hash(fs.readFileSync(path.join(versions[2][1],file)))};
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');
  console.log('PASS',report.checks);
}finally{await browser.close();}
