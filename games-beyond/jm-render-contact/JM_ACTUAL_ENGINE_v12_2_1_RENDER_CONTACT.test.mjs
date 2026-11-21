/* JM Actual Engine v12.2.1: source-level renderer contact regression
 * Real renderer drawMesh source, mocked GL provider, no GPU/FPS claim.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalMatrix3} from './JM_RENDER_CONTACT_v0_1.mjs';
const source=readFileSync(new URL('./receivers/JM_ACTUAL_ENGINE_v12_2_1_RENDER_CONTACT.html',import.meta.url),'utf8');
const scripts=[...source.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
assert.equal(scripts.length,5);
for(const js of scripts)new Function(js);
const begin=source.indexOf('function drawMesh(o,vp){'),end=source.indexOf('function drawFloor(vp){',begin);
assert(begin>=0&&end>begin);
const drawSource=source.slice(begin,end);
assert(drawSource.includes('uNormal'),'normal matrix uploaded in live draw path');
assert(drawSource.includes('jmRenderBindingCache'),'actual mesh-buffer cache connected');
const binds=[],draws=[],normals=[],models=[];
const gl={
 ARRAY_BUFFER:4,TRIANGLES:5,FLOAT:7,
 bindBuffer:(target,obj)=>binds.push(obj),enableVertexAttribArray(){},vertexAttribPointer(){},
 uniformMatrix4fv:(where,_,value)=>{if(where==='model')models.push([...value])},
 uniformMatrix3fv:(where,_,value)=>{if(where==='normal')normals.push([...value])},
 uniform4fv(){},uniform1f(){},drawArrays:(...args)=>draws.push(args)
};
const R={gl,meshes:{cube:{v:'cubeV',n:'cubeN',count:36},octa:{v:'octaV',n:'octaN',count:24}},
 locations:{aPosition:0,aNormal:1,uModel:'model',uMVP:'vp',uNormal:'normal',uColor:'color',uSelected:'selected'},
 jmRenderBindingCache:null,jmRenderStats:{draws:0,bufferBindCalls:0,meshSwitches:0,normalUniforms:0}};
const model=o=>[o.scale[0],0,0,0,0,o.scale[1],0,0,0,0,o.scale[2],0,o.pos[0],o.pos[1],o.pos[2],1];
const draw=new Function('R','modelMatrix','mat4Multiply','window',drawSource+';return drawMesh')(R,model,(_,b)=>b,{JMRenderContact:{normalMatrix3}});
const scene=[['cube',[1,2,3]],['cube',[2,3,4]],['cube',[3,4,5]],['octa',[1,1,2]],['octa',[2,2,3]],['cube',[2,5,3]]];
scene.forEach(([mesh,scale],i)=>draw({mesh,scale,pos:[i,0,0],rot:[0,0,0],color:[.2,.3,.4,1],selected:false},[]));
assert.equal(draws.length,6,'game objects still draw in original order');
assert.deepEqual(draws.map(x=>x[2]),[36,36,36,24,24,36]);
assert.equal(binds.length,6,'3 distinct consecutive meshes, each 2 buffer binds');
assert.equal(R.jmRenderStats.meshSwitches,3);
assert.equal(R.jmRenderStats.bufferBindCalls,6);
assert.equal(R.jmRenderStats.draws,6);
assert.equal(normals.length,6,'per-object normal matrices uploaded');
assert(Math.abs(normals[1][0]-.5)<1e-7);
assert(Math.abs(normals[1][4]-1/3)<1e-7);
assert(Math.abs(normals[1][8]-.25)<1e-7);
assert.equal(models.length,6,'all existing model transforms retained');
console.log('JM ACTUAL ENGINE v12.2.1 PASS: 6 draws / 6 binds (legacy same sequence 12), normal matrix corrected; MOCK GL only');
