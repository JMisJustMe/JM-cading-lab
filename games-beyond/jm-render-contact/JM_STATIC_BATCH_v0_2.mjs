/* JM ECOSTATE STATIC BATCH ENGINE v0.2
 * Authorial purpose: live GPU static-geometry batching for JM WebGL games.
 * Clean implementation of principles documented in JM ONE ON ONE CP2 receipt.
 * NOT the exact unread Astra CP2 source file. No production/device claim.
 */
export const JM_STATIC_BATCH_VERSION='0.2.0';
const VERT_STRIDE=14;
const MAX_VERTICES=65535; // WebGL1-compatible unsigned short indices.
const VS=`attribute vec3 aPos,aNor;attribute vec4 aColor;attribute vec3 aRim;attribute float aGlow;
uniform mat4 uVP;varying vec3 vNor,vWorld,vRim;varying vec4 vColor;varying float vGlow;
void main(){vWorld=aPos;vNor=aNor;vRim=aRim;vColor=aColor;vGlow=aGlow;gl_Position=uVP*vec4(aPos,1.0);}`;
const FS=`precision mediump float;varying vec3 vNor,vWorld,vRim;varying vec4 vColor;varying float vGlow;
uniform vec3 uLight,uCam;void main(){vec3 n=normalize(vNor);
float d=max(dot(n,normalize(uLight)),0.0);
float rim=pow(1.0-max(dot(n,normalize(uCam-vWorld)),0.0),2.1);
vec3 c=vColor.rgb*(.24+d*.76)+vRim*rim*(.28+vGlow);
gl_FragColor=vec4(c,vColor.a);}`;
function safeShader(gl,type,src){
 const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);
 if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error('JM shader compilation: '+gl.getShaderInfoLog(sh));
 return sh;
}
export function createJMStaticBatcher(gl,{normalMatrix}={}){
 if(!gl||typeof gl.createBuffer!=='function')throw new TypeError('WebGL context required');
 if(typeof normalMatrix!=='function')throw new TypeError('Inverse-transpose normalMatrix provider required');
 let program=null,attributes=null,uniforms=null,batches=[],stats={compileCount:0,batchCount:0,sourceCalls:0,storedVertices:0,indices:0,draws:0};
 function setup(){
  if(program)return;
  const vert=safeShader(gl,gl.VERTEX_SHADER,VS),frag=safeShader(gl,gl.FRAGMENT_SHADER,FS);
  const prog=gl.createProgram();gl.attachShader(prog,vert);gl.attachShader(prog,frag);gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error('JM static program link: '+gl.getProgramInfoLog(prog));
  if(gl.deleteShader){gl.deleteShader(vert);gl.deleteShader(frag)}
  program=prog;
  attributes=['aPos','aNor','aColor','aRim','aGlow'].map(name=>gl.getAttribLocation(prog,name));
  uniforms=Object.fromEntries(['uVP','uLight','uCam'].map(name=>[name,gl.getUniformLocation(prog,name)]));
 }
 function release(){
  for(const batch of batches){gl.deleteBuffer?.(batch.vertices);gl.deleteBuffer?.(batch.indices)}
  batches=[];stats.batchCount=stats.storedVertices=stats.indices=0;
 }
 function build(calls){
  if(!Array.isArray(calls))throw new TypeError('Expected array of source draw records');
  setup();
  const next=[];let vertexList=[],indexList=[],count=0,totalVertices=0,totalIndices=0;
  function commit(){
   if(!indexList.length)return;
   const v=gl.createBuffer(),i=gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER,v);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertexList),gl.STATIC_DRAW);
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,i);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indexList),gl.STATIC_DRAW);
   next.push({vertices:v,indices:i,count:indexList.length});
   vertexList=[];indexList=[];count=0;
  }
  try{
   for(const record of calls){
    const {mesh,mat,color,rim,glow}=record, p=mesh?.cpuP,n=mesh?.cpuN,idx=mesh?.cpuI;
    if(!p||!n||!idx||p.length!==n.length||p.length%3!==0||!mat||mat.length!==16)
     throw new Error('Source mesh CPU geometry and 4x4 matrix required');
    if(!color||color.length!==4||!rim||rim.length!==3)throw new Error('Colour/rim attributes invalid');
    const normal=normalMatrix(mat);
    if(!normal)throw new Error('Static transform must be invertible');
    const vertices=p.length/3;
    if(vertices>MAX_VERTICES)throw new Error('Single mesh exceeds WebGL1 uint16 range');
    if(count+vertices>MAX_VERTICES)commit();
    for(let k=0;k<p.length;k+=3){
     const x=p[k],y=p[k+1],z=p[k+2],a=n[k],b=n[k+1],c=n[k+2];
     const wx=mat[0]*x+mat[4]*y+mat[8]*z+mat[12],wy=mat[1]*x+mat[5]*y+mat[9]*z+mat[13],wz=mat[2]*x+mat[6]*y+mat[10]*z+mat[14];
     let nx=normal[0]*a+normal[3]*b+normal[6]*c,ny=normal[1]*a+normal[4]*b+normal[7]*c,nz=normal[2]*a+normal[5]*b+normal[8]*c;
     const inv=1/(Math.hypot(nx,ny,nz)||1);nx*=inv;ny*=inv;nz*=inv;
     vertexList.push(wx,wy,wz,nx,ny,nz,color[0],color[1],color[2],color[3],rim[0],rim[1],rim[2],glow);
    }
    for(const i of idx){if(!Number.isInteger(i)||i<0||i>=vertices)throw Error('Index out of source range');indexList.push(count+i)}
    count+=vertices;totalVertices+=vertices;totalIndices+=idx.length;
   }
   commit();
  }catch(e){for(const batch of next){gl.deleteBuffer?.(batch.vertices);gl.deleteBuffer?.(batch.indices)}throw e}
  release();batches=next;stats={compileCount:stats.compileCount+1,batchCount:batches.length,sourceCalls:calls.length,storedVertices:totalVertices,indices:totalIndices,draws:0};
  return Object.freeze({...stats});
 }
 function draw({vp,light,cam,restoreProgram}){
  if(!program||!batches.length)return 0;
  if(vp?.length!==16||light?.length!==3||cam?.length!==3)throw new TypeError('Invalid scene uniforms');
  gl.useProgram(program);
  gl.uniformMatrix4fv(uniforms.uVP,false,new Float32Array(vp));
  gl.uniform3fv(uniforms.uLight,new Float32Array(light));
  gl.uniform3fv(uniforms.uCam,new Float32Array(cam));
  const widths=[3,3,4,3,1],offsets=[0,12,24,40,52],stride=VERT_STRIDE*4;
  for(const batch of batches){
   gl.bindBuffer(gl.ARRAY_BUFFER,batch.vertices);
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,batch.indices);
   for(let a=0;a<attributes.length;a++){
    if(attributes[a]<0)continue;
    gl.enableVertexAttribArray(attributes[a]);
    gl.vertexAttribPointer(attributes[a],widths[a],gl.FLOAT,false,stride,offsets[a]);
   }
   gl.drawElements(gl.TRIANGLES,batch.count,gl.UNSIGNED_SHORT,0);stats.draws++;
  }
  if(restoreProgram)gl.useProgram(restoreProgram);
  return batches.length;
 }
 function dispose(){release();if(program)gl.deleteProgram?.(program);program=null}
 return Object.freeze({build,draw,dispose,get stats(){return Object.freeze({...stats})}});
}
