const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const ROUTES=[['home','⌂','Home'],['estates','◫','Estates'],['library','▤','Library'],['connections','⤨','Connections'],['command','⌘','Command Centre'],['owner','♙','Owner Room']];
const STORE='jm-standalone-v115';
let registry={houses:[],publicDoors:[],connections:[],proof:{}};
let state={route:'home',theme:'night',motion:'on',favourites:[],recent:[],notes:'',mounted:[],activity:[]};
let searchIndex=[],searchActive=0,installPrompt=null;
const icons={brain:'◉',music:'♫',game:'✣',cube:'◇',code:'</>',book:'▤',spark:'✦',archive:'▣'};
const accent={violet:'#9d5cff',gold:'#f4ba45',green:'#85e34f',cyan:'#49c9ff',orange:'#ff9f43',pink:'#ff5fab',blue:'#5797ff',slate:'#a2a6b4'};
function load(){try{state={...state,...JSON.parse(localStorage.getItem(STORE)||'{}')}}catch{};document.documentElement.dataset.theme=state.theme==='light'?'light':'night';document.documentElement.dataset.motion=state.motion;}
function save(){localStorage.setItem(STORE,JSON.stringify(state));}
function log(event,detail){state.activity=[{at:new Date().toISOString(),event,detail},...state.activity].slice(0,30);save();}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2200)}
function download(name,content,type='application/json'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function boot(){load();registry=await fetch(window.__JM_REGISTRY_URL__).then(r=>r.json()).catch(()=>({houses:[],publicDoors:[],connections:[],proof:{}}));buildNav();buildSearch();route(location.hash.replace('#/','')||state.route||'home',false);bind();if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});}
function buildNav(){const side=$('#sideNav'),top=$('#topNav');side.innerHTML=ROUTES.map(([id,ic,label])=>`<button class="nav-button" data-route="${id}"><span class="nav-icon">${ic}</span>${label}</button>`).join('');top.innerHTML=ROUTES.slice(0,5).map(([id,,label])=>`<button data-route="${id}">${label}</button>`).join('')}
function route(id,push=true){id=ROUTES.some(r=>r[0]===id)?id:'home';state.route=id;save();if(push)location.hash='#/'+id;$$('[data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===id));$('#sidebar').classList.remove('open');render(id);window.scrollTo({top:0,behavior:'smooth'});log('ROUTE',id)}
function render(id){const main=$('#main');({home:renderHome,estates:renderEstates,library:renderLibrary,connections:renderConnections,command:renderCommand,owner:renderOwner}[id]||renderHome)(main)}
