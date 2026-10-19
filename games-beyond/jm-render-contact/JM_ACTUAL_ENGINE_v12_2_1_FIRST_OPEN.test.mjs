/* JM Actual Engine v12.2.1 — simulated first-open dual-render contract
 * Sources execute with DOM + WebGL mocked. NOT actual device/browser or GPU proof.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('./receivers/JM_ACTUAL_ENGINE_v12_2_1_RENDER_CONTACT.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
assert.equal(scripts.length,5);
const callbacks=[],elements=new Map(),ctx2=new Proxy({
 measureText:s=>({width:String(s).length*8}),
 createLinearGradient:()=>({addColorStop(){}})
},{get(o,k){return o[k]??(()=>{})}});
let drawCount=0,bindCount=0,ms=0;
const gl=new Proxy({
 createBuffer:()=>({}),createShader:()=>({}),createProgram:()=>({}),
 getShaderParameter:()=>true,getProgramParameter:()=>true,
 getAttribLocation:()=>0,getUniformLocation:()=>({}),
 drawArrays:()=>drawCount++,bindBuffer:()=>bindCount++
},{get(o,k){return o[k]??(typeof k==='string'&&k===k.toUpperCase()?1:()=>{})}});
const element=id=>({id,style:{cssText:'',setProperty(){}},dataset:{},value:'',textContent:'',innerHTML:'',
 checked:false,width:600,height:400,
 classList:{add(){},remove(){},toggle(){},contains(){return false}},
 appendChild(){},replaceChildren(){},addEventListener(){},removeEventListener(){},
 querySelector(){return element('nested')},querySelectorAll(){return []},
 getBoundingClientRect(){return {left:0,top:0,width:600,height:400}},
 getContext:t=>t==='2d'?ctx2:gl,setPointerCapture(){},closest(){return null},
 click(){},scrollIntoView(){},focus(){},remove(){}});
const document={body:element('body'),documentElement:element('root'),
 getElementById(id){if(!elements.has(id))elements.set(id,element(id));return elements.get(id)},
 querySelector(s){return this.getElementById(s)},querySelectorAll(){return []},createElement:element,addEventListener(){}};
const window={document,addEventListener(){},dispatchEvent(){},location:{protocol:'file:'}};
window.window=window;
const autoIds=new Proxy({},{has(_,k){return ['glCanvas','render2d','render3d','jmStage','glBadge'].includes(k)},
 get(_,k){return document.getElementById(k)}});
const content=scripts.slice(0,3).join('\n')+'\nconst JMActualDualCore=window.JMActualDualCore;\n'+scripts.slice(3).join('\n');
const run=new Function('env','window','document','globalThis','navigator','localStorage','performance',
 'requestAnimationFrame','addEventListener','setTimeout','clearTimeout','CustomEvent','URL','Blob',
 'devicePixelRatio','innerWidth','innerHeight','getComputedStyle','structuredClone','with(env){'+content+'}');
run(autoIds,window,document,window,{vibrate(){}},{getItem:()=>null,setItem(){}},{now:()=>ms},
 cb=>{callbacks.push(cb);return callbacks.length},()=>{},()=>0,()=>{},
 class{constructor(type,init){this.type=type;this.detail=init?.detail}},
 {createObjectURL:()=>'',revokeObjectURL(){}},class{},1,600,400,()=>({}),
 value=>JSON.parse(JSON.stringify(value)));
assert(window.JMActualDualRenderer,'existing renderer exposes exact source API');
assert(window.__JM_ACTUAL_ENGINE_CLOSURE__,'v12.2 owner recovery API preserved');
const suite=window.JMActualDualCore.selfTest();
assert.equal(suite.state,'DING');assert.equal(suite.passed,suite.total);
assert.equal(suite.total,11);
assert(window.JMActualDualRenderer.jmRenderContact,'new native rendering interface exposed');
window.JMActualDualRenderer.setMode('3d');
const first=window.JMActualDualRenderer.jmRenderContact();
assert(first.frames>=1&&first.draws>=1);
assert.equal(first.draws,first.normalUniforms,'all actual objects have corrected normals');
assert.equal(first.bufferBindCalls,first.meshSwitches*2,'mesh cache avoids duplicate vertex pointers');
assert.equal(window.JMActualDualRenderer.syncCheck(),true);
window.JMActualDualRenderer.render3D();
const again=window.JMActualDualRenderer.jmRenderContact();
assert.equal(again.draws,first.draws);
assert.equal(again.bufferBindCalls,first.bufferBindCalls);
assert(again.frames>first.frames);
window.JMActualDualRenderer.setMode('2d');
assert.equal(window.JMActualDualRenderer.state.mode,'2d');
console.log('JM ACTUAL ENGINE first-open simulated PASS',JSON.stringify({dualCore:suite.passed+'/'+suite.total,first,again,return:'2d',deviceCertified:false}));
