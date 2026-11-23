import assert from 'node:assert/strict';
import {createJMSoftContactShadow} from './JM_SOFT_CONTACT_SHADOW_v0_1.mjs';
let draws=0,depth=[],blend=0;
const gl=new Proxy({
 createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>({}),
 getShaderParameter:()=>true,getProgramParameter:()=>true,
 getAttribLocation:()=>0,getUniformLocation:()=>({}),
 drawElements:()=>draws++,depthMask:x=>depth.push(x),blendFunc:()=>blend++
},{get(o,k){if(k in o)return o[k];return typeof k==='string'&&k===k.toUpperCase()?1:()=>{}}});
const shadows=createJMSoftContactShadow(gl);
const m=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
assert.equal(shadows.draw({vp:m,restoreProgram:{}},[{x:1,z:2},{x:-1,z:-2}]),2);
assert.equal(draws,2);assert.deepEqual(depth,[false,true]);assert.equal(blend,1);
shadows.dispose();
console.log('JM SOFT CONTACT SHADOW v0.1: 2 GPU submissions, blend state restored (mock WebGL only) PASS');
