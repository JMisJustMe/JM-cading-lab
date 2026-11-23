import { chromium } from 'playwright-core';
import { spawn, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const bodyPath=join(here,'JM_AGI_LAB_v1_4_4_DURABILITY_SETTLE_LIVE_INTEGRATION.html');
const bodyUrl=pathToFileURL(bodyPath).href;
const profile=join(here,'JM_AGI_EDGE_HEARTBEAT_PROFILE');
const edge=[
  join(process.env.ProgramFiles||'','Microsoft','Edge','Application','msedge.exe'),
  join(process.env['ProgramFiles(x86)']||'','Microsoft','Edge','Application','msedge.exe'),
  join(process.env.LOCALAPPDATA||'','Microsoft','Edge','Application','msedge.exe')
].find(existsSync);
if(!edge)throw new Error('Edge not found');
const port=9444;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function kill(){
  try{
    const p=String(profile).replaceAll("'","''");
    execFileSync('pwsh.exe',['-NoProfile','-Command',`$n=[Regex]::Escape('${p}'); $x=@(Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" -ErrorAction SilentlyContinue | ? { $_.CommandLine -and $_.CommandLine -match $n }); foreach($q in $x){Stop-Process -Id $q.ProcessId -Force -ErrorAction SilentlyContinue}`],{stdio:'ignore'});
  }catch{}
}
async function waitCdp(){
  for(let i=0;i<60;i++){try{const r=await fetch(`http://127.0.0.1:${port}/json/version`);if(r.ok)return;}catch{}await sleep(250)}
  throw new Error('CDP timeout');
}
kill();
spawn(edge,['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'--no-first-run','--disable-background-mode','about:blank'],{stdio:'ignore',windowsHide:true});
try{
  await waitCdp();
  const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const page=browser.contexts()[0].pages()[0];
  const rid='HEARTBEAT'+Date.now();
  await page.goto(`${bodyUrl}#jm-process-run=${rid}&jm-autoarm=1`,{waitUntil:'load'});
  await page.waitForFunction(r=>document.title.startsWith('JMAGI_ARMED__'+r+'__'),rid,{timeout:10000});
  const first=await page.locator('#processHarnessHeartbeat').innerText();
  const status0=await page.locator('#processHarnessStatus').innerText();
  await sleep(2300);
  const second=await page.locator('#processHarnessHeartbeat').innerText();
  const status1=await page.locator('#processHarnessStatus').innerText();
  console.log('HEARTBEAT_FIRST',first);
  console.log('HEARTBEAT_SECOND',second);
  console.log('STATUS_FIRST',status0);
  console.log('STATUS_SECOND',status1);
  if(first===second)throw new Error('heartbeat text did not advance');
  if(!/durability settle\s+[1-9]\d*\/12s/i.test(second))throw new Error('heartbeat does not expose live settle progress');
  if(!/SETTLING/i.test(status1))throw new Error('visible harness status does not expose settling state');

  const battery=await page.evaluate(async()=>{await window.JMAGI_TEST.runBattery();return window.JMAGI_TEST.getState().batteryRuns[0]});
  console.log('BATTERY',JSON.stringify({passed:battery.passed,total:battery.total,successPct:battery.successPct,processRestartPct:battery.processRestartPct}));
  if(battery.total!==60||battery.passed!==60||battery.successPct!==100||battery.processRestartPct!==100)throw new Error('v1.4.4 battery not 60/60');

  await page.evaluate(()=>{
    localStorage.removeItem('jm_agi_lab_v1_4_4_state');
    localStorage.setItem('jm_agi_lab_v1_4_3_state',JSON.stringify({
      version:'1.4.3',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),
      goals:[],missions:[],memories:[{id:'migrate_probe',text:'v143 migration sentinel',tags:['test'],confidence:1,source:'test',createdAt:new Date().toISOString(),touchedAt:new Date().toISOString(),hits:0}],
      receipts:[],snapshots:[],batteryRuns:[],recoveries:0,
      world:{facts:{migration_probe:'yes'},evidence:{migration_probe:{confidence:1,source:'test',at:new Date().toISOString()}},actions:[],plans:[]},
      environment:{observations:[],latest:{},actuations:[],toolContacts:[],inquiries:[],sensorStats:{}},
      self:{policy:{minConfidence:.65,maxSteps:12,maxCycles:20,prefer:'adaptive'},episodes:[],audits:[],curriculum:[],frontier:[]},
      skills:[],learnedSkills:[],stats:{},lastPlan:[],lastOutput:'probe',lastStatus:'OPEN',adapter:{endpoint:'',model:''}
    }));
  });
  await page.goto(bodyUrl,{waitUntil:'load'});
  const migrated=await page.evaluate(()=>({version:window.JMAGI_TEST.getState().version,memories:window.JMAGI_TEST.getState().memories.map(x=>x.text),probe:window.JMAGI_TEST.getState().world.facts.migration_probe}));
  console.log('MIGRATION',JSON.stringify(migrated));
  if(migrated.version!=='1.4.4'||!migrated.memories.includes('v143 migration sentinel')||migrated.probe!=='yes')throw new Error('v1.4.3 -> v1.4.4 migration failed');
  console.log('V144_UI_BATTERY_MIGRATION_PASS');
}finally{kill()}