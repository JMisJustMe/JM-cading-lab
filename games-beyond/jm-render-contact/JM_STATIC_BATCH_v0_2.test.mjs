import assert from 'node:assert/strict';
import {createJMStaticBatcher} from './JM_STATIC_BATCH_v0_2.mjs';
import {normalMatrix3} from './JM_RENDER_CONTACT_v0_1.mjs';
const calls=[];
let id=0;const mock=new Proxy({
 createShader:()=>({kind:'shader'}),createProgram:()=>({kind:'program'}),createBuffer:()=>({id:++id}),
 getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:()=>({}),
 getExtension:()=>null,drawElements(...args){calls.push(args)},deleteBuffer(){}
}, {get(a,p){if(p in a)return a[p];return typeof p==='string'&&p===p.toUpperCase()?1:()=>{}}});
const geom={cpuP:[0,0,0,1,0,0,0,1,0],cpuN:[0,0,1,0,0,1,0,0,1],cpuI:[0,1,2]};
const mat=[1,0,0,0,0,1,0,0,0,0,1,0,3,2,-1,1];
const batch=createJMStaticBatcher(mock,{normalMatrix:normalMatrix3});
const entries=Array.from({length:40},(_,i)=>({mesh:geom,mat,color:[.4,.5,.6,1],rim:[1,.7,.4],glow:.1}));
const st=batch.build(entries);
assert.equal(st.sourceCalls,40);assert.equal(st.storedVertices,120);assert.equal(st.indices,120);assert.equal(st.batchCount,1);
const n=batch.draw({vp:mat,light:[.5,1,.5],cam:[0,4,8],restoreProgram:{}});
assert.equal(n,1);assert.equal(calls.length,1);assert.equal(calls[0][1],120);
const st2=batch.build(entries);assert.equal(st2.compileCount,2);assert.equal(st2.batchCount,1);
assert.throws(()=>batch.build([{mesh:geom,mat:new Array(16).fill(0),color:[1,1,1,1],rim:[1,1,1],glow:0}]),/invertible/);
assert.equal(batch.stats.batchCount,1,'previous good body retained on invalid input');
batch.dispose();
console.log('JM STATIC BATCH v0.2: geometry, inverse-transpose, submission, rebuild, disposal PASS (MOCK GPU only)');
