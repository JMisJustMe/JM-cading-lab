/* JM WRESTLEFORM v0.3.4 alpha-safe receiver — first-open mocked-DOM/WebGL QA
 * This verifies source execution and contract preservation, NOT real GPU pixels or FPS.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('./receivers/JM_WRESTLEFORM_DUAL_EXPRESSIONS_v0_3_4_ALPHA_SAFE.html',import.meta.url),'utf8');
const scripts=[...source.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/g)]
  .filter(x=>!/(type="(?:text\/plain|application\/json)")/.test(x[0])).map(x=>x[1]);
assert.equal(scripts.length,4,'3 renderer organs + original WRESTLEFORM gameplay');
for(const js of scripts){new Function(js)}
const ids=new Set([...source.matchAll(/\bid=["']([a-zA-Z_$][\w$-]*)["']/g)].map(x=>x[1]).filter(x=>!x.includes('-')));
const entries=new Map(),pending=[];
let milliseconds=0,draws=0,binds=0,transparentSubmissions=0,blendEnabled=false,depthWritable=true;
const depthTransitions=[];
const fake2d=new Proxy({}, {get:()=>()=>{}});
const gl=new Proxy({
 createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>({}),
 getShaderParameter:()=>true,getProgramParameter:()=>true,
 getAttribLocation:()=>0,getUniformLocation:()=>({}),
 getExtension:()=>null,
 BLEND:'JM_BLEND', enable:k=>{if(k==='JM_BLEND')blendEnabled=true},
 disable:k=>{if(k==='JM_BLEND')blendEnabled=false},
 depthMask:v=>{depthWritable=v;depthTransitions.push(v)},
 drawElements:()=>{draws++;if(blendEnabled&&!depthWritable)transparentSubmissions++},
 bindBuffer:()=>binds++
},{get(o,k){if(k in o)return o[k];return typeof k==='string'&&k===k.toUpperCase()?1:()=>{}}});
function element(id){return {id,style:{setProperty(){}},dataset:{},innerHTML:'',textContent:'',value:'',hidden:false,
 width:900,height:570,classList:{add(){},remove(){},toggle(){return false},contains(){return false}},
 addEventListener(){},removeEventListener(){},setAttribute(){},appendChild(){},append(){},replaceChildren(){},
 remove(){},click(){},closest(){return null},querySelector(){return element('desc')},querySelectorAll(){return []},
 getBoundingClientRect(){return {left:0,top:0,width:900,height:570}},setPointerCapture(){},releasePointerCapture(){},
 getContext(t){return t==='2d'?fake2d:gl}}}
const document={body:element('body'),documentElement:element('root'),querySelector(s){
 if(!entries.has(s))entries.set(s,element(s));return entries.get(s)},querySelectorAll(){return []},
 createElement:element,addEventListener(){}};
const window={document,addEventListener(){}};window.window=window;
const domGlobals=new Proxy({}, {has(_,k){return typeof k==='string'&&ids.has(k)},
 get(_,k){return typeof k==='string'?document.querySelector('#'+k):undefined}});
const context={window,document,domGlobals,performance:{now:()=>milliseconds},
 requestAnimationFrame:f=>{pending.push(f);return pending.length},addEventListener(){},
 navigator:{vibrate(){}},matchMedia:()=>({matches:false}),innerWidth:900,innerHeight:570,devicePixelRatio:1,
 setTimeout:()=>0,clearTimeout(){},alert(){},Blob:class{},
 URL:{createObjectURL:()=>'',revokeObjectURL(){}}};
runInNewContext(scripts[0],context,{timeout:5000,filename:'JMShadows-inline'});
assert.equal(window.JMSoftContactShadow.JM_SOFT_CONTACT_SHADOW_VERSION,'0.1.0');
runInNewContext(scripts[1],context,{timeout:5000,filename:'JMStaticBatch-inline'});
assert.equal(window.JMStaticMeshBatch.JM_STATIC_BATCH_VERSION,'0.2.0');
runInNewContext(scripts[2],context,{timeout:5000,filename:'JMRenderContact-inline'});
assert.equal(window.JMRenderContact.JM_RENDER_CONTACT_VERSION,'0.1.0');
runInNewContext('with(domGlobals){'+scripts[3]+'}',context,{timeout:5000,filename:'JM-WRESTLEFORM-live'});
assert(window.JM_WRESTLE_RENDER_QA,'receiver instrument installed');
assert(window.JM_WRESTLE_DUAL_QA,'original dual-expression runtime preserved');
const staticBinds=binds;
assert(pending.length>=1,'frames scheduled');
milliseconds+=16.7;pending.pop()(milliseconds);
const frame=window.JM_WRESTLE_RENDER_QA.current();
assert.equal(frame.frames,1);
assert.equal(frame.draws,draws);
assert(binds-staticBinds>=frame.meshChanges*3,'dynamic + static bindings accounted');
assert.equal(frame.draws,92,'batched opaque ring + separately blended mat + 2 shadows + dynamic wrestlers');
assert.equal(window.JM_WRESTLE_RENDER_QA.normalMapCorrected,true);
assert.equal(window.JM_WRESTLE_RENDER_QA.softContactShadows,true);
const staticReport=window.JM_WRESTLE_RENDER_QA.staticBatch();
assert.equal(staticReport.sourceCalls,30,'30 final-ring opaque draws batched');
assert.equal(staticReport.transparentDraws,1,'alpha emblem preserved separately');
assert.equal(staticReport.batchCount,1,'31 static arena draws compile into one GPU indexed draw');
assert.equal(staticReport.compileCount,1);
assert.equal(staticReport.indices,1656);
assert(frame.meshChanges<frame.draws,'cache reduces repeated bindings');
assert(frame.transforms>frame.draws,'animated characters continue rendering separately');
assert.equal(window.JM_WRESTLE_DUAL_QA.status().play,'live');
assert.equal(typeof entries.get('#startBtn').onclick,'function');
entries.get('#startBtn').onclick();
assert.equal(window.JM_WRESTLE_QA.status().run,true);
window.JM_WRESTLE_DUAL_QA.setExperience('sequence');
assert.equal(window.JM_WRESTLE_DUAL_QA.status().play,'sequence');
window.JM_WRESTLE_DUAL_QA.setExperience('live');
assert.equal(window.JM_WRESTLE_DUAL_QA.status().play,'live');
milliseconds+=16.7;pending.pop()(milliseconds);
assert.equal(window.JM_WRESTLE_RENDER_QA.current().frames,2);
assert.equal(window.JM_WRESTLE_RENDER_QA.current().draws,frame.draws);
assert.equal(window.JM_WRESTLE_RENDER_QA.staticBatch().compileCount,1,'static arena reused without recompiling');
assert.equal(transparentSubmissions,6,'one alpha ring marking + two contact shadows over 2 frames');
assert.deepEqual(depthTransitions,[false,true,false,true,false,true,false,true],'two transparent passes per frame restore depth');
assert.equal(depthWritable,true,'depth writing restored after transparent primitives');
assert.equal(blendEnabled,false,'blend state restored after transparent primitives');
assert.equal(window.JM_WRESTLE_RENDER_QA.donorSourceVerified,false);
assert.equal(window.JM_WRESTLE_RENDER_QA.gpuBenchmarked,false);
console.log('JM WRESTLEFORM v0.3.4: first-open, 30-to-1 static + 1 alpha, 92 draws with contact shadows, normals, dual-mode PASS',JSON.stringify({draws:frame.draws,meshBindings:frame.meshChanges,mode:'dual',gpuClaim:false}));
