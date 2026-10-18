import { chromium } from 'playwright-core';
import { spawn, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

const here=dirname(fileURLToPath(import.meta.url));
const bodyPath=join(here,'JM_AGI_LAB_v1_4_3_PROCESS_RESTART_PROOF_CORRECTED.html');
const bodyUrl=pathToFileURL(bodyPath).href;
const pendingKey='jm_agi_lab_v1_4_3_process_pending';
const t0=Date.now();
const log=(s,m='')=>console.log(`[+${((Date.now()-t0)/1000).toFixed(1)}s] ${s}${m?' — '+m:''}`);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function findEdge(){
  const c=[
    join(process.env.ProgramFiles||'','Microsoft','Edge','Application','msedge.exe'),
    join(process.env['ProgramFiles(x86)']||'','Microsoft','Edge','Application','msedge.exe'),
    join(process.env.LOCALAPPDATA||'','Microsoft','Edge','Application','msedge.exe')
  ].filter(existsSync);
  if(!c.length) throw new Error('Edge not found');
  return c[0];
}
const edge=findEdge();
function psLiteral(s){return "'" + String(s).replaceAll("'","''") + "'";}
function profileRows(profile){
  const cmd=[
    `$needle=[Regex]::Escape(${psLiteral(profile)});`,
    `$rows=@(Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -and ($_.CommandLine -match $needle) } | Select-Object ProcessId,ParentProcessId,CommandLine);`,
    `$rows | ConvertTo-Json -Compress -Depth 3`
  ].join(' ');
  const out=execFileSync('pwsh.exe',['-NoProfile','-Command',cmd],{encoding:'utf8'}).trim();
  if(!out)return[];
  const x=JSON.parse(out);return Array.isArray(x)?x:[x];
}
function roots(rows){
  const ids=new Set(rows.map(r=>Number(r.ProcessId)));
  const rr=rows.filter(r=>!ids.has(Number(r.ParentProcessId))).map(r=>Number(r.ProcessId));
  return [...new Set(rr.length?rr:rows.map(r=>Number(r.ProcessId)))];
}
function killProfile(profile){
  const rows=profileRows(profile);
  for(const pid of roots(rows)){
    try{execFileSync('taskkill.exe',['/PID',String(pid),'/T','/F'],{stdio:'ignore'});}catch{}
  }
}
async function waitFor(fn,ms,label){
  const until=Date.now()+ms;
  while(Date.now()<until){const v=await fn();if(v)return v;await sleep(200);}
  throw new Error('timeout '+label);
}
async function launch(profile,port,url){
  const cp=spawn(edge,[
    '--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,
    '--no-first-run','--no-default-browser-check','--disable-background-mode',
    '--disable-features=msEdgeStartupBoost','about:blank'
  ],{stdio:['ignore','ignore','ignore'],windowsHide:true});
  await waitFor(async()=>{
    try{const r=await fetch(`http://127.0.0.1:${port}/json/version`);return r.ok;}catch{return false;}
  },15000,'CDP');
  const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const ctx=browser.contexts()[0],page=ctx.pages()[0]||await ctx.newPage();
  await page.goto(url,{waitUntil:'load',timeout:15000});
  return{cp,browser,page};
}
async function arm(profile,port,trial){
  const runId=randomUUID().replaceAll('-','');
  const url=`${bodyUrl}#jm-process-run=${runId}&jm-autoarm=1`;
  const x=await launch(profile,port,url);
  await x.page.waitForFunction(rid=>document.title.startsWith('JMAGI_ARMED__'+rid+'__'),runId,{timeout:10000});
  const pending=await x.page.evaluate(k=>JSON.parse(localStorage.getItem(k)||'null'),pendingKey);
  if(!pending?.writeAccepted)throw new Error(trial+' did not arm');
  log('ARM',`${trial} token=${pending.token}`);
  return{...x,runId,pending};
}
async function relaunchInspect(profile,port,trial){
  const x=await launch(profile,port,bodyUrl);
  await sleep(700);
  const pending=await x.page.evaluate(k=>JSON.parse(localStorage.getItem(k)||'null'),pendingKey);
  const state=await x.page.evaluate(()=>({href:location.href,title:document.title,storageOk:(()=>{try{localStorage.setItem('__pm','1');const o=localStorage.getItem('__pm')==='1';localStorage.removeItem('__pm');return o}catch{return false}})()}));
  log('RELAUNCH',`${trial} pending=${pending?'PRESENT':'ABSENT'} storageOk=${state.storageOk}`);
  killProfile(profile);
  await sleep(500);
  return{pendingPresent:!!pending,pending,state};
}

const results=[];
async function forcedTrial(name,waitMs,{checkpoint=false}={}){
  const profile=join(here,'ci-profiles',name);
  killProfile(profile);
  const port=9400+results.length*2;
  const a=await arm(profile,port,name);
  await sleep(waitMs);
  let checkpointPresent=null;
  if(checkpoint){
    const checkpointUrl=`${bodyUrl}#jm-process-run=${a.runId}`;
    await a.page.goto(checkpointUrl,{waitUntil:'load',timeout:15000});
    checkpointPresent=await a.page.evaluate(k=>!!localStorage.getItem(k),pendingKey);
    log('CHECKPOINT',`${name} pending=${checkpointPresent?'PRESENT':'ABSENT'}`);
    await sleep(1200);
  }
  const pre=await a.page.evaluate(k=>!!localStorage.getItem(k),pendingKey);
  const rows=profileRows(profile),r=roots(rows);
  log('FORCE_KILL',`${name} waitMs=${waitMs} prePending=${pre} pids=${rows.length} roots=${r.join(',')}`);
  killProfile(profile);
  await waitFor(()=>profileRows(profile).length===0,15000,'zero '+name);
  const inspect=await relaunchInspect(profile,port+1,name);
  results.push({name,mode:'forced',waitMs,checkpoint,checkpointPresent,prePending:pre,postPending:inspect.pendingPresent});
}
async function gracefulTrial(name,waitMs){
  const profile=join(here,'ci-profiles',name);
  killProfile(profile);
  const port=9500;
  const a=await arm(profile,port,name);
  await sleep(waitMs);
  const pre=await a.page.evaluate(k=>!!localStorage.getItem(k),pendingKey);
  log('GRACEFUL_CLOSE',`${name} prePending=${pre}`);
  await a.browser.close();
  await waitFor(()=>profileRows(profile).length===0,15000,'graceful zero');
  const inspect=await relaunchInspect(profile,port+1,name);
  results.push({name,mode:'graceful',waitMs,prePending:pre,postPending:inspect.pendingPresent});
}

try{
  await forcedTrial('forced_600ms',600);
  await forcedTrial('forced_3000ms',3000);
  await forcedTrial('forced_10000ms',10000);
  await forcedTrial('forced_checkpoint',1200,{checkpoint:true});
  await gracefulTrial('graceful_1200ms',1200);
  console.log('PERSISTENCE_MATRIX_JSON '+JSON.stringify(results));
  console.log('PERSISTENCE_MATRIX_TABLE');
  for(const r of results) console.log(`${r.name}: pre=${r.prePending} checkpoint=${r.checkpointPresent??'n/a'} post=${r.postPending}`);
} finally {
  for(const name of ['forced_600ms','forced_3000ms','forced_10000ms','forced_checkpoint','graceful_1200ms']){
    killProfile(join(here,'ci-profiles',name));
  }
}
