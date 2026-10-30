"""CP28 source-owned input and visual inheritance for exact original cardBORED v0.5."""
def transform(source):
    html=source
    def replace_one(old,new):
        nonlocal html
        n=html.count(old)
        if n!=1: raise AssertionError("CP28 source anchor count "+str(n)+" "+old[:80])
        html=html.replace(old,new,1)
    replace_one('content="width=device-width,initial-scale=1,viewport-fit=cover,maximum-scale=1,user-scalable=no"',
                'content="width=device-width,initial-scale=1,viewport-fit=cover"')
    replace_one('<title>cardBORED v0.4 — Drive & Pressure Formation</title>',
                '<title>cardBORED CP28 — Native House Board Contact</title>')
    replace_one('</style>',"""
/* CP28 source-derived pressure and consequence, not a replacement art language. */
.iconbtn,.jmCB5Close,.jmCB5Card,#jmCB5Apply{min-height:44px!important;touch-action:manipulation}
.slot:focus-visible,.card:focus-visible,.action:focus-visible{outline:3px solid #fff7ae!important;outline-offset:3px}
.arena[data-cp28-pressure="OPEN"]{box-shadow:inset 0 0 0 3px rgba(255,158,55,.45),0 0 25px rgba(255,108,51,.16),var(--shadow)}
.arena[data-cp28-drive="high"] .contact-band:before{background:repeating-linear-gradient(90deg,#ffe55e 0 12px,#54e7ff 12px 24px);box-shadow:0 0 16px rgba(84,231,255,.7)}
.slot.legal:after{content:"";position:absolute;inset:-4px;pointer-events:none;border:2px solid rgba(255,229,94,.52);border-radius:16px;box-shadow:inset 0 0 25px rgba(255,229,94,.12)}
.slot.selected:after{content:"✓";position:absolute;top:-9px;right:-6px;border-radius:50%;width:23px;height:23px;display:grid;place-items:center;background:#e8fef2;color:#103728;font:1000 14px system-ui;border:2px solid #05070d;z-index:6}
#cp28Help{position:absolute;z-index:5;top:48%;left:50%;transform:translate(-50%,-50%);max-width:94%;padding:5px 8px;border:1px solid rgba(255,229,94,.3);border-radius:10px;background:#080d1be8;color:#e6e9fe;text-align:center;font:800 9px/1.3 system-ui;pointer-events:none}
@media(pointer:coarse){#cp28Help{display:none}}
@media(max-height:650px){.iconbtn{width:44px!important;height:44px!important}}
@media(prefers-reduced-motion:reduce){.slot.legal:after{box-shadow:none}}
</style>""")
    replace_one("function render(){renderHud();renderFormation();renderHand();renderControls();renderTicker();if($('#drawer').classList.contains('open'))renderDrawer()}",
                "function render(){renderHud();renderFormation();renderHand();renderControls();renderTicker();if($('#drawer').classList.contains('open'))renderDrawer();CP28_visual()}")
    replace_one("/* ===== cardBORED v0.5",r"""
// CP28 native inputs: the existing game owns the card rules, CPU and combat.
let cp28Card=0,cp28Target=0,cp28PadIndex=null,cp28PadRef=null;
const cp28Held=new Set();
function CP28_fixOpening(){
 if(!state||state.phase!=='decision'||state.player.some(Boolean))return;
 if(state.hand.some(c=>c.cost<=state.energy&&legalTargets(c).length>0))return;
 // Ensure the selected House genuinely reaches the first hand when a
 // shuffled Gear/Move opening has no legal position on the empty board.
 const i=state.playerDeck.findIndex(c=>c.kind==='GOER'&&c.cost<=state.energy);
 if(i<0)return;
 const playable=state.playerDeck.splice(i,1)[0],displaced=state.hand.shift();
 state.hand.unshift(playable);
 if(displaced)state.playerDeck.unshift(displaced);
 log('HOUSE','First playable route restored from the original House deck: '+playable.name);
}
function CP28_visual(){
 if(!state)return;
 const a=$('#arena'),p=pressure('player');
 a.dataset.cp28Pressure=p;a.dataset.cp28Drive=state.drive>=2?'high':'normal';
 a.dataset.cp28Phase=state.phase;
 a.setAttribute('aria-label','House formation '+p+' · Drive '+state.drive+'/3 · '+state.phase);
}
function CP28_card(dir){
 if(state.phase!=='decision')return;
 const hand=state.hand;
 let i=selectedCard===null?cp28Card:selectedCard;
 for(let j=0;j<hand.length;j++){
  i=(i+dir+hand.length)%hand.length;
  if(hand[i].cost<=state.energy){cp28Card=i;selectCard(i);return}
 }
}
function CP28_target(dir){
 if(state.phase!=='decision'||selectedCard===null)return;
 const opts=legalTargets(state.hand[selectedCard]);
 if(!opts.length)return;
 const now=opts.indexOf(selectedTarget);
 cp28Target=(now<0?(dir>0?0:opts.length-1):(now+dir+opts.length)%opts.length);
 selectTarget(opts[cp28Target]);
}
function CP28_confirm(){
 if(state.phase==='correction'){driveShift();return}
 if(state.phase==='over'){start();return}
 if(state.phase!=='decision')return;
 if(selectedCard===null){CP28_card(1);return}
 const opts=legalTargets(state.hand[selectedCard]);
 if(opts.length&&!selectedTarget){CP28_target(1);return}
 if(!$('#actionBtn').disabled)commit();
}
function CP28_back(){
 if(!cb5Ov.hidden){cb5Ov.hidden=true;return}
 if($('#drawer').classList.contains('open')){closeDrawer();return}
 if(state.phase==='correction'){
  log('DRIVE','Correction declined. Formation preserved.');nextTurn();return
 }
 if(state.phase==='decision'&&selectedCard!==null){
  selectedCard=null;selectedTarget=null;render();
 }
}
function CP28_action(route){
 if(!cb5Ov.hidden||$('#drawer').classList.contains('open')){
  if(route==='back')CP28_back();return;
 }
 if(route==='left')CP28_card(-1);
 else if(route==='right')CP28_card(1);
 else if(route==='up')CP28_target(-1);
 else if(route==='down')CP28_target(1);
 else if(route==='confirm')CP28_confirm();
 else if(route==='back')CP28_back();
 else if(route==='drive'&&state.phase==='correction')driveShift();
 else if(route==='house')cb5Btn.click();
 else if(route==='trace')openDrawer('trace');
}
window.addEventListener('keydown',e=>{
 if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
 const k=e.key.toLowerCase();
 if(/^[1-9]$/.test(k)&&state.phase==='decision'&&cb5Ov.hidden&&!$('#drawer').classList.contains('open')){
  const i=Number(k)-1;
  if(state.hand[i]&&state.hand[i].cost<=state.energy){e.preventDefault();cp28Card=i;selectCard(i)}return;
 }
 const keys={arrowleft:'left',arrowright:'right',arrowup:'up',arrowdown:'down',enter:'confirm',' ':'confirm',escape:'back',d:'drive',h:'house',t:'trace',k:'back'};
 const route=keys[k];if(!route)return;
 if(k===' '||k.startsWith('arrow')||k==='enter')e.preventDefault();
 CP28_action(route);
});
function CP28_poll(){
 if(cp28PadIndex===null)return;
 const current=navigator.getGamepads?.()[cp28PadIndex]||null;
 const pad=current?.connected?current:cp28PadRef;
 if(!pad?.connected){cp28PadIndex=null;cp28PadRef=null;cp28Held.clear();return}
 if(!document.hidden){
  const down=new Set(),mapping={0:'confirm',1:'back',2:'drive',3:'house',4:'left',5:'right',8:'trace',9:'confirm',12:'up',13:'down',14:'left',15:'right'};
  for(const [i,name] of Object.entries(mapping))if(pad.buttons[+i]?.pressed)down.add(name);
  if((pad.axes?.[0]||0)<-.7)down.add('left');
  if((pad.axes?.[0]||0)>.7)down.add('right');
  if((pad.axes?.[1]||0)<-.7)down.add('up');
  if((pad.axes?.[1]||0)>.7)down.add('down');
  for(const name of down)if(!cp28Held.has(name))CP28_action(name);
  cp28Held.clear();for(const name of down)cp28Held.add(name);
 }else cp28Held.clear();
 requestAnimationFrame(CP28_poll);
}
function CP28_connect(p){
 if(!p)return;
 cp28PadIndex=p.index;cp28PadRef=p;cp28Held.clear();
 requestAnimationFrame(CP28_poll);
}
window.addEventListener('gamepadconnected',e=>CP28_connect(e.gamepad));
window.addEventListener('gamepaddisconnected',e=>{
 if(e.gamepad.index===cp28PadIndex){cp28PadIndex=null;cp28PadRef=null;cp28Held.clear()}
});
const cp28Existing=Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected);
if(cp28Existing)CP28_connect(cp28Existing);
window.addEventListener('blur',()=>cp28Held.clear());
document.addEventListener('visibilitychange',()=>{if(document.hidden)cp28Held.clear()});
const cp28Help=document.createElement('div');cp28Help.id='cp28Help';
cp28Help.textContent='KEYBOARD · 1–5 cards · ←/→ card · ↑/↓ target · ENTER commit · D Drive · K keep · H House · T Trace';
$('#arena').appendChild(cp28Help);
window.JM_CARDBORED_CP28=Object.freeze({
 parent:'v0.5 exact native LG/SS/DS combat',
 get contact(){return {cardCursor:cp28Card,targetCursor:cp28Target,padConnected:cp28PadIndex!==null}},
 get state(){return {turn:state.turn,phase:state.phase,energy:state.energy,drive:state.drive,
 selectedCard,selectedTarget,
 hand:state.hand.map(c=>({id:c.id,cost:c.cost,kind:c.kind})),
 legal:selectedCard!==null?legalTargets(state.hand[selectedCard]):[],
 player:state.player.map(u=>u?.id||null),
 core:[state.playerCore,state.cpuCore],
 trace:state.trace.slice(0,8).map(e=>({body:e.body,text:e.text}))}}
});

/* ===== cardBORED v0.5""")
    replace_one("const cb5StartBase=start;start=function(){cb5StartBase();cb5Apply();render();cb5Badge()};",
                "const cb5StartBase=start;start=function(){cb5StartBase();cb5Apply();CP28_fixOpening();render();cb5Badge()};")
    replace_one("cb5Apply();render();cb5Badge();",
                "cb5Apply();CP28_fixOpening();render();cb5Badge();")
    return html
