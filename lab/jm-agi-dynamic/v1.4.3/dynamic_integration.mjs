import { chromium } from 'playwright-core';
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const bodyPath = join(here, 'JM_AGI_LAB_v1_4_3_PROCESS_RESTART_PROOF_CORRECTED.html');
const profilePath = join(here, 'JM_AGI_EDGE_CI_PROFILE');
const bodyName = basename(bodyPath);
const schema = 'JM_AGI_EDGE_PROCESS_WITNESS_v1';
const started = Date.now();
const log = (stage, msg='') => console.log(`[+${((Date.now()-started)/1000).toFixed(1)}s] ${stage}${msg ? ' — '+msg : ''}`);

function findEdge() {
  const pf = process.env.ProgramFiles || '';
  const pfx86 = process.env['ProgramFiles(x86)'] || '';
  const local = process.env.LOCALAPPDATA || '';
  const candidates = [
    join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(pfx86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(local, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
  ].filter(existsSync);
  if (!candidates.length) throw new Error('Microsoft Edge not found');
  return candidates[0];
}

function psLiteral(s){ return "'" + String(s).replaceAll("'", "''") + "'"; }
function getProfileProcesses(profile){
  const cmd = [
    `$needle=[Regex]::Escape(${psLiteral(profile)});`,
    `$rows=@(Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -and ($_.CommandLine -match $needle) } | Select-Object ProcessId,ParentProcessId,CommandLine);`,
    `$rows | ConvertTo-Json -Compress -Depth 3`
  ].join(' ');
  const out = execFileSync('pwsh.exe',['-NoProfile','-Command',cmd],{encoding:'utf8'}).trim();
  if(!out) return [];
  const parsed = JSON.parse(out);
  return Array.isArray(parsed) ? parsed : [parsed];
}
function rootPids(rows){
  const ids = new Set(rows.map(r=>Number(r.ProcessId)));
  const roots = rows.filter(r=>!ids.has(Number(r.ParentProcessId))).map(r=>Number(r.ProcessId));
  return [...new Set(roots.length?roots:rows.map(r=>Number(r.ProcessId)))];
}
async function waitFor(fn, timeoutMs, label){
  const until = Date.now()+timeoutMs;
  let last;
  while(Date.now()<until){
    try { const v = await fn(); if(v) return v; last=v; } catch(e){ last=e; }
    await new Promise(r=>setTimeout(r,250));
  }
  throw new Error(`timeout waiting for ${label}; last=${last instanceof Error?last.message:String(last)}`);
}
async function cdpEndpoint(port){
  return waitFor(async()=>{
    const r=await fetch(`http://127.0.0.1:${port}/json/version`);
    if(!r.ok) return null;
    const j=await r.json();
    return j.webSocketDebuggerUrl ? `http://127.0.0.1:${port}` : null;
  },15000,`Edge CDP port ${port}`);
}
function launchEdge(edge, profile, port, url){
  const args=[
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-mode',
    '--disable-features=msEdgeStartupBoost',
    url
  ];
  log('EDGE_LAUNCH', `port=${port}`);
  const cp=spawn(edge,args,{stdio:['ignore','pipe','pipe'],windowsHide:true});
  cp.stdout.on('data',d=>process.stdout.write('[edge-out] '+d));
  cp.stderr.on('data',d=>process.stdout.write('[edge-err] '+d));
  return cp;
}
function killTree(pid){
  try{
    const out=execFileSync('taskkill.exe',['/PID',String(pid),'/T','/F'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
    log('TASKKILL',out.trim().replace(/\r?\n/g,' | '));
  }catch(e){
    log('TASKKILL_NONZERO', String(e.stderr||e.message).trim().replace(/\r?\n/g,' | '));
  }
}
function b64url(obj){
  return Buffer.from(JSON.stringify(obj),'utf8').toString('base64url');
}

if(!existsSync(bodyPath)) throw new Error('exact v1.4.3 body missing');
const edge=findEdge();
const bodySha=createHash('sha256').update(readFileSync(bodyPath)).digest('hex');
log('PRECONTACT',`edge=${edge} bodySha=${bodySha}`);
const runId=randomUUID().replaceAll('-','');
const bodyUrl=pathToFileURL(bodyPath).href;
const port1=9321;
const launchUrl=`${bodyUrl}#jm-process-run=${runId}&jm-autoarm=1`;

let edge1, edge2, browser1, browser2;
try {
  edge1=launchEdge(edge,profilePath,port1,launchUrl);
  await cdpEndpoint(port1);
  browser1=await chromium.connectOverCDP(`http://127.0.0.1:${port1}`);
  const ctx1=browser1.contexts()[0];
  const page1=await waitFor(()=>ctx1.pages()[0],5000,'first Edge page');
  await page1.waitForLoadState('domcontentloaded');
  log('BODY_LOADED',await page1.title());

  await page1.waitForFunction(rid=>document.title.startsWith('JMAGI_ARMED__'+rid+'__'),runId,{timeout:15000});
  const armedTitle=await page1.title();
  const m=armedTitle.match(new RegExp('^JMAGI_ARMED__'+runId+'__([A-Z0-9-]+)$'));
  if(!m) throw new Error('armed title/token mismatch: '+armedTitle);
  const token=m[1];
  log('ARMED',token);

  const pending=await page1.evaluate(()=>JSON.parse(localStorage.getItem('jm_agi_lab_v1_4_3_process_pending')||'null'));
  if(!pending?.writeAccepted || pending.runId!==runId || pending.token!==token) throw new Error('browser pending challenge invalid');
  const preRows=await waitFor(()=>{const x=getProfileProcesses(profilePath);return x.length?x:null},10000,'dedicated Edge processes');
  const prePids=preRows.map(r=>Number(r.ProcessId));
  const roots=rootPids(preRows);
  log('PROCESS_TREE',`pids=${prePids.join(',')} roots=${roots.join(',')}`);

  for(const pid of roots) killTree(pid);
  await waitFor(()=>getProfileProcesses(profilePath).length===0,20000,'dedicated Edge process tree ZERO');
  const zeroAt=new Date().toISOString();
  log('PROCESS_ZERO',zeroAt);

  const witness={
    schema,runnerVersion:'ci-dynamic-1',runId,token,platform:'Windows',browser:'Microsoft Edge',
    dedicatedProfile:true,zeroObserved:true,zeroAt,prePids,rootPids:roots,
    bodyFileName:bodyName,bodySha256:bodySha
  };
  const port2=9322;
  const returnUrl=`${bodyUrl}#jm-restart-witness=${b64url(witness)}`;
  edge2=launchEdge(edge,profilePath,port2,returnUrl);
  await cdpEndpoint(port2);
  browser2=await chromium.connectOverCDP(`http://127.0.0.1:${port2}`);
  const ctx2=browser2.contexts()[0];
  const page2=await waitFor(()=>ctx2.pages()[0],5000,'returned Edge page');
  await page2.waitForLoadState('domcontentloaded');
  log('RETURN_LOADED',await page2.title());

  const result=await waitFor(async()=>{
    return page2.evaluate(()=>JSON.parse(localStorage.getItem('jm_agi_lab_v1_4_3_process_last')||'null'));
  },10000,'v1.4.3 process result');
  log('PAGE_DECISION',JSON.stringify(result));
  const statusText=await page2.locator('#processHarnessStatus').innerText();
  const reasonText=await page2.locator('#processHarnessReason').innerText().catch(()=> '');
  log('VISIBLE_STATUS',`${statusText} | ${reasonText}`);

  const required = [
    ['ownerProcessDing',result.ownerProcessDing===true],
    ['status PASS',result.status==='PASS'],
    ['zeroObserved',result.zeroObserved===true],
    ['runMatch',result.runMatch===true],
    ['tokenMatch',result.tokenMatch===true],
    ['newLoad',result.newLoad===true],
    ['exactReadBack',result.exactReadBack===true],
    ['restored',result.restored===true],
    ['samePath',result.samePath===true],
    ['timelineValid',result.timelineValid===true]
  ];
  const failed=required.filter(([,ok])=>!ok).map(([name])=>name);
  if(failed.length) throw new Error('v1.4.3 dynamic integration HOLD: '+failed.join(', ')+' reason='+result.reason);
  if(!/PROCESS DING/i.test(statusText)) throw new Error('visible process Ding not rendered');
  log('DYNAMIC_INTEGRATION_PASS','exact body + Windows Edge + process zero + relaunch + read-back + restore');
} finally {
  for(const rows of [getProfileProcesses(profilePath)]){
    for(const pid of rootPids(rows)) killTree(pid);
  }
}

// synchronization trigger: dynamic integration run 3
