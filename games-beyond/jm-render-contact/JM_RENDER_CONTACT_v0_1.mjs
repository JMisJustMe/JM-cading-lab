/* JM RENDER CONTACT v0.1 | JM ECOSTATE | 2026-10-19
 * Opt-in, engine-neutral contact surface for EXISTING JM renderer bodies.
 * NOT CP2's recovered shader/mesh source. Does not replace or mutate a game.
 * Donor contract: JM ONE ON ONE v0.6.0, SHA256
 * d393e381db46bae9b3c758b72c8c82e380857cd7ab1ccab70b25a17f86c0c385
 */
export const JM_RENDER_CONTACT_VERSION = '0.1.0';

function requireFn(value, name) {
  if (typeof value !== 'function') throw new TypeError(name + ' must be a function');
}

export function detectInstancing(gl) {
  if (!gl || typeof gl.getExtension !== 'function') return { kind: 'direct', extension: null };
  if (typeof gl.drawElementsInstanced === 'function' && typeof gl.vertexAttribDivisor === 'function')
    return { kind: 'webgl2', extension: null };
  const ext = gl.getExtension('ANGLE_instanced_arrays');
  return ext && typeof ext.drawElementsInstancedANGLE === 'function'
    ? { kind: 'angle-webgl1', extension: ext }
    : { kind: 'direct', extension: null };
}

/* General 3x3 inverse-transpose: works with nonuniform scale AND shear.
 * Input is 4x4 column-major WebGL matrix; no division by zero is allowed.
 */
export function normalMatrix3(m) {
  if (!m || m.length !== 16) throw new TypeError('Expected 16-element column-major transform');
  const a=m[0],b=m[4],c=m[8], d=m[1],e=m[5],f=m[9], g=m[2],h=m[6],i=m[10];
  const A=e*i-f*h,B=f*g-d*i,C=d*h-e*g;
  const D=c*h-b*i,E=a*i-c*g,F=b*g-a*h;
  const G=b*f-c*e,H=c*d-a*f,I=a*e-b*d;
  const determinant=a*A+b*B+c*C;
  if(!Number.isFinite(determinant) || Math.abs(determinant)<1e-12) return null;
  const n=[A,D,G,B,E,H,C,F,I].map(v=>v/determinant);
  // n is column-major inverse-transpose of the upper-left 3x3.
  return n.every(Number.isFinite) ? new Float32Array(n) : null;
}

/* Inherited game keeps sovereign gameplay and controls. Caller supplies real
 * draw and drawInstanced routines from the original renderer.
 * Consecutive equal opaque submissions may be combined; transparent,
 * order-sensitive, or explicitly volatile items are always drawn in order.
 * No assumptions about per-game meshes, shaders, state or physics.
 */
export function createJMRenderContact({gl, draw, drawInstanced, clock=()=>performance.now(), maxBatch=512}={}) {
  requireFn(draw, 'draw');
  requireFn(clock, 'clock');
  const availability=detectInstancing(gl);
  const canInstance=availability.kind!=='direct' && typeof drawInstanced==='function';
  const limit=Number.isInteger(maxBatch)&&maxBatch>0 ? maxBatch : 512;
  let pending=[], key=null, started=0;
  let stats={frame:0, draws:0, instances:0, direct:0, batched:0, cpuMs:0, mode:canInstance?availability.kind:'direct'};
  const totals={frames:0, draws:0, direct:0, batched:0};
  const staticCache=new Map();
  function direct(item){draw(item,gl);stats.draws++;stats.direct++}
  function flush(){
    if(!pending.length)return;
    if(canInstance && pending.length>1){
      // The donor renderer MUST implement actual per-instance buffer setup.
      drawInstanced(pending.slice(), gl, availability);
      stats.draws++;stats.batched++;stats.instances+=pending.length;
    } else for(const item of pending) direct(item);
    pending=[];key=null;
  }
  function signature(item){
    return String(item.meshId)+'\u001f'+String(item.materialId)+'\u001f'+String(item.shaderId||'')+'\u001f'+String(item.stateId||'');
  }
  function beginFrame(){
    flush();
    stats={frame:stats.frame+1,draws:0,instances:0,direct:0,batched:0,cpuMs:0,mode:canInstance?availability.kind:'direct'};
    started=clock();
  }
  function submit(item){
    if(!item || item.meshId==null || item.materialId==null)
      throw new TypeError('Submission needs meshId and materialId');
    if(item.transparent || item.orderSensitive || item.volatile){
      flush();direct(item);return;
    }
    const k=signature(item);
    if(key!==k || pending.length>=limit)flush();
    key=k;pending.push(item);
  }
  function endFrame(){
    flush();
    stats.cpuMs=Math.max(0,clock()-started);
    totals.frames++;totals.draws+=stats.draws;totals.direct+=stats.direct;totals.batched+=stats.batched;
    return Object.freeze({...stats});
  }
  function compileStatic(id, revision, build, dispose=()=>{}){
    requireFn(build,'build');requireFn(dispose,'dispose');
    const existing=staticCache.get(id);
    if(existing && existing.revision===revision)return existing.value;
    if(existing)existing.dispose(existing.value);
    const value=build();
    staticCache.set(id,{revision,value,dispose});
    return value;
  }
  function invalidateStatic(id){
    const existing=staticCache.get(id);
    if(!existing)return false;
    staticCache.delete(id);existing.dispose(existing.value);return true;
  }
  function dispose(){flush();for(const id of [...staticCache.keys()])invalidateStatic(id)}
  return Object.freeze({
    availability, canInstance, beginFrame, submit, endFrame,
    flush, compileStatic, invalidateStatic, dispose,
    get lastFrame(){return Object.freeze({...stats})},
    get totals(){return Object.freeze({...totals})}
  });
}
