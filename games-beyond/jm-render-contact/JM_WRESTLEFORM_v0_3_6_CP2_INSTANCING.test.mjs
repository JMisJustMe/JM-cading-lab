/* JM WRESTLEFORM v0.3.6 CP2 dynamic instancing — source-executing Node smoke.
 * WebGL2 native, WebGL1 ANGLE, WebGL1 direct fallback. This is MOCK-GL,
 * not shader compilation or device pixel quality.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('./receivers/JM_WRESTLEFORM_DUAL_EXPRESSIONS_v0_3_6_CP2_DYNAMIC_INSTANCING.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/g)]
  .filter(x=>!/(type="(?:text\/plain|application\/json)")/.test(x[0])).map(x=>x[1]);
assert.equal(scripts.length,4,'renderer organs and real game');
for(const code of scripts)new Function(code);
const game=scripts.at(-1);
const V=[...game.matchAll(/const V=`([\s\S]*?)`;/g)].at(-1)[1];
const F=[...game.matchAll(/const F=`([\s\S]*?)`;/g)].at(-1)[1];
const digest=s=>createHash('sha256').update(s).digest('hex');
assert.equal(digest(V),'1c11cddccb982c3ef147183d5d9a27a06c673d6b60dcdaa11a7de1367bff4da0');
assert.equal(digest(F),'6b0756f52d61e3e400597dfbd7530eadce50929ecfef1bb5f140e0236657dcf4');
const ids=new Set([...html.matchAll(/\bid=["']([a-zA-Z_$][\w$-]*)["']/g)].map(x=>x[1]).filter(x=>!x.includes('-')));
function runCase(mode){
 const queue=[],elems=new Map(),divisors=[];let ms=0,direct=0,instanced=0,draws=0,upload=0,normalUploads=0;
 const ext={vertexAttribDivisorANGLE(a,d){divisors.push(d)},drawElementsInstancedANGLE(t,c,u,o,n){instanced++;draws++}};
 const native={vertexAttribDivisor(a,d){divisors.push(d)},drawElementsInstanced(t,c,u,o,n){instanced++;draws++}};
 const mock={createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>({}),getShaderParameter:()=>true,
 getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:()=>({}),
 getExtension:name=>mode==='angle'&&name==='ANGLE_instanced_arrays'?ext:null,
 drawElements(){direct++;draws++},bufferData(){upload++},uniformMatrix3fv(){normalUploads++}};
 if(mode==='webgl2')Object.assign(mock,native);
 const gl=new Proxy(mock,{get(o,k){if(k in o)return o[k];if(k==='drawElementsInstanced'||k==='vertexAttribDivisor')return undefined;
 return typeof k==='string'&&k===k.toUpperCase()?k:()=>{}}});
 const ctx=new Proxy({}, {get:()=>()=>{}});
 const element=id=>({id,style:{setProperty(){}},dataset:{},innerHTML:'',textContent:'',value:'',width:900,height:570,
 classList:{add(){},remove(){},toggle(){return false},contains(){return false}},
 addEventListener(){},removeEventListener(){},setAttribute(){},appendChild(){},append(){},replaceChildren(){},
 remove(){},click(){},closest(){return null},querySelector(){return element('inner')},querySelectorAll(){return []},
 getBoundingClientRect(){return {left:0,top:0,width:900,height:570}},setPointerCapture(){},releasePointerCapture(){},
 getContext:t=>t==='2d'?ctx:gl});
 const document={body:element('body'),documentElement:element('root'),querySelector(s){
 if(!elems.has(s))elems.set(s,element(s));return elems.get(s)},querySelectorAll:()=>[],createElement:element,addEventListener(){}};
 const window={document,addEventListener(){}};window.window=window;
 const env=new Proxy({}, {has(_,k){return typeof k==='string'&&ids.has(k)},
 get(_,k){return typeof k==='string'?document.querySelector('#'+k):undefined}});
 for(const js of scripts.slice(0,-1))new Function('window','document','performance',js)(window,document,{now:()=>ms});
 const boot=new Function('env','window','document','performance','requestAnimationFrame','addEventListener',
 'navigator','matchMedia','innerWidth','innerHeight','devicePixelRatio','setTimeout','clearTimeout','alert','Blob','URL',
 'with(env){'+game+'}');
 boot(env,window,document,{now:()=>ms},fn=>queue.push(fn),()=>{},{vibrate(){}},()=>({matches:false}),900,570,1,
 ()=>0,()=>{},()=>{},class {},{createObjectURL:()=>'',revokeObjectURL(){}});
 let before=0;
 for(let frame=0;frame<3;frame++){
   assert(queue.length>0);
   ms+=16.67;queue.pop()(ms);
   const stats=window.JM_WRESTLE_RENDER_QA.current(),current=draws-before;before=draws;
   assert.equal(stats.draws,current,'renderer counters match issued GPU calls');
   assert.equal(window.JM_WRESTLE_RENDER_QA.staticBatch().compileCount,1,'static arena reused');
   if(mode==='direct'){
     assert.equal(current,92,'uninstanced fallback must match v0.3.5');
     assert.equal(stats.instances,0);
   } else {
     assert.equal(current,7,'three instanced groups + ring/shadow passes');
     assert.equal(stats.instances,88,'88 body pieces retained');
     assert.equal(stats.instancedDraws,3);
   }
 }
 elems.get('#startBtn').onclick();assert.equal(window.JM_WRESTLE_QA.status().run,true);
 window.JM_WRESTLE_DUAL_QA.setExperience('sequence');assert.equal(window.JM_WRESTLE_DUAL_QA.status().play,'sequence');
 window.JM_WRESTLE_DUAL_QA.setExperience('live');assert.equal(window.JM_WRESTLE_DUAL_QA.status().play,'live');
 const i=window.JM_WRESTLE_RENDER_QA.instancing();
 assert.equal(i.available,mode!=='direct');
 assert(divisors.length===0||divisors.slice(-6).every(x=>x===0),'attribute divisors reset to legacy zero');
 return {mode,frames:3,drawsPerFrame:mode==='direct'?92:7,direct,instanced,normalUploads,upload,instances:i.lastFrameInstances};
}
const results=['direct','webgl2','angle'].map(runCase);
console.log('JM WRESTLEFORM v0.3.6 source-authentic CP2 GLSL + CPU instancing MOCK PASS',JSON.stringify(results));