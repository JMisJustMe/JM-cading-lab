
const $ = (q,root=document)=>root.querySelector(q);
const $$ = (q,root=document)=>Array.from(root.querySelectorAll(q));
const VERSION = "v5.7R";
const STORE_KEY = "tracebox_routebox_v5_7R_runs";
const STATES = [
  ["Inside","Before","Open","Input","Ready Intake","Intake"],
  ["Inside","Before","Open","Output","Premature Release","Output"],
  ["Inside","Before","Closed","Input","Stored Potential","Memory"],
  ["Inside","Before","Closed","Output","Blocked Output","Boundary"],
  ["Inside","After","Open","Input","Late Intake","Intake"],
  ["Inside","After","Open","Output","Clean Activation","Output"],
  ["Inside","After","Closed","Input","Locked Memory","Memory"],
  ["Inside","After","Closed","Output","Contained Result","Boundary"],
  ["Outside","Before","Open","Input","External Intake","Intake"],
  ["Outside","Before","Open","Output","Early External Signal","Output"],
  ["Outside","Before","Closed","Input","Protected Boundary","Boundary"],
  ["Outside","Before","Closed","Output","Suppressed Leak","Boundary"],
  ["Outside","After","Open","Input","After-Contact Intake","Intake"],
  ["Outside","After","Open","Output","External Release","Output"],
  ["Outside","After","Closed","Input","Quarantine / Isolation","Boundary"],
  ["Outside","After","Closed","Output","Sealed Consequence","Memory"]
];
const OPS = ["Force","Lift","Slide","Drag","Hold","Release","Delay","Reset","Split","Merge","Block","Store","Trigger","Trace","Observe"];
const DRIFT = ["Space","Time","Height","Gate","Operator","Material","Signal","Meaning","Memory","Reset"];
const CORRECT = ["Re-route","Re-time","Raise View","Re-gate","Re-operator","Re-material","Re-signal","Re-label","Re-reset","Re-run"];
let runs = [];
let lastRun = null;
function save(){ localStorage.setItem(STORE_KEY, JSON.stringify(runs)); }
function load(){ try{ runs = JSON.parse(localStorage.getItem(STORE_KEY)||"[]"); }catch(e){ runs=[]; } renderArchive(); }
function populate(){
  const op = $('#operator'); OPS.forEach(x=>op.add(new Option(x,x)));
  const dc = $('#driftCategory'); DRIFT.forEach(x=>dc.add(new Option(x,x)));
  const cc = $('#correction'); CORRECT.forEach(x=>cc.add(new Option(x,x)));
  const scenario = $('#scenario'); ["Physical device","GlyphPlay / game engine","Human / language","AI / translucent box","FTR / prototype","Humanimals / body-world","Music / voice","Public output","Custom"].forEach(x=>scenario.add(new Option(x,x)));
}
function stateFor(space,time,route,role){ return STATES.find(s=>s[0]===space && s[1]===time && s[2]===route && s[3]===role) || STATES[0]; }
function bitIndex(space,time,route,role){ return (space==='Outside'?8:0)+(time==='After'?4:0)+(route==='Closed'?2:0)+(role==='Output'?1:0); }
function heightNote(h){ return h==='High'?'sees input/gates/timing/state/output/trace/reset':h==='Mid'?'sees gates and immediate result':'sees local action only'; }
function outcome(expected, actual, selected){
  if(selected && selected !== 'Auto') return selected;
  if(!actual.trim()) return 'Run';
  const a=actual.toLowerCase(), e=expected.toLowerCase();
  if(a.includes(e) || e.includes(a)) return 'Match';
  if(a.includes('break') || a.includes('fail') || a.includes('blocked') || a.includes('crash')) return 'Break';
  return 'Drift';
}
function traceFor(r){
  return `${r.input || 'Input'} entered ${r.space} route at ${r.time} timing. The route was ${r.route}. The system was in ${r.role} role. Therefore state became ${r.state}.\n\nHeight-View: ${r.height} — ${heightNote(r.height)}.\nOperator: ${r.operator}.\nExpected: ${r.expected || 'not set'}.\nActual: ${r.actual || 'not recorded yet'}.\nCalibration: ${r.outcome}. ${r.outcome==='Match'?'Preserve route.':r.outcome==='Drift'?'Inspect drift and correct.':r.outcome==='Break'?'Repair model or material route.':'Run again when actual result exists.'}\nRecovery: ${r.correction} through ${r.driftCategory} check.\nKeeper: A mismatch is not failure. It is route information.`;
}
function runRoute(){
  const input = $('#inputName').value.trim() || 'Unnamed input';
  const scenario = $('#scenario').value;
  const space = $('#space').value, time = $('#time').value, route = $('#route').value, role = $('#role').value;
  const height = $('#height').value, operator = $('#operator').value;
  const expected = $('#expected').value.trim(); const actual = $('#actual').value.trim();
  const selectedOutcome = $('#outcome').value;
  const driftCategory = $('#driftCategory').value; const correction = $('#correction').value;
  const state = stateFor(space,time,route,role); const idx = bitIndex(space,time,route,role);
  const r = {id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), version: VERSION, createdAt:new Date().toISOString(), input, scenario, space,time,route,role,height,operator,expected,actual, state:state[4], family:state[5], stateIndex:idx, outcome:outcome(expected || state[4], actual, selectedOutcome), driftCategory, correction, notes:$('#notes').value.trim()};
  r.trace = traceFor(r); r.summary = `${r.input} → ${r.state} · ${r.outcome}`;
  lastRun = r; runs.unshift(r); save(); animate(r); renderResult(r); renderArchive(); setTab('cockpit'); setTimeout(()=>$('#resultPanel').scrollIntoView({block:'start',behavior:'smooth'}),120);
}
function animate(r){
  const pct = 20 + ((r.stateIndex+1)/16)*75; $('.routeFill').style.width = pct+'%'; $('.water').style.height = Math.max(14, pct)+'%'; $('.signal').classList.toggle('on', ['Output','Boundary','Memory'].includes(r.family) || r.role==='Output');
  $$('.node').forEach(n=>n.classList.remove('live'));
  ['input','routeNode','stateNode','signalNode','traceNode'].forEach((id,i)=>setTimeout(()=>$('#'+id).classList.add('live'),i*120));
  $('#machineState').textContent = r.state; $('#machineFamily').textContent = r.family; $('#machineOutcome').textContent = r.outcome;
}
function renderResult(r){
  $('#emptyResult').style.display='none'; $('#resultBody').style.display='block';
  $('#snapInput').textContent=r.input; $('#snapState').textContent=r.state; $('#snapOutcome').textContent=r.outcome; $('#snapFamily').textContent=r.family; $('#snapRoute').textContent=`${r.space}/${r.time}/${r.route}/${r.role}`; $('#snapCorrection').textContent=r.correction;
  $('#humanSummary').textContent = `${r.input} became ${r.state}. ${r.outcome} through ${r.driftCategory}; next correction: ${r.correction}.`;
  $('#traceText').textContent=r.trace;
}
function renderArchive(){
  const log=$('#runLog'); if(!log) return; $('#runCount').textContent = `${runs.length} runs`;
  if(!runs.length){ log.innerHTML='<p class="muted">No saved runs yet.</p>'; return; }
  log.innerHTML = runs.slice(0,40).map(r=>`<div class="runItem"><h4>${escapeHtml(r.summary)}</h4><div class="tiny">${new Date(r.createdAt).toLocaleString()} · ${escapeHtml(r.scenario)} · ${escapeHtml(r.space)} / ${escapeHtml(r.time)} / ${escapeHtml(r.route)} / ${escapeHtml(r.role)}</div><p>${escapeHtml(r.trace.split('\n')[0])}</p><button class="btn" data-open="${r.id}">Open</button></div>`).join('');
  $$('[data-open]').forEach(b=>b.onclick=()=>{ const r=runs.find(x=>x.id===b.dataset.open); if(r){lastRun=r; renderResult(r); setTab('cockpit'); $('#resultPanel').scrollIntoView({behavior:'smooth'});} });
}
function exportJSON(){ download(`tracebox_routebox_${VERSION}_runs_${Date.now()}.json`, JSON.stringify({app:'TraceBox / RouteBox',version:VERSION,exportedAt:new Date().toISOString(),runs},null,2),'application/json'); }
function exportMarkdown(){ const r=lastRun || runs[0]; if(!r){alert('No run to export yet.');return;} download(`tracebox_routebox_${VERSION}_run_${r.id}.md`, `# TraceBox / RouteBox ${VERSION} Run\n\n## Summary\n${r.summary}\n\n## Snapshot\n- Input: ${r.input}\n- Scenario: ${r.scenario}\n- Gates: ${r.space} / ${r.time} / ${r.route} / ${r.role}\n- Height: ${r.height}\n- Operator: ${r.operator}\n- State: ${r.state}\n- Family: ${r.family}\n- Outcome: ${r.outcome}\n- Drift: ${r.driftCategory}\n- Correction: ${r.correction}\n\n## Trace\n${r.trace}\n\n## Notes\n${r.notes || ''}\n`, 'text/markdown'); }
function importJSON(file){ const reader=new FileReader(); reader.onload=()=>{ try{ const data=JSON.parse(reader.result); const incoming=Array.isArray(data)?data:(data.runs||[]); runs=[...incoming,...runs]; save(); renderArchive(); alert(`Imported ${incoming.length} runs.`);}catch(e){alert('Import failed: '+e.message);} }; reader.readAsText(file); }
function clearRuns(){ if(confirm('Clear local TraceBox archive in this browser?')){ runs=[]; save(); renderArchive(); } }
function download(name, text, type){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),500); }
function copyTrace(){ const text = $('#traceText').textContent || ''; if(!text){return;} navigator.clipboard?.writeText(text).then(()=>toast('Trace copied')).catch(()=>alert(text)); }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1500); }
function setTab(id){ $$('.tab').forEach(t=>t.classList.toggle('active',t.id===id)); $$('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===id)); }
function renderMap(){ const tb=$('#stateRows'); tb.innerHTML=STATES.map((s,i)=>`<tr><td>${i.toString().padStart(2,'0')}</td><td>${s[0]}</td><td>${s[1]}</td><td>${s[2]}</td><td>${s[3]}</td><td><b>${s[4]}</b></td><td>${s[5]}</td></tr>`).join(''); }
function renderReadiness(){
  const sw = location.protocol==='http:' || location.protocol==='https:';
  $('#modeStatus').textContent = sw ? 'HTTP/HTTPS PWA-capable mode' : 'Quick-file mode: direct-open works; service worker install needs HTTP/HTTPS';
  $('#localStatus').textContent = (()=>{try{localStorage.setItem('tb_test','1');localStorage.removeItem('tb_test');return 'localStorage available';}catch(e){return 'localStorage blocked';}})();
  $('#swStatus').textContent = sw && 'serviceWorker' in navigator ? 'service worker available' : 'service worker skipped / unavailable in this mode';
}
function escapeHtml(s){return String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}
function wire(){
  $$('.nav button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
  $('#runBtn').onclick=runRoute; $('#dockRun').onclick=runRoute; $('#dockResult').onclick=()=>$('#resultPanel').scrollIntoView({behavior:'smooth'}); $('#dockSave').onclick=exportJSON; $('#dockTop').onclick=()=>scrollTo({top:0,behavior:'smooth'}); $('#jumpResult').onclick=()=>$('#resultPanel').scrollIntoView({behavior:'smooth'}); $('#calibrateShortcut').onclick=()=>setTab('calibrate');
  $('#copyTrace').onclick=copyTrace; $('#exportJson').onclick=exportJSON; $('#exportMd').onclick=exportMarkdown; $('#clearRuns').onclick=clearRuns; $('#importFile').onchange=e=>e.target.files[0]&&importJSON(e.target.files[0]);
  $('#openTrace').onclick=()=>{ $('#modalTrace').textContent = lastRun ? lastRun.trace : $('#traceText').textContent; $('#modal').classList.add('show');}; $('#closeModal').onclick=()=>$('#modal').classList.remove('show');
  $('#downloadSpec').onclick=()=>download(`TraceBox_RouteBox_${VERSION}_BUILD_PLAN.md`, BUILD_PLAN, 'text/markdown');
}
const BUILD_PLAN = `# TraceBox / RouteBox v5.7R Build Plan\n\n## Law\nBuild in ChatGPT, but become a real standalone app outside ChatGPT.\n\n## Boundary\nThis v5.7R body is a recovery build from estate-confirmed v5.7 receipt plus locked source-model spine. Original v5.7 bytes were not recovered in this chat.\n\n## Run law\nChoose scenario → set gates → run input → read state → compare expected/actual → recover route.\n\n## Next proof\nAndroid direct-open quick-file test, then deployed/local-server PWA install test.\n`;
function init(){ populate(); renderMap(); renderReadiness(); wire(); load(); renderArchive(); if('serviceWorker' in navigator && (location.protocol==='http:'||location.protocol==='https:')){ navigator.serviceWorker.register('./sw.js').catch(()=>{}); } }
document.addEventListener('DOMContentLoaded', init);
