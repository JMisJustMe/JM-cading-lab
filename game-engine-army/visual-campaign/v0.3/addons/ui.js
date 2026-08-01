(()=>{
'use strict';
const NS=window.JMVisualCampaign;
const root=document.createElement('div');root.id='jmvc-root';root.innerHTML=`
 <div class="jmvc-status"><span class="jmvc-mark">${NS.profile.symbol}</span><div><b>${NS.profile.name}</b><small>${NS.profile.role}</small></div><span id="jmvc-signal">READY</span><span id="jmvc-fps">60 FPS</span></div>
 <div class="jmvc-dock" role="toolbar" aria-label="Visual campaign controls"><button id="jmvc-toggle" aria-expanded="false" title="Visual settings (F2)">VISUAL</button><button id="jmvc-sound" title="Toggle sound">SOUND</button><button id="jmvc-full" title="Fullscreen">FULL</button></div>
 <aside id="jmvc-drawer" aria-label="Visual settings"><header><div><b>Visual Campaign v0.3</b><small>${NS.profile.name}</small></div><button id="jmvc-close" aria-label="Close">×</button></header>
 <label>Theme<select id="jmvc-theme">${Object.entries(NS.themes).map(([id,t])=>`<option value="${id}">${t.label}</option>`).join('')}</select></label>
 <label class="jmvc-check"><input id="jmvc-particles" type="checkbox"> Particles</label>
 <label class="jmvc-check"><input id="jmvc-trails" type="checkbox"> Route trails</label>
 <label class="jmvc-check"><input id="jmvc-haptics" type="checkbox"> Haptics</label>
 <label class="jmvc-check"><input id="jmvc-contrast" type="checkbox"> High contrast</label>
 <label class="jmvc-check"><input id="jmvc-touch" type="checkbox"> Large touch targets</label>
 <label class="jmvc-check"><input id="jmvc-motion" type="checkbox"> Reduce motion</label>
 <label>Sound volume<input id="jmvc-volume" type="range" min="0" max="0.7" step="0.01"></label>
 <label>Quality<select id="jmvc-quality"><option value="auto">Auto</option><option value="0">Battery</option><option value="1">Balanced</option><option value="2">Maximum</option></select></label>
 <label class="jmvc-check"><input id="jmvc-debug" type="checkbox"> Debug meter</label>
 <div class="jmvc-actions"><button id="jmvc-receipt">Download visual receipt</button><button id="jmvc-reset">Reset visual settings</button></div>
 <p>Engine law and simulation remain authoritative. This layer owns presentation, contact feedback and packaging only.</p></aside>`;
document.body.append(root);
const $=s=>root.querySelector(s),drawer=$('#jmvc-drawer'),toggle=$('#jmvc-toggle');
function sync(){const s=NS.settings;$('#jmvc-theme').value=s.theme;$('#jmvc-particles').checked=s.particles;$('#jmvc-trails').checked=s.routeTrails;$('#jmvc-haptics').checked=s.haptics;$('#jmvc-contrast').checked=s.highContrast;$('#jmvc-touch').checked=s.largeTouch;$('#jmvc-motion').checked=s.reducedMotion;$('#jmvc-volume').value=s.volume;$('#jmvc-quality').value=String(s.quality);$('#jmvc-debug').checked=s.debug;$('#jmvc-sound').textContent=s.sound?'SOUND':'MUTED';document.documentElement.dataset.jmvcDebug=s.debug?'on':'off'}
function open(value=!drawer.classList.contains('open')){drawer.classList.toggle('open',value);toggle.setAttribute('aria-expanded',String(value))}
toggle.onclick=()=>open();$('#jmvc-close').onclick=()=>open(false);$('#jmvc-sound').onclick=()=>{NS.set('sound',!NS.settings.sound);NS.audio?.unlock();NS.audio?.cue('contact');sync()};$('#jmvc-full').onclick=()=>document.fullscreenElement?document.exitFullscreen?.():document.documentElement.requestFullscreen?.();
$('#jmvc-theme').onchange=e=>NS.set('theme',e.target.value);$('#jmvc-particles').onchange=e=>NS.set('particles',e.target.checked);$('#jmvc-trails').onchange=e=>NS.set('routeTrails',e.target.checked);$('#jmvc-haptics').onchange=e=>NS.set('haptics',e.target.checked);$('#jmvc-contrast').onchange=e=>NS.set('highContrast',e.target.checked);$('#jmvc-touch').onchange=e=>NS.set('largeTouch',e.target.checked);$('#jmvc-motion').onchange=e=>NS.set('reducedMotion',e.target.checked);$('#jmvc-volume').oninput=e=>NS.set('volume',Number(e.target.value));$('#jmvc-quality').onchange=e=>NS.set('quality',e.target.value);$('#jmvc-debug').onchange=e=>NS.set('debug',e.target.checked);$('#jmvc-receipt').onclick=()=>NS.download(`${NS.engine}_VISUAL_RECEIPT_v0_3.json`,JSON.stringify(NS.visualReceipt(),null,2));$('#jmvc-reset').onclick=()=>{localStorage.removeItem('jm-game-engine-army-visual-v03');location.reload()};
NS.on('settings',sync);sync();
let previous='';function inspect(){const summary=NS.stateSummary();const text=(summary.label+' '+summary.detail).toUpperCase();$('#jmvc-signal').textContent=summary.label;$('#jmvc-fps').textContent=`${Math.round(NS.state.fps)} FPS · Q${NS.state.qualityTier}`;if(text!==previous){previous=text;let type='contact';if(/DING|WIN|PASS|COMPLETE|CROWN/.test(text))type='ding';else if(/FAULT|FAIL|REJECT|ERROR|HELD/.test(text))type='fault';else if(/RECOVER|RESTORE/.test(text))type='recovery';else if(/BUILD|COMPILE|ADAPT|VALID/.test(text))type='build';NS.state.lastSignal=summary.label;NS.emit('signal',{type,message:summary.detail});NS.audio?.cue(type);NS.fx?.signal(type);if(NS.settings.haptics&&navigator.vibrate){navigator.vibrate(type==='fault'?[35,35,70]:type==='ding'?[30,30,30,80]:18)}}requestAnimationFrame(inspect)}requestAnimationFrame(inspect);
const observer=new MutationObserver(records=>{for(const record of records){const t=(record.target.textContent||'').toUpperCase();if(/DING|FAULT|RECOVERY|PASS|BUILD/.test(t)){const type=/DING|PASS/.test(t)?'ding':/FAULT/.test(t)?'fault':/RECOVERY/.test(t)?'recovery':'build';NS.emit('signal',{type,message:t.slice(0,120)});NS.audio?.cue(type);NS.fx?.signal(type)}}});observer.observe(document.body,{subtree:true,childList:true,characterData:true});
function layoutRescue(){
 try{window.dispatchEvent(new Event('resize'));window.GlyphPlayVisualOverhaul?.resize?.();window.GlyphPlayApp?.project?.();document.documentElement.dataset.jmvcLayout='ready'}catch(error){console.warn('JMVC layout rescue',error)}
}
requestAnimationFrame(layoutRescue);[120,480,1400].forEach(delay=>setTimeout(layoutRescue,delay));document.fonts?.ready?.then(layoutRescue);
NS.state.ready=true;document.documentElement.dataset.jmvcReady='true';
})();
