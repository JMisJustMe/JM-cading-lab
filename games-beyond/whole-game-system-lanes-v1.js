/* JM Games & Beyond — CP26 additive lanes; existing game source and mount authority untouched.
   Public shell never bundles owner-private indexes or game HTML. Owner JSON import stays local. */
(function(){
'use strict';
var VERSION='2026-11-21-cp26';
var STORE='JM.GamesBeyond.ownerSourceIndex.cp26';
var ENGINES=[
['GameForge','gameforge','Game-first creation, separate original engine'],
['GlyphPlay','glyphplay','Creator-first game-body engine; version lineage preserved'],
['GlyphForge','glyphforge','Glyph and touch-logic forge, separate from GlyphPlay'],
['PLAYFORM','playform','Playable expression framework / sister system'],
['JM GameCore','gamecore','Original game-loop core and three-game integration'],
['JM Game Native Core','game-native-core','Native game-code bridge, separate source'],
['Kading Game Estate','','Independent game-creation family; source/host contact needed'],
['PlayZone World Studio','','Separate authored world/game creation studio'],
['JaggedMirror Game Lab','','Distinct source engine family; contact pending'],
['JMStudios Game Workshop','','Protected local-import originals; no public auto-mount']
];
var LOOPS=[
['Aiming Run','aiming-run','v0.1A known public loop/proof body'],
['Drag & Aim Loop Kernel','drag-aim','v0.9.9 known public touch-and-trajectory loop'],
['JM Combound Kinetics','combound','v0.7 historical combat donor, not modern COMBOUND Original'],
['Route Catch / Catching Run','','Earlier JM GameCore integration; exact direct loop door needs verification'],
['Aim / Drag / Cannon Loop','','Historical mechanic proof; not an extra finished game'],
['Hockey Puck Loop','','Historical loop; current executable head unverified'],
['Ping-pong / Paddle Puck Loop','','Historical loop; current executable head unverified'],
['Push-goal / Side-lane Loop','','Historical loop; current executable head unverified'],
['Raining-shapes Catch','','Historical loop; current executable head unverified'],
['Physics Prober','','Original proof/mechanism lead; standalone runtime unverified']
];
var CARTRIDGES=[
['Pulse Orbit','1.0','JM RouteOS first-party cartridge'],
['Seed Runner','1.0','JM RouteOS first-party cartridge'],
['Rebound Route','0.8.5','JM RouteOS first-party cartridge']
];
var body=null, tab='games', query='',kind='all',pack=null;
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function norm(v){return String(v||'').normalize('NFKC').toLowerCase().replace(/[’]/g,"'").replace(/\s+/g,' ').trim();}
function originalRows(){try{return typeof R!=='undefined'&&Array.isArray(R)?R:[];}catch(e){return [];}}
function publicDoor(id){return './?jm-play='+encodeURIComponent(id);}
function smallCard(title,meta,proof,url,verb){
return '<article class="gb26-card"><h3>'+esc(title)+'</h3><p>'+esc(meta)+'</p><p class="gb26-proof">'+esc(proof)+'</p>'+(url?'<a href="'+esc(url)+'">'+esc(verb||'OPEN EXISTING EDITION')+'</a>':'<span class="gb26-hold">SOURCE / ROUTE HOLD — NO FALSE PLAY</span>')+'</article>';
}
function countSummary(){
var r=originalRows();
var summary=document.getElementById('gb26-summary');
if(summary)summary.textContent=r.length+' public catalogue rows · '+ENGINES.length+' identified engine families · '+LOOPS.length+' public loop leads · '+CARTRIDGES.length+' RouteOS cartridges'+(pack?' · '+pack.records.length+' owner source headings / '+pack.loopSources.length+' donor-associated loop records locally loaded':' · private source index not imported');
}
function match(s){return !query||norm(s).includes(norm(query));}
function render(){
var items=[],rows=originalRows();
if(tab==='games'){
  items.push('<div class="gb26-guide"><h3>Games — existing A–Z is the game floor</h3><p>The full '+rows.length+'-record public catalogue remains directly below. Every game, descendant, family and historical hold retains its existing identity. A route only opens an actually registered carrier; private exact-source HTML stays on the owner device.</p><p><a href="#catalog">OPEN CURRENT GAME CATALOGUE</a> · <a href="./?jm-room=proof#view-proof">IMPORT EXACT ORIGINAL HTML INTO HOUSE</a></p></div>');
  if(pack){var gameContacts=pack.records.filter(function(x){return x.kind==='game_candidate'&&match(x.name);});items.push('<p class="gb26-count">'+gameContacts.length+' owner-only game candidates from the recovered A–Z; candidates are not unique confirmed games. Switch to OWNER INDEX to inspect them and source evidence.</p>');}
}else if(tab==='engines'){
  ENGINES.forEach(function(x){if(match(x.join(' ')))items.push(smallCard(x[0],x[2],'Independent original engine family; available public edition shown when mounted; latest private head may differ.',x[1]?publicDoor(x[1]):'',x[1]?'OPEN / CREATE IN HOUSE':null));});
  if(pack){pack.engineDonors.forEach(function(x){if(match(x.name+' '+x.role+' '+x.status))items.push(smallCard(x.name,'Recovered source donor · '+x.role,'Version / donor '+x.status+'; private source not published or silently crowned.',''));});}
}else if(tab==='loops'){
  LOOPS.forEach(function(x){if(match(x.join(' ')))items.push(smallCard(x[0],x[2],'A playable loop or mechanism is not automatically a whole game.',x[1]?publicDoor(x[1]):'',x[1]?'OPEN EXISTING LOOP':''));});
  if(pack){pack.loopSources.forEach(function(x,i){var d=pack.engineDonors[x.sourceDonorIndex];var title=x.name+' · '+(d?d.name:'unresolved donor');if(match(title))items.push(smallCard(title,'Source-associated mechanism '+(i+1)+' / '+pack.loopSources.length,'Donor relationship only; no standalone playable-door claim.',''));});}
}else if(tab==='cartridges'){
  items.push('<p class="gb26-guide">These are actual separate first-party RouteOS cartridge identities. The existing Cartridge Bay is the entrance; select the cartridge there. Neither a historical version nor a source-only entry is auto-upgraded.</p>');
  CARTRIDGES.forEach(function(x){if(match(x.join(' ')))items.push(smallCard(x[0]+' · '+x[1],x[2],'RouteOS runtime entrance verified as source; owner physical long-play remains separate.','routeos/runtime/index.html','OPEN ROUTEOS CARTRIDGE BAY'));});
  items.push('<p class="gb26-guide">Other game versions remain independently preserved as source cartridges. Open the original game in the House, or import its verified exact HTML locally; no auto-selecting an unverified current keeper.</p>');
  rows.forEach(function(r){if(match(r[0]+' '+r[2]))items.push(smallCard(r[0],r[2]||'Version unrecorded',r[3],r[6]||'',r[6]?'OPEN LINKED EDITION':'SOURCE REFERENCE'));});
}else if(tab==='owner'){
  if(!pack){items.push('<div class="gb26-guide"><h3>Private A–Z source index not loaded</h3><p>The larger working inventory stays on your device rather than being copied into this public repository. Import the owner JSON once per browser profile to add every recovered original-source heading, donor version and associated loop to this same House view.</p></div>');}
  else{
    var names=new Set(rows.map(function(x){return norm(x[0]);}));
    var list=pack.records.filter(function(x){return (kind==='all'||x.kind===kind)&&match(x.name+' '+x.evidence);});
    items.push('<p class="gb26-count">'+list.length+' matching original source headings; '+pack.records.length+' retained. Direct catalogue matches keep their existing playable records instead of being doubled.</p>');
    list.slice(0,500).forEach(function(x){var direct=names.has(norm(x.name));items.push(smallCard(x.name,(x.kind||'source_evidence').replace(/_/g,' ')+' · A–Z source record '+x.recordOrdinal,direct?'Existing public catalogue identity matched; this is additional source context.':'Unreconciled source reference: not independently crowned as a new game.',(x.publicSourceRefs||[]).find(function(u){return /^https:\/\/(github\.com|jmisjustme\.github\.io)\//.test(u);})||'',direct?'OPEN REFERENCE':'VIEW CITED PUBLIC SOURCE'));});
  }
}
var el=document.getElementById('gb26-grid');if(el)el.innerHTML=items.length?items.join(''):'<p class="gb26-guide">No matching records in this lane.</p>';
countSummary();
}
function setTab(next){tab=next;document.querySelectorAll('[data-gb26-tab]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.gb26Tab===tab));});var filter=document.getElementById('gb26-kind');if(filter)filter.hidden=tab!=='owner';render();}
function validate(x){
if(!x||x.schema!=='JM.GamesBeyondOwnerSourcePack/1.0'||!Array.isArray(x.records)||!Array.isArray(x.engineDonors)||!Array.isArray(x.loopSources))throw Error('Not a JM Games & Beyond owner source index.');
if(x.records.length>10000||x.engineDonors.length>1000||x.loopSources.length>20000)throw Error('Unexpected owner pack size.');
for(var i=0;i<x.records.length;i++)if(!x.records[i]||typeof x.records[i].name!=='string'||x.records[i].name.length>500)throw Error('Invalid record '+i);
return x;
}
function load(){try{var x=localStorage.getItem(STORE);if(x)pack=validate(JSON.parse(x));}catch(err){pack=null;}render();}
function setup(){
if(document.getElementById('gb26-root'))return;
var root=document.createElement('section');root.id='gb26-root';root.setAttribute('aria-label','Full Games, Loops, Engines and owner source map');
root.innerHTML='<style>#gb26-root{margin:14px 0;border:1px solid #5c8da7;border-radius:18px;padding:13px;background:#0a1524}#gb26-root h2{margin:0 0 7px}#gb26-root p{line-height:1.5;color:#d4e1ed}#gb26-root a{color:#8de9ff}#gb26-root button,#gb26-root select,#gb26-root input{min-height:45px;border:1px solid #52718a;border-radius:11px;background:#101f35;color:#fff;padding:8px 11px;font:inherit}#gb26-root button{cursor:pointer;font-weight:750}#gb26-root button[aria-pressed="true"]{border:2px solid #ffe08d;color:#ffe08d}#gb26-root .gb26-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}#gb26-root .gb26-search{display:flex;gap:8px;flex-wrap:wrap}#gb26-root .gb26-search input{flex:1 1 220px;min-width:0}#gb26-root .gb26-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));gap:9px;margin-top:13px}#gb26-root .gb26-card,#gb26-root .gb26-guide{padding:13px;border:1px solid #385273;border-radius:12px;background:#101b2d}#gb26-root .gb26-card h3{margin:0;font-size:1rem}#gb26-root .gb26-card p{margin:7px 0;font-size:.8rem}#gb26-root .gb26-proof{color:#afc0d0}#gb26-root .gb26-card a{display:inline-flex;min-height:42px;align-items:center}#gb26-root .gb26-hold{font-size:.72rem;color:#ffcf95}#gb26-root .gb26-count{font-weight:700}#gb26-root .gb26-privacy{font-size:.76rem}</style>'+
'<h2>All games · playable loops · original game engines</h2><p id="gb26-summary">Reading the existing Game House…</p><p class="gb26-privacy">One entrance, separate originals. Public rooms, owner-local sources, version cartridges and evidence stay distinguishable. Import does not send files to a server or auto-publish games.</p>'+
'<div class="gb26-tabs" role="group" aria-label="JM game system lanes"><button type="button" data-gb26-tab="games">GAMES</button><button type="button" data-gb26-tab="loops">PLAYABLE LOOPS</button><button type="button" data-gb26-tab="engines">GAME ENGINES</button><button type="button" data-gb26-tab="cartridges">VERSIONS / CARTRIDGES</button><button type="button" data-gb26-tab="owner">OWNER SOURCE INDEX</button></div>'+
'<div class="gb26-search"><input id="gb26-query" type="search" placeholder="Find a game, mechanic, engine, original, version…" aria-label="Search chosen game lane"><select id="gb26-kind" hidden aria-label="Owner index record type"><option value="all">All source records</option><option value="game_candidate">Game candidates</option><option value="loop_candidate">Loop candidates</option><option value="engine_candidate">Engine candidates</option><option value="source_evidence">Supporting source/evidence</option></select><button type="button" id="gb26-import">IMPORT OWNER SOURCE INDEX · LOCAL</button><button type="button" id="gb26-clear" title="Clears only this browser’s cached owner index, never the original source file">UNLOAD LOCAL INDEX</button><input id="gb26-file" type="file" accept=".json,application/json" hidden></div>'+
'<p id="gb26-message" role="status" aria-live="polite" class="gb26-privacy">Your original HTML source continues to mount through the existing Games House importer.</p>'+
'<div id="gb26-grid" class="gb26-grid" aria-live="polite"></div>';
var anchor=document.getElementById('catalog');if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(root,anchor);else (document.querySelector('main')||document.body).appendChild(root);
document.querySelectorAll('[data-gb26-tab]').forEach(function(b){b.addEventListener('click',function(){setTab(b.dataset.gb26Tab);});});
document.getElementById('gb26-query').addEventListener('input',function(e){query=e.target.value.slice(0,200);render();});
document.getElementById('gb26-kind').addEventListener('change',function(e){kind=e.target.value;render();});
document.getElementById('gb26-import').addEventListener('click',function(){document.getElementById('gb26-file').click();});
document.getElementById('gb26-clear').addEventListener('click',function(){if(!confirm('Unload the locally cached owner source index from this browser? Original JSON and game source files remain unchanged.'))return;try{localStorage.removeItem(STORE);}catch(e){}pack=null;document.getElementById('gb26-message').textContent='Local index unloaded. Originals were not altered.';render();});
document.getElementById('gb26-file').addEventListener('change',async function(e){var file=e.target.files&&e.target.files[0];if(!file)return;var message=document.getElementById('gb26-message');try{if(file.size>5000000)throw Error('Index too large for this bounded importer.');var imported=validate(JSON.parse(await file.text()));var text=JSON.stringify(imported);localStorage.setItem(STORE,text);pack=imported;message.textContent='Owner source index loaded locally: '+pack.records.length+' A–Z headings, '+pack.engineDonors.length+' donor source records, '+pack.loopSources.length+' source-associated loops. No file sent to GitHub.';setTab('owner');}catch(err){message.textContent='Import held: '+err.message;}finally{e.target.value='';}});
load();setTab('games');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();