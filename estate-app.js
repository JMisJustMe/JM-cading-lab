const FALLBACK = {
  estate: {
    laws: [
      'Connect does not mean merge', 'Selection before structure', 'Keeper before API',
      'Proof before packaging', 'Recover before rebuild', 'No Ding, No Claim'
    ],
    routes: [
      {id:'cading-lab',name:'Cading Lab',path:'./cading.html',state:'LIVE',kind:'Coding',role:'Current parser, feed and multi-line Cading prototype.'},
      {id:'everybody',name:'JM EveryBody',path:'./coding-estate/everybody/',state:'PORTABLE CONVERGENCE',kind:'Coding',role:'Sovereign compatibility and maximisation fabric across recovered coding bodies.'},
      {id:'fresh-app-lab',name:'Fresh App Lab',path:'./fresh-app-lab/',state:'LIVE',kind:'Tools',role:'Connected 12-app proof room and application laboratory.'},
      {id:'estate-bridge',name:'Estate Bridge',path:'./estate/',state:'LEGACY LIVE',kind:'Estate',role:'Previous public corridor and registry bridge, preserved as lineage.'},
      {id:'games-house',name:'Games & Beyond',path:'./games-beyond/',state:'EDITABLE HOST',kind:'Games',role:'Phone-first host for sovereign games, engines, loops, benchmarks and proofs.'}
    ]
  },
  games: [
    ['fourfold-arena','FOURFOLD Arena','v0.17','Playable Games','Living-body competitive arena / active flagship route','STAGE-READY'],
    ['futarized','FUTARIZED','v1.2','Playable Games','Game-of-Game / playable manual / earned convergence','STAGE-READY'],
    ['tboys-core-clash','T-Boys Core Clash','v0.1 Final Graft','Playable Games','T-Boys tactical crew clash game','STAGE-READY'],
    ['rim-route','JM Rim Route','v0.8.2','Playable Games','Portrait basketball / live dribble and ball contact','STAGE-READY'],
    ['crewbound-arena','Crewbound Arena','v0.5','Playable Games','Signature powers / living field arena','STAGE-READY'],
    ['house-siege','JM House Siege','v1.3','Playable Games','Aim parity / focus-depth house battle','STAGE-READY'],
    ['western-sniper','JM Western Sniper PvP','v0.5','Playable Games','Identity-field live duel','STAGE-READY'],
    ['dead-reckon','Dead Reckon','v0.9','Playable Games','Dual-aim body / split-hand route','STAGE-READY'],
    ['fight-clash','Fight Clash Chameleon','v0.8 anchor','Playable Games','Open-ring fighting body / SideLane line','FROZEN'],
    ['cardbored','cardBORED','v0.5 frozen route','Playable Games','Card-board game body / LG future-position route','FROZEN'],
    ['gameforge','GameForge','v3.16','Engines & Creator Hubs','Game-first production forge / one-player separation','STAGE-READY'],
    ['glyphplay','GlyphPlay B1','v29.1','Engines & Creator Hubs','Creator-first playable logic engine','STAGE-READY'],
    ['glyphforge','GlyphForge','v68.2','Engines & Creator Hubs','ProjectBody to connected play-test bridge','STAGE-READY'],
    ['game-native-core','JM Game Native Core','v0.2','Engines & Creator Hubs','Native core / apps and tools bridge','MOUNTED'],
    ['gamecore','JM GameCore','v0.2I-A','Engines & Creator Hubs','Shared game room and donor-estate integration body','RECOVERY'],
    ['playform','PLAYFORM','recovery route','Engines & Creator Hubs','Game-form and creator-system body','RECOVERY'],
    ['drag-aim','Drag & Aim Loop Kernel','v0.9.9','Loops & Reusable Organs','Reusable touch / pull / release / trajectory organ','STAGE-READY'],
    ['aiming-run','Aiming Run','v0.1A','Loops & Reusable Organs','Movement-pressure aiming game / proof body','STAGE-READY'],
    ['combound','JM Combound','v0.7','Loops & Reusable Organs','Natural combo kinetics / combat donor organ','FROZEN'],
    ['quadze','JM Quadze MultiHub','Solo authority','Benchmarks & Recovery','Frozen benchmark / control donor / multi-hub authority','FROZEN'],
    ['jm-studios','JM Studios','Host Shelf','Host Shelf','Separate app/game host shelf awaiting current working body verification','RECOVERY'],
    ['loopit-boundary','Loopit / GlyphPlay / GameForge Boundary','Rejoin Node','Governance & Receipts','External-vs-creator-owned playable boundary proof','FROZEN']
  ].map(([id,name,version,room,role,stage])=>({id,name,version,room,role,stage})),
  theory: [
    ['Core Participation and Human Systems',['MMMBBB','Whole Human Participation','Contact Field','Interactor Interacting','HOSF','Recoverable Participation']],
    ['Truth, Proof and Validation',['VTS','DGYAK','Code Ding','Cold Ding','TraceBox','Empiramid','TRY IT NOW']],
    ['Language, Meaning and Symbolic Syntax',['FlowTalk','BTG','MAP','SpalkTalk','SpelkTalk','Speakuals','Mark-Level Syntax','Prefix and RootWord Theory']],
    ['Game and Play Theories',['PLAYFORM','GlyphPlay','GameForge','GlyphForge','JM GameCore','128 Hand','Route Catch','Touch-Control Lab','GameFeel Doctor']],
    ['Story, World and Character Theories',['Humanimals','PlayZone','T-Boys / 4T Clash','The Seventh Pillar',"Observer's Door",'Embedded World Engine']],
    ['Music, Lyrics and Performance',['Lyrics as Breath-System','Pocket-Body Translation','SeedFlow','Rapathon','PieceMaker','Mouth / Body / Breath / Timing Calibration']],
    ['Contact, Physics and Transformation',['Physics Probing','Contact Transformation','A-to-B / B-to-A Testing','Pressure = Force / Area Learning Route','Micro-Transmutation Law']],
    ['Device, OS and Production',['FTR','RouteOS','RootOS','JjmM','GripRoute','Ama-Pro','Phone-to-Laptop Handoff']],
    ['Public Methods and Transfer',['Container Theory','Container Method','Open the Container','Tin Theory','Theory-to-Product Router']]
  ].map(([name,bodies])=>({name,bodies}))
};

const HOUSES = [
  {id:'games-house',name:'Games & Beyond',kind:'Games',state:'LIVE EDITABLE HOUSE',accent:'#ffd166',path:'./games-beyond/',summary:'Every playable game, engine, reusable loop, benchmark and recovery body enters through one phone-first house.',proof:'Existing PWA host and registry are live.'},
  {id:'coding-house',name:'Cading & Coding Estate',kind:'Coding',state:'LIVE WORKBENCH',accent:'#72ecff',path:'./coding-estate/everybody/',summary:'JM coding bodies remain sovereign while parsers, IR, runtimes, adapters and targets connect through the EveryBody fabric.',proof:'76 recovered entries and portable target lanes registered.'},
  {id:'tools-house',name:'Apps & Tools',kind:'Tools',state:'LIVE LAB + EXPANDING',accent:'#7ff0a6',path:'./fresh-app-lab/',summary:'Working utilities, creator tools, app proofs, operating surfaces and future product rooms.',proof:'Fresh App Lab public room is live.'},
  {id:'theory-house',name:'Theory & Publications',kind:'Theory',state:'REGISTRY CONNECTED',accent:'#b69cff',path:'./registry/theory-wing.json',summary:'Human systems, language, proof, play, story, physics and public methods remain deep bodies with readable routes.',proof:'Nine theory districts are indexed.'},
  {id:'studio-house',name:'Studios: Music, Lyrics & Creation',kind:'Studios',state:'HOUSE RESERVED / SOURCE HELD',accent:'#ff7896',path:null,summary:'LyricStudio, music, visual creation, books, performance and publication bodies gain a first-class home without false deployment claims.',proof:'Registered in the Estate; public source-normalised rooms remain to be mounted.'},
  {id:'library-house',name:'Living Library',kind:'Library',state:'PUBLIC INDEX LIVE',accent:'#ffad42',route:'library',summary:'Searchable estate memory and registry reading now, followed by deliberately connected private retrieval bodies.',proof:'Current registries searchable in this site.'},
  {id:'command-house',name:'Command Centre',kind:'Estate',state:'LIVE',accent:'#72ecff',route:'command',summary:'Build gates, laws, receipts, public truth boundaries, device state and direct technical routes.',proof:'Receipt export and live status are working.'},
  {id:'owner-house',name:'Owner Room',kind:'Owner',state:'LOCAL-FIRST',accent:'#ffd166',route:'owner',summary:'Device-only mounting, notes, favourites, recent routes and portable receipts without pretending local storage is server security.',proof:'Local controls work without uploading private HTML.'}
];

const state = {
  route:'estate', filter:'All', directoryQuery:'', libraryQuery:'',
  favourites:new Set(JSON.parse(localStorage.getItem('jm-estate-favourites')||'[]')),
  recent:JSON.parse(localStorage.getItem('jm-estate-recent')||'[]'),
  mounted:JSON.parse(localStorage.getItem('jm-estate-mounted')||'[]'),
  data:structuredClone(FALLBACK)
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escapeHTML = value => String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const normalise = value => String(value||'').toLowerCase();
let deferredInstallPrompt = null;
let previewUrl = null;

async function loadRegistries(){
  const safeFetch = async path => { const r=await fetch(path,{cache:'no-store'}); if(!r.ok) throw new Error(path); return r.json(); };
  const [estate,games,theory,authority] = await Promise.allSettled([
    safeFetch('./registry/estate-map.json'),safeFetch('./games-beyond/registry.json'),safeFetch('./registry/theory-wing.json'),safeFetch('./registry/estate-head-public-current.json')
  ]);
  if(estate.status==='fulfilled'){
    state.data.estate.laws=estate.value.laws||state.data.estate.laws;
    state.data.estate.routes=(estate.value.live_github_routes||[]).map((r,index)=>({id:`route-${index}`,name:r.body,path:`./${r.path.replace(/^\.\//,'')}`,state:r.state,kind:guessKind(r.body),role:'Registered live GitHub route.'}));
  }
  if(games.status==='fulfilled') state.data.games=games.value.registered_bodies||state.data.games;
  if(theory.status==='fulfilled') state.data.theory=theory.value.districts||state.data.theory;
  if(authority.status==='fulfilled') state.data.estate.publicAuthority=authority.value;
}

// JM_EST_HEAD_PUBLIC_AUTHORITY_V021
function applyEstateHeadPublicAuthority(){
  const contract=state.data.estate.publicAuthority;if(!contract)return;
  const houseRoutes={
    'games-house':{path:'./games-beyond/',state:'LIVE SOVEREIGN HOUSE'},
    'coding-house':{path:'./coding-estate/everybody/',state:'CURRENT CANONICAL-NATIVE FABRIC'},
    'tools-house':{path:'./apps/',state:'LIVE GOVERNED APPS HOUSE'},
    'theory-house':{path:'./theory/',state:'37 FULL BODIES · 297 CENSUS ROUTES'},
    'studio-house':{path:'./lyrics/',state:'LYRICSTUDIO v0.5.1 LIVE'}
  };
  HOUSES.forEach(h=>{const patch=houseRoutes[h.id];if(patch)Object.assign(h,patch)});
  const title=document.querySelector('.current-work h3');if(title)title.textContent=`JM Estate Head ${contract.current_public_subset_version} — Live Public Authority`;
  const copy=document.querySelector('.current-work p');if(copy)copy.textContent=`${contract.body_count} public-contract bodies · ${contract.project_head_count} Project Heads · Stringline ${contract.stringline?.version||'active'} · private source routes remain owner-side.`;
  document.documentElement.dataset.estateHeadAuthority=contract.current_public_subset_version;
}


function guessKind(name){const text=normalise(name);if(text.includes('game'))return'Games';if(text.includes('cad')||text.includes('coding'))return'Coding';if(text.includes('app'))return'Tools';if(text.includes('theory'))return'Theory';return'Estate'}
function routeTo(name,push=true){
  if(!['estate','houses','library','command','owner'].includes(name)) name='estate';
  state.route=name;
  $$('.view').forEach(view=>view.classList.toggle('active',view.dataset.view===name));
  $$('[data-route]').forEach(el=>el.classList.toggle('active',el.dataset.route===name));
  if(push) history.pushState({route:name},'',`#${name}`);
  window.scrollTo({top:0,behavior:'smooth'});
  if(name==='owner') renderOwner();
  if(name==='library') renderLibrary();
}
function trackRecent(item){
  const entry={id:item.id,name:item.name,path:item.path||null,route:item.route||null,at:new Date().toISOString()};
  state.recent=[entry,...state.recent.filter(x=>x.id!==entry.id)].slice(0,8);
  localStorage.setItem('jm-estate-recent',JSON.stringify(state.recent));
  renderOwner();
}
function openItem(item){
  trackRecent(item);
  if(item.route){routeTo(item.route);return}
  if(item.path){window.location.href=item.path;return}
  showDetail(item);
}
function toggleFavourite(id){
  state.favourites.has(id)?state.favourites.delete(id):state.favourites.add(id);
  localStorage.setItem('jm-estate-favourites',JSON.stringify([...state.favourites]));
  renderDirectory();renderContinue();renderOwner();
  toast(state.favourites.has(id)?'Added to your owner shelf.':'Removed from favourites.');
}
function getAllItems(){
  const gameItems=state.data.games.map(g=>({...g,kind:'Games',state:g.stage,summary:g.role,path:'./games-beyond/',proof:`${g.room} · ${g.version}`}));
  const theoryItems=state.data.theory.flatMap(d=>d.bodies.map((name,index)=>({id:`theory-${slug(d.name)}-${index}`,name,kind:'Theory',state:'REGISTERED',summary:`Theory body inside ${d.name}.`,proof:d.name,path:'./registry/theory-wing.json'})));
  const routes=state.data.estate.routes.map(r=>({...r,summary:r.role||'Live public route.',proof:r.state}));
  return [...HOUSES,...routes,...gameItems,...theoryItems];
}
const slug = value => normalise(value).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

function renderFeatureDoors(){
  const selected=['games-house','coding-house','tools-house','theory-house'].map(id=>HOUSES.find(h=>h.id===id));
  $('#featureDoors').innerHTML=selected.map(h=>`<a class="door-card" href="${h.path||'#'}" data-card-id="${h.id}" style="--accent:${h.accent}"><span class="door-state">${escapeHTML(h.state)}</span><h3>${escapeHTML(h.name)}</h3><p>${escapeHTML(h.summary)}</p><div class="door-foot"><span>Open house</span><span>↗</span></div></a>`).join('');
  $$('#featureDoors [data-card-id]').forEach(el=>el.addEventListener('click',event=>{const item=HOUSES.find(x=>x.id===el.dataset.cardId);if(!item.path){event.preventDefault();openItem(item)}else trackRecent(item)}));
}
function renderContinue(){
  const defaults=['games-house','coding-house','fourfold-arena','futarized','theory-house','tools-house'];
  const items=getAllItems().filter(item=>defaults.includes(item.id)).slice(0,6);
  $('#continueGrid').innerHTML=items.map(item=>`<article class="continue-card"><div class="continue-top"><div><span class="continue-status">${escapeHTML(item.state||'REGISTERED')}</span><h3>${escapeHTML(item.name)}</h3></div><button class="small-button star ${state.favourites.has(item.id)?'active':''}" data-fav="${item.id}" aria-label="Favourite ${escapeHTML(item.name)}">★</button></div><p>${escapeHTML(item.summary||item.role||'Estate body')}</p><div class="continue-actions"><button class="small-button primary" data-open="${item.id}">OPEN</button><button class="small-button" data-detail="${item.id}">PASSPORT</button></div></article>`).join('');
  bindItemControls($('#continueGrid'));
}
function renderFilters(){
  const filters=['All','Games','Coding','Tools','Theory','Studios','Library','Estate','Owner','Favourites'];
  $('#houseFilters').innerHTML=filters.map(f=>`<button class="filter-chip ${state.filter===f?'active':''}" data-filter="${f}" type="button">${f}</button>`).join('');
  $$('#houseFilters [data-filter]').forEach(btn=>btn.addEventListener('click',()=>{state.filter=btn.dataset.filter;renderFilters();renderDirectory()}));
}
function renderDirectory(){
  const q=normalise(state.directoryQuery);
  let items=getAllItems();
  const unique=new Map(items.map(item=>[item.id,item]));items=[...unique.values()];
  items=items.filter(item=>{
    const favPass=state.filter!=='Favourites'||state.favourites.has(item.id);
    const kindPass=['All','Favourites'].includes(state.filter)||item.kind===state.filter;
    const text=[item.name,item.kind,item.state,item.summary,item.role,item.proof,item.room,item.version].join(' ').toLowerCase();
    return favPass&&kindPass&&(!q||text.includes(q));
  });
  const groupOrder=['Games','Coding','Tools','Theory','Studios','Library','Estate','Owner'];
  const groups=groupOrder.map(kind=>[kind,items.filter(i=>i.kind===kind)]).filter(([,arr])=>arr.length);
  $('#houseDirectory').innerHTML=groups.length?groups.map(([kind,arr])=>`<section class="directory-group"><header><h2>${kind}</h2><span>${arr.length} ${arr.length===1?'BODY':'BODIES'}</span></header><div class="directory-grid">${arr.map(bodyRow).join('')}</div></section>`).join(''):`<div class="empty-state"><strong>No matching body.</strong><p>Try another search or filter. Nothing has been silently invented to fill the gap.</p></div>`;
  bindItemControls($('#houseDirectory'));
}
function bodyRow(item){
  return `<article class="body-row"><div class="body-row-main"><h3>${escapeHTML(item.name)}</h3><p>${escapeHTML(item.summary||item.role||'Registered Estate body.')}</p></div><div class="body-passport"><span>${escapeHTML(item.kind||'Estate')}</span><span class="stage">${escapeHTML(item.state||item.stage||'REGISTERED')}</span>${item.version?`<span>${escapeHTML(item.version)}</span>`:''}</div><div class="body-row-actions"><button class="fav ${state.favourites.has(item.id)?'active':''}" data-fav="${item.id}" aria-label="Favourite ${escapeHTML(item.name)}">★</button><button data-detail="${item.id}" aria-label="View passport for ${escapeHTML(item.name)}">i</button><button class="open-body" data-open="${item.id}">OPEN</button></div></article>`;
}
function bindItemControls(root){
  root.querySelectorAll('[data-fav]').forEach(btn=>btn.addEventListener('click',()=>toggleFavourite(btn.dataset.fav)));
  root.querySelectorAll('[data-open]').forEach(btn=>btn.addEventListener('click',()=>{const item=getAllItems().find(x=>x.id===btn.dataset.open);if(item)openItem(item)}));
  root.querySelectorAll('[data-detail]').forEach(btn=>btn.addEventListener('click',()=>{const item=getAllItems().find(x=>x.id===btn.dataset.detail);if(item)showDetail(item)}));
}
function showDetail(item){
  const accent=item.accent||({Games:'#ffd166',Coding:'#72ecff',Theory:'#b69cff',Tools:'#7ff0a6',Studios:'#ff7896'}[item.kind]||'#72ecff');
  $('#detailContent').innerHTML=`<section class="detail-hero" style="--detail-accent:${accent}"><p class="section-number">${escapeHTML(item.kind||'ESTATE')} · ${escapeHTML(item.state||item.stage||'REGISTERED')}</p><h2>${escapeHTML(item.name)}</h2><p>${escapeHTML(item.summary||item.role||'Registered Estate body.')}</p><div class="detail-actions"><button class="button primary" id="detailOpen">${item.path||item.route?'Open route':'Keep registered'}</button><button class="button quiet" id="detailFav">${state.favourites.has(item.id)?'Remove favourite':'Add favourite'}</button></div></section><div class="detail-body"><div class="detail-block"><h3>Passport</h3><p>${escapeHTML(item.proof||item.room||'Connected through the current JM Estate registry.')}</p></div><div class="detail-block"><h3>Ownership boundary</h3><p>This shared website supplies navigation and delivery. It does not erase this body’s native source, lineage or independent authority.</p></div></div>`;
  $('#detailDialog').showModal();
  $('#detailOpen').addEventListener('click',()=>{if(item.path||item.route){$('#detailDialog').close();openItem(item)}else toast('Body preserved as registered; no false public door was claimed.')});
  $('#detailFav').addEventListener('click',()=>{toggleFavourite(item.id);$('#detailFav').textContent=state.favourites.has(item.id)?'Remove favourite':'Add favourite'});
}
function libraryEntries(){
  const routes=state.data.estate.routes.map(r=>({title:r.name,meta:`PUBLIC ROUTE · ${r.state}`,text:r.role||'Registered live route.',path:r.path}));
  const games=state.data.games.map(g=>({title:g.name,meta:`GAME ESTATE · ${g.stage}`,text:`${g.role} · ${g.room} · ${g.version}`,path:'./games-beyond/'}));
  const theories=state.data.theory.flatMap(d=>d.bodies.map(name=>({title:name,meta:`THEORY DISTRICT · ${d.name}`,text:`Registered theory body inside ${d.name}.`,path:'./registry/theory-wing.json'})));
  const laws=state.data.estate.laws.map(l=>({title:l,meta:'ESTATE LAW',text:'Governing route law in the current public Estate registry.',path:'./registry/estate-map.json'}));
  return [...routes,...games,...theories,...laws];
}
function renderLibrary(){
  const q=normalise(state.libraryQuery);const entries=libraryEntries().filter(e=>!q||normalise([e.title,e.meta,e.text].join(' ')).includes(q)).slice(0,q?100:30);
  $('#libraryResults').innerHTML=entries.length?entries.map(e=>`<a class="library-item" href="${e.path}"><span class="library-meta">${escapeHTML(e.meta)}</span><h3>${escapeHTML(e.title)}</h3><p>${escapeHTML(e.text)}</p></a>`).join(''):`<div class="empty-state">No registered public result matches that search.</div>`;
}
function renderCommand(){
  const gates=['Source','Entry','Structure','Behaviour','Delivery','Receipt'];
  $('#gateGrid').innerHTML=gates.map(g=>`<div class="gate"><i>✓</i><b>${g}</b><span>v1 FOUNDATION</span></div>`).join('');
  $('#estateLaws').innerHTML=state.data.estate.laws.map(l=>`<li>${escapeHTML(l)}</li>`).join('');
}
function saveMounted(){localStorage.setItem('jm-estate-mounted',JSON.stringify(state.mounted));renderOwner()}
function renderOwner(){
  $('#mountedCount').textContent=`${state.mounted.length} ${state.mounted.length===1?'BODY':'BODIES'}`;
  $('#mountedShelf').innerHTML=state.mounted.length?state.mounted.map(item=>`<article class="mounted-card"><div><b>${escapeHTML(item.name)}</b><small>${Math.round(item.bytes/1024)} KB · mounted ${new Date(item.at).toLocaleDateString()}</small></div><div class="mounted-actions"><button data-preview-local="${item.id}">PREVIEW</button><button class="danger" data-delete-local="${item.id}">REMOVE</button></div></article>`).join(''):`<div class="empty-state">No local HTML body mounted on this device.</div>`;
  $$('#mountedShelf [data-preview-local]').forEach(btn=>btn.addEventListener('click',()=>previewMounted(btn.dataset.previewLocal)));
  $$('#mountedShelf [data-delete-local]').forEach(btn=>btn.addEventListener('click',()=>{state.mounted=state.mounted.filter(x=>x.id!==btn.dataset.deleteLocal);saveMounted();toast('Local mounted copy removed.')}));
  const favs=getAllItems().filter(i=>state.favourites.has(i.id));
  $('#favouriteCount').textContent=favs.length;
  $('#favouriteShelf').innerHTML=favs.length?favs.slice(0,8).map(i=>miniItem(i)).join(''):`<div class="empty-state">Favourite rooms appear here.</div>`;
  $('#recentShelf').innerHTML=state.recent.length?state.recent.map(i=>miniItem(i)).join(''):`<div class="empty-state">Rooms you open appear here.</div>`;
  $$('#favouriteShelf [data-mini-open],#recentShelf [data-mini-open]').forEach(btn=>btn.addEventListener('click',()=>{const item=getAllItems().find(x=>x.id===btn.dataset.miniOpen)||state.recent.find(x=>x.id===btn.dataset.miniOpen);if(item)openItem(item)}));
}
function miniItem(item){return `<div class="mini-item"><div><b>${escapeHTML(item.name)}</b><small>${escapeHTML(item.state||item.kind||'RECENT ROUTE')}</small></div><button class="small-button" data-mini-open="${item.id}">OPEN</button></div>`}
function previewMounted(id){
  const item=state.mounted.find(x=>x.id===id);if(!item)return;
  if(previewUrl) URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(new Blob([item.content],{type:'text/html'}));
  $('#previewTitle').textContent=item.name;$('#previewFrame').src=previewUrl;$('#previewDialog').showModal();
}
async function mountFiles(files){
  for(const file of files){
    const content=await file.text();
    if(!/<html|<!doctype/i.test(content)){toast(`${file.name} does not look like standalone HTML.`,true);continue}
    const item={id:`local-${Date.now()}-${Math.random().toString(16).slice(2)}`,name:file.name.replace(/\.html?$/i,''),fileName:file.name,content,bytes:file.size,at:new Date().toISOString()};
    state.mounted=[item,...state.mounted].slice(0,12);
  }
  try{saveMounted();toast('Local HTML body mounted on this device.')}catch(error){state.mounted=[];localStorage.removeItem('jm-estate-mounted');renderOwner();toast('This body is too large for localStorage. Use Games & Beyond IndexedDB mounting for larger bodies.',true)}
}
function buildReceipt(){
  return {schema:'JM.WebEstateReceipt/1.3',generatedAt:new Date().toISOString(),publicRoute:location.href.split('#')[0],network:navigator.onLine?'ONLINE':'OFFLINE',viewport:{width:innerWidth,height:innerHeight,pixelRatio:devicePixelRatio},userAgent:navigator.userAgent,estate:{version:'1.3',publicAuthority:state.data.estate.publicAuthority||null,liveRoutes:state.data.estate.routes.length,registeredGames:state.data.games.length,theoryDistricts:state.data.theory.length,laws:state.data.estate.laws},localOwnerState:{favourites:[...state.favourites],recent:state.recent.map(({id,name,at})=>({id,name,at})),mountedBodies:state.mounted.map(({id,name,fileName,bytes,at})=>({id,name,fileName,bytes,at})),notesPresent:Boolean($('#ownerNotes').value.trim())},truthBoundary:'This receipt describes the public web shell and this browser’s local state. It does not claim every protected Estate source has been uploaded.'};
}
function exportReceipt(){
  const receipt=buildReceipt();const text=JSON.stringify(receipt,null,2);$('#receiptPreview').textContent=text;
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`JM_WEB_ESTATE_RECEIPT_${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);toast('Estate receipt exported.');
}
function paletteItems(){
  const routes=[
    {id:'cmd-estate',name:'Open Estate home',summary:'Return to the owned front door.',route:'estate',kind:'Command'},
    {id:'cmd-houses',name:'Search all houses',summary:'Open the full Estate directory.',route:'houses',kind:'Command'},
    {id:'cmd-library',name:'Search Living Library',summary:'Search registries and current public bodies.',route:'library',kind:'Command'},
    {id:'cmd-command',name:'Open Command Centre',summary:'Inspect gates, laws and receipts.',route:'command',kind:'Command'},
    {id:'cmd-owner',name:'Open Owner Room',summary:'Local HTML mounting, notes and shelves.',route:'owner',kind:'Command'}
  ];return [...routes,...getAllItems()];
}
function renderPalette(query=''){
  const q=normalise(query);const items=paletteItems().filter(i=>!q||normalise([i.name,i.summary,i.kind,i.state].join(' ')).includes(q)).slice(0,24);
  $('#paletteResults').innerHTML=items.map(i=>`<button class="palette-result" type="button" data-palette-id="${i.id}"><span class="result-icon">${i.kind==='Command'?'⌘':'↗'}</span><span><b>${escapeHTML(i.name)}</b><small>${escapeHTML(i.summary||i.role||i.kind||'Estate route')}</small></span><span>›</span></button>`).join('')||'<div class="empty-state">No registered command or body matches.</div>';
  $$('#paletteResults [data-palette-id]').forEach(btn=>btn.addEventListener('click',()=>{const item=paletteItems().find(i=>i.id===btn.dataset.paletteId);$('#commandPalette').close();if(item)openItem(item)}));
}
function toast(message,bad=false){const el=$('#toast');el.textContent=message;el.classList.toggle('bad',bad);el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2500)}
function updateNetwork(){const online=navigator.onLine;$('#networkState').textContent=online?'ONLINE':'OFFLINE';$('#networkState').style.color=online?'var(--green)':'var(--red)'}
function registerPWA(){
  if('serviceWorker'in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;$('#installButton').hidden=false});
  $('#installButton').addEventListener('click',async()=>{if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null}else toast('Use your browser menu → Add to Home screen / Install app.')});
}
function wireEvents(){
  $$('[data-route]').forEach(el=>el.addEventListener('click',event=>{if(el.tagName==='A')event.preventDefault();routeTo(el.dataset.route)}));
  $$('[data-open-id]').forEach(btn=>btn.addEventListener('click',()=>{const item=HOUSES.find(h=>h.id===btn.dataset.openId);if(item)openItem(item)}));
  $('#exploreButton').addEventListener('click',()=>routeTo('houses'));
  $('#directorySearch').addEventListener('input',event=>{state.directoryQuery=event.target.value;renderDirectory()});
  $('#librarySearch').addEventListener('input',event=>{state.libraryQuery=event.target.value;renderLibrary()});
  $('#paletteButton').addEventListener('click',()=>{$('#commandPalette').showModal();renderPalette();setTimeout(()=>$('#paletteSearch').focus(),50)});
  $('#paletteSearch').addEventListener('input',event=>renderPalette(event.target.value));
  $('#detailClose').addEventListener('click',()=>$('#detailDialog').close());
  $('#previewClose').addEventListener('click',()=>{$('#previewDialog').close();$('#previewFrame').src='about:blank';if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null});
  $('#exportReceiptButton').addEventListener('click',exportReceipt);
  $('#htmlMountInput').addEventListener('change',event=>mountFiles([...event.target.files]));
  const notes=$('#ownerNotes');notes.value=localStorage.getItem('jm-estate-owner-notes')||'';notes.addEventListener('input',()=>localStorage.setItem('jm-estate-owner-notes',notes.value));
  $('#clearNotesButton').addEventListener('click',()=>{notes.value='';localStorage.removeItem('jm-estate-owner-notes');toast('Owner notes cleared.')});
  $('#copyNotesButton').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(notes.value);toast('Owner notes copied.')}catch{toast('Copy was blocked by this browser.',true)}});
  window.addEventListener('online',updateNetwork);window.addEventListener('offline',updateNetwork);window.addEventListener('popstate',()=>routeTo(location.hash.slice(1)||'estate',false));
  window.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();$('#commandPalette').showModal();renderPalette();setTimeout(()=>$('#paletteSearch').focus(),50)}});
}

async function init(){
  $('#year').textContent=new Date().getFullYear();
  renderFeatureDoors();renderContinue();renderFilters();renderDirectory();renderLibrary();renderCommand();renderOwner();wireEvents();registerPWA();updateNetwork();
  $('#storageSupport').textContent='Device-only local storage ready. Larger bodies should use Games & Beyond IndexedDB mounting.';
  routeTo(location.hash.slice(1)||'estate',false);
  await loadRegistries();applyEstateHeadPublicAuthority();
  $('#liveRouteCount').textContent=state.data.estate.routes.length;$('#gameBodyCount').textContent=state.data.games.length;
  renderFeatureDoors();renderContinue();renderDirectory();renderLibrary();renderCommand();renderOwner();
}
init().catch(error=>{console.error(error);toast('The Estate loaded with its built-in registry fallback.',true)});
