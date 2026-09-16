import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=new URL('./',import.meta.url).pathname,tmp=fs.mkdtempSync('/private/tmp/talk-four-words-');
execFileSync('tar',['-xf','-','-C',tmp],{input:execFileSync('git',['archive','9018d33'],{maxBuffer:512*1024*1024})});fs.symlinkSync(path.join(process.cwd(),'node_modules'),path.join(tmp,'node_modules'),'dir');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{for(const side of ['before','after']){
 const root=side==='before'?tmp:process.cwd(),server=await createServer({root,configFile:false,server:{host:'127.0.0.1',port:5194,strictPort:true,fs:{allow:[root,process.cwd()]}},logLevel:'error'});await server.listen();
 const p=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 try{await p.goto('http://127.0.0.1:5194');await p.locator('#mode-word').click({timeout:20000});await p.locator('#btn-alphabet-start').click();
 await p.evaluate(async()=>{const {requiredBoardSymbols}=await import('/src/core/hangul/target.ts');for(let i=0;i<9;i++){const text=document.querySelector('#target-text .target-korean').textContent;for(const symbol of requiredBoardSymbols(text)){const b=[...document.querySelectorAll('#letter-board button:not(:disabled)')].find(b=>b.getAttribute('aria-label')===(symbol==='ㆍ'?'Cheonjiin dot':symbol)&&!/(rotate|flip|--shape|stem)/.test(b.className));if(!b)throw Error('Missing '+symbol);b.click();}await new Promise(r=>setTimeout(r,440));}await document.fonts.ready;});
 await p.screenshot({path:out+side+'.png'});console.log(side,await p.locator('#target-text').innerText());
 }finally{await p.close();await server.close();}
}}finally{await browser.close();}
