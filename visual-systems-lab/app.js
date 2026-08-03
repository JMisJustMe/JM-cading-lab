(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const routes=['illusion','image','video','motion','prompt','story'];
const names={illusion:'ILLUSION / MÜLLER–LYER',image:'IMAGE / TREATMENT FIELD',video:'VIDEO / FRAME FIELD',motion:'MOTION / CONNECTED DIFFERENCE',prompt:'AI VISUAL / PROMPT FORGE',story:'STORY / SEQUENCE RAIL'};
const illusionMeta={
 muller:['MÜLLER–LYER / PRESSURE FIELD','Equal source. Different surrounding pressure.','Which centre line looks longer?'],
 rubin:['RUBIN / FIGURE–GROUND FIELD','The same boundary can carry vase or faces.','Do you see the vase first, or the faces?'],
 drift:['PERIPHERAL DRIFT / MOTION FIELD','Still geometry can produce felt movement.','Does the field appear to turn?'],
 checker:['CHECKER SHADOW / CONTEXT FIELD','Measured shade and seen shade can disagree.','Do the outlined squares look equal?']
};
let installEvent=null,toastTimer=null,seed={name:'Visual Lab embedded fallback',status:'OPEN'};
const core=new JMCore.JMOneBody(seed);
const ambient=new JMVisualRuntime.AmbientField($('#ambientCanvas'));
const illusion=new JMVisualRuntime.IllusionEngine($('#illusionCanvas'));
const motion=new JMVisualRuntime.MotionEngine($('#motionCanvas'));
const imageField=new JMVisualRuntime.ImageField($('#imageCanvas'),$('#imageEmpty'));
const videoField=new JMVisualRuntime.VideoField($('#videoPlayer'),$('#videoEmpty'));

function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1900)}
function currentIndex(){return routes.indexOf(core.state.route)}
function routeTo(route,source='ui'){
 if(!routes.includes(route))return;core.route(route,source);
 $$('.route').forEach(x=>x.classList.toggle('active',x.dataset.route===route));
 $$('.room').forEach(x=>{const on=x.dataset.room===route;x.hidden=!on;x.classList.toggle('active',on)});
 $('#currentBody').textContent=names[route];
 $('#illusionDock').classList.toggle('active',route==='illusion');$('#genericDock').classList.toggle('active',route!=='illusion');
 renderTrace();setTimeout(()=>window.dispatchEvent(new Event('resize')),20);
}
function routeStep(delta){routeTo(routes[(currentIndex()+delta+routes.length)%routes.length],delta>0?'next':'previous')}

function updateIllusionMeta(){const [name,caption,question]=illusionMeta[illusion.type];$('#illusionName').textContent=name;$('#illusionCaption').textContent=caption;$('#illusionQuestion').textContent=question;$('#currentBody').textContent=`ILLUSION / ${name.split(' / ')[0]}`;$('#illusionReadout').textContent=illusion.type==='muller'?'160 px = 160 px':'PRESSURE ACTIVE'}
function cycleIllusion(){const type=illusion.next();core.set('illusion',type,'ILLUSION_CHANGED');updateIllusionMeta();toast(illusionMeta[type][0])}
function toggleMeasure(){illusion.measure=!illusion.measure;illusion.setMeasure(illusion.measure);$('#measureToggle').setAttribute('aria-pressed',String(illusion.measure));$('#measureToggle').textContent=illusion.measure?'HIDE MEASURE':'REVEAL MEASURE';$('#measureLine').classList.toggle('show',illusion.measure&&illusion.type==='muller');core.contact('MEASURE_TOGGLE',{visible:illusion.measure,type:illusion.type});if(illusion.measure)toast('Measure revealed: source lines are equal')}

function renderTrace(){const list=$('#traceList');list.innerHTML='';core.trace.slice(0,60).forEach(event=>{const li=document.createElement('li');li.innerHTML=`<strong>${event.type.replaceAll('_',' ')}</strong><br><span>${new Date(event.at).toLocaleTimeString()} · ${event.route}</span>`;list.append(li)});$('#traceCount').textContent=`${core.trace.length} CONTACT${core.trace.length===1?'':'S'}`}
function openTrace(on=true){$('#traceDrawer').classList.toggle('open',on);$('#traceDrawer').setAttribute('aria-hidden',String(!on));$('#traceButton').setAttribute('aria-expanded',String(on));if(on)renderTrace()}

async function loadSeed(){try{const text=await fetch('./visual-lab.cading',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(r.status);return r.text()});seed=JMCore.parseCading(text);core.state.seed=seed;core.persist();$('#seedStatus').textContent=seed.status;core.contact('CADING_SEED_LOADED',{name:seed.name,version:seed.version,status:seed.status,routes:seed.routes.length})}catch(err){$('#seedStatus').textContent='EMBEDDED SEED / FETCH HELD';core.contact('CADING_SEED_HELD',{message:String(err)})}renderTrace()}

function formPrompt(){const data={subject:$('#promptSubject').value.trim(),field:$('#promptField').value.trim(),light:$('#promptLight').value.trim(),motion:$('#promptMotion').value.trim(),frame:$('#promptFrame').value.trim(),exclude:$('#promptExclude').value.trim()};const out=`SUBJECT — ${data.subject}\nFIELD — ${data.field}\nLIGHT — ${data.light}\nMOTION — ${data.motion}\nFRAME — ${data.frame}\nEXCLUDE — ${data.exclude}\n\nJM GOVERNANCE — keep visual state readable; preserve source identity; no decorative dead controls; mobile-first actual viewport fit.`;$('#promptOutput').textContent=out;core.contact('PROMPT_FORMED',{fields:Object.keys(data).filter(k=>data[k]),characters:out.length});return out}
function renderStory(){const rail=$('#storyRail');rail.innerHTML='';const story=core.state.story||[];$('#storyCount').textContent=`${story.length} FRAME${story.length===1?'':'S'}`;$('#storyEmpty').hidden=story.length>0;story.forEach((frame,index)=>{const card=document.createElement('article');card.className='story-card';card.dataset.id=frame.id;const media=frame.image?`<img src="${frame.image}" alt="Captured story frame ${index+1}">`:`<div class="prompt-output">${escapeHtml(frame.text||'Text frame')}</div>`;card.innerHTML=`${media}<div><small>${index+1} · ${(frame.kind||'frame').toUpperCase()}</small><textarea aria-label="Caption frame ${index+1}" placeholder="What does this frame carry?">${escapeHtml(frame.caption||'')}</textarea><div class="choice-row"><button data-move="-1" type="button">←</button><button data-move="1" type="button">→</button><button data-remove type="button">REMOVE</button></div></div>`;card.querySelector('textarea').addEventListener('input',e=>core.updateStory(frame.id,{caption:e.target.value}));card.querySelector('[data-remove]').addEventListener('click',()=>{core.removeStory(frame.id);renderStory()});card.querySelectorAll('[data-move]').forEach(btn=>btn.addEventListener('click',()=>moveFrame(frame.id,+btn.dataset.move)));rail.append(card)})}
function moveFrame(id,delta){const story=[...(core.state.story||[])],i=story.findIndex(x=>x.id===id),j=Math.max(0,Math.min(story.length-1,i+delta));if(i<0||i===j)return;[story[i],story[j]]=[story[j],story[i]];core.state.story=story;core.contact('STORY_FRAME_MOVED',{id,from:i,to:j});renderStory()}
function escapeHtml(s=''){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function formatTime(v){if(!Number.isFinite(v))return'00:00.000';const m=Math.floor(v/60),s=Math.floor(v%60),ms=Math.floor((v%1)*1000);return`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}`}
function downloadStory(){JMCore.download(`JM_VISUAL_STORY_${Date.now()}.json`,{schema:'jm.visual.story/0.1',body:core.identity,frames:core.state.story||[],trace_links:core.trace.slice(0,20),exported_at:JMCore.now()})}
function recoverRoute(){const route=core.state.route;if(route==='illusion'){illusion.setAngle(42);illusion.setPressure(64);illusion.setType('muller');illusion.measure=false;$('#finAngle').value=42;$('#illusionPressure').value=64;$('#measureLine').classList.remove('show');updateIllusionMeta()}if(route==='image'){$('#imageControls').querySelectorAll('input').forEach(i=>{i.value=i.dataset.filter==='hue'||i.dataset.filter==='blur'?0:100;i.nextElementSibling.textContent=i.value});imageField.reset()}if(route==='motion'){motion.set('speed',70);motion.set('density',52);motion.set('pull',90);motion.set('preset','orbit');motion.pause(true)}if(route==='prompt')formPrompt();core.contact('RECOVERY_BODY',{route});toast(`${names[route]} recovered`)}
function primaryContact(){const r=core.state.route;if(r==='illusion')toggleMeasure();else if(r==='image'){const data=imageField.export();if(data){JMCore.download(`JM_IMAGE_${Date.now()}.png`,dataURLtoBlob(data),'image/png');core.contact('IMAGE_EXPORTED',{})}else toast('Load an image source first')}else if(r==='video')captureVideoFrame();else if(r==='motion'){const running=motion.pause();$('#motionPause').textContent=running?'PAUSE':'RESUME';core.contact('MOTION_TOGGLE',{running})}else if(r==='prompt')formPrompt();else if(r==='story')$('#addTextFrame').click()}
function dataURLtoBlob(url){const [head,data]=url.split(','),mime=(head.match(/:(.*?);/)||[])[1]||'application/octet-stream',bin=atob(data),arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return new Blob([arr],{type:mime})}
function captureVideoFrame(){const image=videoField.capture();if(!image)return toast('Load a video source first');core.addStoryFrame({kind:'video-frame',source:'video',time:videoField.video.currentTime,image});renderStory();toast('Frame sent to Story Rail')}

$$('.route').forEach(b=>b.addEventListener('click',()=>routeTo(b.dataset.route,'route-rail')));
$('#previousRoute').addEventListener('click',()=>routeStep(-1));$('#nextRoute').addEventListener('click',()=>routeStep(1));$('#primaryAction').addEventListener('click',primaryContact);$('#recoveryButton').addEventListener('click',recoverRoute);
$('#illusionCycle').addEventListener('click',cycleIllusion);$('#measureToggle').addEventListener('click',toggleMeasure);
$('#finAngle').addEventListener('input',e=>{illusion.setAngle(e.target.value);e.target.nextElementSibling.textContent=`${e.target.value}°`});$('#finAngle').addEventListener('change',e=>core.contact('ILLUSION_ANGLE',{value:+e.target.value}));
$('#illusionPressure').addEventListener('input',e=>{illusion.setPressure(e.target.value);e.target.nextElementSibling.textContent=e.target.value});$('#illusionPressure').addEventListener('change',e=>core.contact('ILLUSION_PRESSURE',{value:+e.target.value}));
$$('[data-observe]').forEach(b=>b.addEventListener('click',()=>{core.contact('OBSERVATION_RECORDED',{illusion:illusion.type,answer:b.dataset.observe,measure_visible:illusion.measure});toast('Observation traced—not judged')}));

$('#imageInput').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;await imageField.load(file);$('#imageState').textContent='SOURCE LIVE';core.contact('IMAGE_SOURCE_LOADED',{name:file.name,type:file.type,size:file.size})});
$('#imageControls').addEventListener('input',e=>{if(!e.target.matches('input'))return;imageField.setFilter(e.target.dataset.filter,e.target.value);e.target.nextElementSibling.textContent=e.target.value});
$('#imageControls').addEventListener('change',e=>{if(e.target.matches('input'))core.contact('IMAGE_TREATMENT',{filter:e.target.dataset.filter,value:+e.target.value})});
$('#imageReset').addEventListener('click',()=>{imageField.reset();$('#imageControls').querySelectorAll('input').forEach(i=>{i.value=i.dataset.filter==='hue'||i.dataset.filter==='blur'?0:100;i.nextElementSibling.textContent=i.value});core.contact('IMAGE_TREATMENT_RESET',{})});
['pointerdown','touchstart','keydown'].forEach(type=>$('#compareHold').addEventListener(type,e=>{if(type==='keydown'&&![' ','Enter'].includes(e.key))return;imageField.setCompare(true)}));['pointerup','pointerleave','touchend','keyup','blur'].forEach(type=>$('#compareHold').addEventListener(type,()=>imageField.setCompare(false)));

$('#videoInput').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;await videoField.load(file);$('#videoState').textContent='SOURCE LIVE';$('#videoDuration').textContent=formatTime(videoField.video.duration);core.contact('VIDEO_SOURCE_LOADED',{name:file.name,type:file.type,size:file.size,duration:videoField.video.duration})});
$('#videoPlay').addEventListener('click',()=>{videoField.toggle();core.contact('VIDEO_PLAY_TOGGLE',{paused:videoField.video.paused})});$('#frameBack').addEventListener('click',()=>videoField.step(-1));$('#frameForward').addEventListener('click',()=>videoField.step(1));
$('#videoSpeed').addEventListener('change',e=>{videoField.setSpeed(e.target.value);core.contact('VIDEO_SPEED',{value:+e.target.value})});$('#videoContrast').addEventListener('input',e=>videoField.setContrast(e.target.value));$('#videoContrast').addEventListener('change',e=>core.contact('VIDEO_CONTRAST',{value:+e.target.value}));$('#captureFrame').addEventListener('click',captureVideoFrame);
videoField.video.addEventListener('timeupdate',()=>{const v=videoField.video;$('#videoTime').textContent=formatTime(v.currentTime);$('#videoSeek').value=v.duration?v.currentTime/v.duration*1000:0});$('#videoSeek').addEventListener('input',e=>{const v=videoField.video;if(v.duration)v.currentTime=e.target.value/1000*v.duration});

$$('.motion-preset').forEach(b=>b.addEventListener('click',()=>{motion.set('preset',b.dataset.preset);core.contact('MOTION_PRESET',{preset:b.dataset.preset});toast(`${b.dataset.preset.toUpperCase()} field`)}));
[['motionSpeed','speed'],['motionDensity','density'],['motionPull','pull']].forEach(([id,k])=>{$(`#${id}`).addEventListener('input',e=>{motion.set(k,e.target.value);e.target.nextElementSibling.textContent=e.target.value});$(`#${id}`).addEventListener('change',e=>core.contact('MOTION_PARAMETER',{key:k,value:+e.target.value}))});
$('#motionPause').addEventListener('click',e=>{const running=motion.pause();e.target.textContent=running?'PAUSE':'RESUME';$('#motionState').textContent=running?'RUNNING':'HELD';core.contact('MOTION_TOGGLE',{running})});

$('#formPrompt').addEventListener('click',()=>{formPrompt();toast('Visual brief formed')});$('#copyPrompt').addEventListener('click',async()=>{const text=$('#promptOutput').textContent||formPrompt();try{await navigator.clipboard.writeText(text);toast('Brief copied')}catch{toast('Copy unavailable—brief remains selected')}});$('#savePrompt').addEventListener('click',()=>{const text=$('#promptOutput').textContent||formPrompt();core.addStoryFrame({kind:'visual-brief',source:'prompt',text});renderStory();toast('Brief sent to Story Rail')});
$('#addTextFrame').addEventListener('click',()=>{const text=prompt('Text frame');if(!text)return;core.addStoryFrame({kind:'text',source:'story',text});renderStory()});$('#exportStory').addEventListener('click',downloadStory);

$('#traceButton').addEventListener('click',()=>openTrace(!$('#traceDrawer').classList.contains('open')));$('#closeTrace').addEventListener('click',()=>openTrace(false));$('#generateReceipt').addEventListener('click',()=>{$('#receiptPreview').textContent=JSON.stringify(core.ding(),null,2);renderTrace();toast('Working Ding receipt generated')});$('#exportTrace').addEventListener('click',()=>JMCore.download(`JM_VISUAL_TRACE_${Date.now()}.json`,core.exportBody()));$('#clearTrace').addEventListener('click',()=>{core.clear();renderTrace();$('#receiptPreview').textContent='No Ding generated in this session.'});

$('#motionToggle').addEventListener('click',e=>{const reduced=$('#app').dataset.motion!=='reduced';$('#app').dataset.motion=reduced?'reduced':'full';e.currentTarget.setAttribute('aria-pressed',String(reduced));ambient.setRunning(!reduced);illusion.running=!reduced;if(!reduced)illusion.loop();core.set('motion',reduced?'reduced':'full','MOTION_PREFERENCE');toast(reduced?'Motion reduced':'Motion restored')});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;$('#installButton').hidden=false});$('#installButton').addEventListener('click',async()=>{if(!installEvent)return;installEvent.prompt();await installEvent.userChoice;installEvent=null;$('#installButton').hidden=true});
window.addEventListener('jm:trace',renderTrace);window.addEventListener('jm:trace-cleared',renderTrace);
window.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName))return;if(e.key>='1'&&e.key<='6')routeTo(routes[+e.key-1],'keyboard');if(e.key==='ArrowRight')routeStep(1);if(e.key==='ArrowLeft')routeStep(-1);if(e.key===' '){e.preventDefault();primaryContact()}if(e.key.toLowerCase()==='r')recoverRoute();if(e.key.toLowerCase()==='t')openTrace(true)});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

illusion.setType(core.state.illusion||'muller');updateIllusionMeta();formPrompt();renderStory();renderTrace();routeTo(core.state.route||'illusion','restore');loadSeed();
})();
