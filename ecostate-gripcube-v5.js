(()=>{"use strict";
const FACE=[
{id:"trace",name:"TRACE",q:"What remains?",color:"#b879ff",copy:"Source, history, residue, versions and receipts. Trace helps recover a body without pretending the trace is the body."},
{id:"route",name:"ROUTE",q:"Where does it go?",color:"#ffc857",copy:"Active exits, handoffs and neighbouring rooms. A route connects bodies without merging their identities."},
{id:"form",name:"FORM",q:"What shape now?",color:"#58bfff",copy:"The current expression: game, app, theory, release, service, registry or other public form."},
{id:"field",name:"FIELD",q:"What holds it?",color:"#3ce0cf",copy:"The systems, hosts, rules, dependencies and conditions that keep the body available."},
{id:"proof",name:"PROOF",q:"What confirms it?",color:"#ff78b1",copy:"Contact, runtime, deployment, source and receipts. HOLD remains visible where proof has not been earned."},
{id:"use",name:"USE",q:"What is it for?",color:"#ffe16a",copy:"What this body lets a visitor do now: play, build, understand, create, publish, work or recover."}
];
const D=[
{id:"play",name:"PLAY",accent:"#ff7d9c",intro:"Games and playable systems — direct contact, controls and consequence.",items:[
["Games & Beyond","Sovereign playable house.","./games-beyond/"],
["All Games","Current game inventory surface.","./games-beyond/all-games.html"],
["Fight Clash","Open-ring public body.","./games-beyond/bodies/fight-clash-v0-4.html"],
["FUTARIZED","Game-of-Game public body.","./games-beyond/bodies/futarized-v1-2.html"],
["Aiming Run","Movement-pressure proof body.","./games-beyond/bodies/aiming-run-v0-1a.html"],
["Drag & Aim","Reusable touch / trajectory organ.","./games-beyond/bodies/drag-aim-loop-kernel-v0-9-9.html"],
["Games Direction","Current direction ledger.","./games-beyond/recent-direction/"],
["Games Registry","Mounted public body register.","./games-beyond/registry.json"],
["Game Inventory","Current inventory contract.","./games-beyond/current-game-inventory.json"]]},
{id:"build",name:"BUILD",accent:"#58bfff",intro:"Software, runtimes, applications and systems that make or transform other bodies.",items:[
["JM EveryBody","Current canonical-native fabric.","./coding-estate/everybody/00_OPEN_FIRST.html"],
["Native Workbench","EveryBody native workbench.","./coding-estate/everybody/canonical-native-v2.html"],
["Apps House","Governed non-game apps house.","./apps/"],
["Fresh App Lab","Connected app-proof room.","./fresh-app-lab/"],
["Cading Lab","Public Cading route.","./cading.html"],
["Capability Law","Capability/access authority gate.","./governance/capability-access-authority-law/"],
["Coding Registry","EveryBody source registry.","./coding-estate/everybody/body-registry.json"],
["Estate Bridge","Legacy connected Estate bridge.","./estate/"],
["Public Authority","Estate Head public contract.","./registry/estate-head-public-current.json"]]},
{id:"think",name:"THINK",accent:"#b879ff",intro:"Theory, epistemology, language and human-system bodies with source depth preserved.",items:[
["Theory Multihub","Current public Theory house.","./theory/"],
["Cause Must Pass","Dedicated complete theory body.","./theory/cause-must-pass/00_OPEN_FIRST.html"],
["BIOHOUSE","Nervous Signal Route v1.1.","./theory/biohouse-nervous-signal-route/"],
["TraSta","Trace–Stance scoped method.","./theory/trasta/"],
["Reality / Route / Meaning","Completed ethos synthesis.","./theory/reality-route-ethos/"],
["Theory Registry","Current Theory Wing map.","./registry/theory-wing.json"],
["Capability Law","Architectural authority gate.","./governance/capability-access-authority-law/"],
["Recent Convergence","Recent public-state convergence.","./recent/"],
["Estate Head","Current public authority contract.","./registry/estate-head-public-current.json"]]},
{id:"create",name:"CREATE",accent:"#ff9b55",intro:"Music, lyrics, authored forms and creator-facing bodies without flattening their source lineages.",items:[
["Lyrics & Music","Whole-Estate public music door.","./lyrics/"],
["Authuser","Creator-facing public bridge.","./author/authuser.html"],
["Author / Source Creator","Current public author body.","./author/"],
["Press / Collaboration","Book, press and collaboration pack.","./author/press-kit/"],
["Games Creation","Creator engines inside Games & Beyond.","./games-beyond/"],
["Apps & Tools","Working creator/app surfaces.","./apps/"],
["JM EveryBody","Coding/cading creation fabric.","./coding-estate/everybody/"],
["Theory Multihub","Authored conceptual bodies.","./theory/"],
["ECOSTATE Front Door","Return to current public house.","./"]]},
{id:"publish",name:"PUBLISH",accent:"#ffd166",intro:"Outward bodies, releases and public projections with proof and lineage still attached.",items:[
["Press / Book Pack","Public press/book/collaboration pack.","./author/press-kit/"],
["Author Public Body","Author/source creator projection.","./author/"],
["Lyrics & Music","Public-safe music projection.","./lyrics/"],
["Theory House","Public Theory multihub.","./theory/"],
["Games House","Public playable house.","./games-beyond/"],
["Apps House","Public app/tool house.","./apps/"],
["Money Menu","Public contact/value carrier.","./money-menu/"],
["Recent Convergence","Current public-state projection.","./recent/"],
["Estate Registry","Central public route map.","./registry/estate-map.json"]]},
{id:"work",name:"WORK",accent:"#78e995",intro:"Commercial, professional and value-return routes — scope, offer, contact and receipt.",items:[
["Money Menu","Public contact/value carrier.","./money-menu/"],
["Press / Collaboration","Current collaboration route.","./author/press-kit/"],
["Apps & Tools","Public product/tool house.","./apps/"],
["JM EveryBody","Software/cading workbench.","./coding-estate/everybody/"],
["Games & Beyond","Playable product house.","./games-beyond/"],
["Public Authority","Current public-state contract.","./registry/estate-head-public-current.json"],
["JM LEGAL","Formation/pre-contact: not public yet.",null,"HOLD"],
["RUKQUSS REALITY LTD","Intended company: pre-incorporation.",null,"HOLD"],
["Recovery / Referral","Continue or hand off without false crown.","./recovery/"]]},
{id:"continue",name:"CONTINUE",accent:"#3ce0cf",intro:"Recovery, provenance and continuity — return to the current body, not merely an earlier point.",items:[
["Recovery Gate","Permanent straggler recovery route.","./recovery/"],
["Recent Convergence","Recent routes and boundaries.","./recent/"],
["Estate Head","Current public authority.","./registry/estate-head-public-current.json"],
["Estate Registry","Central Estate route map.","./registry/estate-map.json"],
["Theory Registry","Current Theory map.","./registry/theory-wing.json"],
["Games Direction","Current game direction ledger.","./games-beyond/recent-direction/"],
["Money Menu Receipt","Publication/contact receipt.","./registry/money-menu-publication-receipt-v1.2.json"],
["Capability Law","Owner authority gate.","./governance/capability-access-authority-law/"],
["Owner Room","Local owner continuity tools.","./#owner"]]}
];
const S={district:0,face:"trace",tile:0,x:-18,y:28,drag:null,live:new Set()};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function mount(){
 const estate=document.querySelector("#view-estate .hero");if(!estate||document.querySelector(".eco-gripcube"))return;
 const section=document.createElement("section");section.className="eco-gripcube shell-section";section.id="gripcube";
 section.innerHTML=`<div class="gc-shell"><header class="gc-head"><div><div class="gc-kicker">GRIPCUBE · ECOSTATE NAVIGATION BODY</div><h2>Turn through the Estate.</h2><p>Horizontal changes major territory. Vertical stays inside the active room. Rotation changes the lens. Contact opens the body.</p></div><div class="gc-count"><b id="gcCount">1 / 7</b><small>MAJOR ROOM</small></div></header><nav class="gc-districts" id="gcDistricts" aria-label="ECOSTATE districts"></nav><div class="gc-body"><div class="gc-cube-side"><div class="gc-scene" id="gcScene" aria-label="GripCube. Drag to rotate. Choose a semantic lens below."><div class="gc-cube" id="gcCube"><div class="gc-face gc-trace"><b>TRACE</b><small>What remains?</small></div><div class="gc-face gc-route"><b>ROUTE</b><small>Where does it go?</small></div><div class="gc-face gc-form"><b>FORM</b><small>What shape now?</small></div><div class="gc-face gc-field"><b>FIELD</b><small>What holds it?</small></div><div class="gc-face gc-proof"><b>PROOF</b><small>What confirms it?</small></div><div class="gc-face gc-use"><b>USE</b><small>What is it for?</small></div></div><div class="gc-hint">DRAG CUBE · TAP LENS · SWIPE ROOM</div></div><div class="gc-lenses" id="gcLenses"></div></div><div class="gc-content"><div class="gc-lens-copy"><span id="gcLensKicker"></span><h3 id="gcLensTitle"></h3><p id="gcLensCopy"></p></div><div class="gc-move"><div>HORIZONTAL<br>ROOM</div><div>VERTICAL<br>INSIDE</div><div>ROTATE<br>LENS</div><div>CONTACT<br>SELECT</div><div>DEPTH<br>OPEN</div></div><div class="gc-grid" id="gcGrid"></div><div class="gc-contact"><span id="gcRoomKicker"></span><h3 id="gcContactTitle"></h3><p id="gcContactCopy"></p><div class="gc-actions"><button class="gc-open" id="gcOpen">OPEN BODY</button><button class="gc-proof-link" id="gcProof">PROOF / LINEAGE</button></div></div></div></div></div>`;
 estate.insertAdjacentElement("afterend",section);
 const actions=document.querySelector("#view-estate .hero-actions");if(actions&&!actions.querySelector(".gc-enter")){const b=document.createElement("button");b.className="button secondary gc-enter";b.type="button";b.textContent="Enter the GripCube";b.onclick=()=>section.scrollIntoView({behavior:"smooth",block:"start"});actions.appendChild(b)}
 bind();render();syncRegistry();
}
function bind(){
 document.querySelector("#gcScene").addEventListener("pointerdown",e=>{S.drag={x:e.clientX,y:e.clientY,rx:S.x,ry:S.y};e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.classList.add("dragging");document.querySelector("#gcCube").classList.add("direct")});
 document.querySelector("#gcScene").addEventListener("pointermove",e=>{if(!S.drag)return;S.y=S.drag.ry+(e.clientX-S.drag.x)*.55;S.x=S.drag.rx-(e.clientY-S.drag.y)*.48;cube()});
 const up=e=>{S.drag=null;document.querySelector("#gcScene").classList.remove("dragging");document.querySelector("#gcCube").classList.remove("direct")};document.querySelector("#gcScene").addEventListener("pointerup",up);document.querySelector("#gcScene").addEventListener("pointercancel",up);
 let start=null;document.querySelector(".eco-gripcube").addEventListener("pointerdown",e=>{if(e.target.closest("button")||e.target.closest("#gcScene"))return;start={x:e.clientX,y:e.clientY}});
 document.querySelector(".eco-gripcube").addEventListener("pointerup",e=>{if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.35){S.district=(S.district+(dx<0?1:-1)+D.length)%D.length;S.tile=0;render()}});
 document.querySelector("#gcOpen").onclick=openTile;document.querySelector("#gcProof").onclick=()=>{S.face="proof";renderFace();const t=D[S.district].items[S.tile];if(t[2])location.href=t[2]};
}
function render(){
 const d=D[S.district];document.querySelector(".eco-gripcube").style.setProperty("--gc-accent",d.accent);document.querySelector("#gcCount").textContent=`${S.district+1} / ${D.length}`;
 document.querySelector("#gcDistricts").innerHTML=D.map((x,i)=>`<button class="gc-district ${i===S.district?"active":""}" data-d="${i}">${esc(x.name)}</button>`).join("");
 document.querySelectorAll(".gc-district").forEach(b=>b.onclick=()=>{S.district=Number(b.dataset.d);S.tile=0;render()});
 document.querySelector("#gcGrid").innerHTML=d.items.map((x,i)=>`<button class="gc-tile ${i===S.tile?"active":""} ${x[3]==="HOLD"?"hold":""}" data-t="${i}"><b>${esc(x[0])}</b><small>${esc(x[1])}</small><em>${String(i+1).padStart(2,"0")}</em></button>`).join("");
 document.querySelectorAll(".gc-tile").forEach(b=>b.onclick=()=>{S.tile=Number(b.dataset.t);renderContact()});
 document.querySelector("#gcRoomKicker").textContent=`${d.name} · CURRENT CONTACT`;renderFace();renderContact();
}
function renderFace(){
 const f=FACE.find(x=>x.id===S.face);document.querySelector(".eco-gripcube").style.setProperty("--gc-face",f.color);document.querySelector("#gcLensKicker").textContent=`${f.name} LENS`;document.querySelector("#gcLensTitle").textContent=f.q;document.querySelector("#gcLensCopy").textContent=f.copy;
 document.querySelector("#gcLenses").innerHTML=FACE.map(x=>`<button class="gc-lens ${x.id===S.face?"active":""}" data-f="${x.id}" style="--face:${x.color}"><b>${x.name}</b><small>${x.q}</small></button>`).join("");
 document.querySelectorAll(".gc-lens").forEach(b=>b.onclick=()=>{S.face=b.dataset.f;const p={trace:[-18,28],route:[-16,-58],form:[-16,58],field:[-18,208],proof:[72,28],use:[-108,28]}[S.face];S.x=p[0];S.y=p[1];cube();renderFace()});
}
function renderContact(){const t=D[S.district].items[S.tile],open=document.querySelector("#gcOpen");document.querySelector("#gcContactTitle").textContent=t[0];document.querySelector("#gcContactCopy").textContent=t[1];open.disabled=!t[2];open.textContent=t[2]?"OPEN BODY":"HOLD — NOT PUBLIC";document.querySelectorAll(".gc-tile").forEach((b,i)=>b.classList.toggle("active",i===S.tile))}
function openTile(){const t=D[S.district].items[S.tile];if(t[2])location.href=t[2]}
function cube(){document.querySelector("#gcCube").style.transform=`rotateX(${S.x}deg) rotateY(${S.y}deg)`}
async function syncRegistry(){try{const r=await fetch("./registry/estate-map.json",{cache:"no-store"});if(!r.ok)return;const j=await r.json();S.live=new Set((j.live_github_routes||[]).map(x=>"./"+String(x.path||"").replace(/^\.\//,"")));document.querySelector(".eco-gripcube").dataset.registryVersion=j.public_crown_version||"unknown"}catch(_){/* fallback routes stay usable */}}
window.JMGripCube={version:"5.0",districts:D,faces:FACE,state:S,proof:()=>({districts:D.length,faces:FACE.length,localRoutes:D.reduce((n,x)=>n+x.items.length,0),movement:["horizontal-room","vertical-inside","rotational-lens","contact-select","depth-open"],registryBacked:true,publicLaunch:false})};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
})();