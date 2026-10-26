/** CP04: REAL Chromium HTTP-origin disk persistence across browser process restart.
 * No JS shim and no fake localStorage. Only localhost test harness host. */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { validateCapsule,parseStrictJSON } from './core.mjs';
const html=fs.readFileSync('JM_APP_COMMONS_CP04.html');
const server=http.createServer((req,res)=>{
  if(req.url!=='/JM_APP_COMMONS_CP04.html'){res.writeHead(404);res.end('Not found');return;}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  res.end(html);
});
const listen=()=>new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let checks=[];
function pass(name,truth){checks.push({name,pass:!!truth});if(!truth)throw Error('HOLD '+name);console.log('PASS',name)}
const userDir=fs.mkdtempSync(path.join(os.tmpdir(),'jm-commons-cp04-real-'));
let ctx;
let firstSource='';
try {
  await listen();const url=`http://127.0.0.1:${server.address().port}/JM_APP_COMMONS_CP04.html`;
  const chrome=process.env.JM_CHROME||'/usr/bin/google-chrome';
  const launch=()=>chromium.launchPersistentContext(userDir,{headless:true,executablePath:chrome,viewport:{width:390,height:844},acceptDownloads:true,args:['--no-sandbox']});
  ctx=await launch();let p=ctx.pages()[0]||await ctx.newPage();let errors=[];p.on('pageerror',e=>errors.push(String(e)));
  await p.goto(url,{waitUntil:'load'});
  pass('actual HTTP browser origin',await p.evaluate(()=>location.protocol==='http:'&&typeof localStorage.setItem==='function'));
  await p.locator('#demoBtn').click();await p.locator('#saveBtn').click();
  pass('first snapshot rendered',await p.locator('#snapshots .snap').count()===1);
  firstSource=await p.locator('#source').inputValue();
  await p.locator('#source').fill(firstSource+'\n# Native cross-door candidate 🌍\n');
  pass('browser writes real localStorage',!!(await p.evaluate(()=>localStorage.getItem('jm.appcommons.cp01.project'))));
  await p.locator('[data-tab="proof"]').click();await p.locator('#proofBtn').click();
  pass('in-page six-part local proof',await p.locator('#proofState').innerText()==='LOCAL PASS');
  await p.locator('[data-tab="passport"]').click();
  const dl=await Promise.all([p.waitForEvent('download'),p.locator('#exportBtn').click()]);
  const downloaded=fs.readFileSync(await dl[0].path(),'utf8');const obj=parseStrictJSON(downloaded);
  const verified=validateCapsule(obj);
  pass('real browser downloaded verified capsule',verified.snapshots.length===1&&verified.source.includes('cross-door candidate'));
  await ctx.close();ctx=null;
  // This is a new browser process with the SAME disk profile, unlike set_content.
  ctx=await launch();p=ctx.pages()[0]||await ctx.newPage();p.on('pageerror',e=>errors.push(String(e)));
  await p.goto(url,{waitUntil:'load'});
  pass('disk profile survives full Chrome process restart',(await p.locator('#source').inputValue()).includes('cross-door candidate'));
  await p.locator('[data-tab="lineage"]').click();
  pass('snapshot survives full Chrome process restart',await p.locator('#snapshots .snap').count()===1);
  await p.locator('#recoverBtn').click();
  pass('recovered protected snapshot into working buffer',await p.locator('#source').inputValue()===firstSource);
  await p.reload();pass('recovery persists after true page reload',await p.locator('#source').inputValue()===firstSource);
  await p.locator('[data-tab="proof"]').click();await p.locator('#proofBtn').click();
  pass('browser post-reload checks remain valid',await p.locator('#proofState').innerText()==='LOCAL PASS');
  const original=await p.evaluate(()=>localStorage.getItem('jm.appcommons.cp01.project'));
  await p.evaluate(()=>{const k='jm.appcommons.cp01.project';const x=JSON.parse(localStorage.getItem(k));x.snapshots[0].text='TAMPERED';localStorage.setItem(k,JSON.stringify(x));});
  const tampered=await p.evaluate(()=>localStorage.getItem('jm.appcommons.cp01.project'));
  await p.reload();
  pass('tampered disk snapshot enters HOLD', (await p.locator('#notification').innerText()).includes('HOLD'));
  pass('corrupt original bytes preserved for recovery',await p.evaluate(()=>localStorage.getItem('jm.appcommons.cp01.project'))===tampered);
  pass('no JavaScript exceptions',errors.length===0);
  if(process.env.JM_BROWSER_SCREENSHOT)await p.screenshot({path:process.env.JM_BROWSER_SCREENSHOT,fullPage:true});
  console.log(JSON.stringify({suite:'JM.CP04.RealChromiumPersistence',passed:checks.length,total:checks.length,origin:url.replace(/:\d+\//,':PORT/'),liveHostProof:false,ownerDevice:false}));
} finally {if(ctx)await ctx.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(userDir,{recursive:true,force:true});}
