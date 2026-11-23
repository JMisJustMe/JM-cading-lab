/* JM SOFT CONTACT SHADOW v0.1 | renderer organ, WebGL1/2, no external textures.
 * Reusable GPU radial-falloff ground contact. Prototype: hardware visual/thermal QA open.
 */
export const JM_SOFT_CONTACT_SHADOW_VERSION='0.1.0';
const V=`attribute vec2 aCorner;uniform mat4 uVP;uniform vec3 uCenter;uniform vec2 uRadius;varying vec2 vUV;
void main(){vUV=aCorner;vec3 pos=uCenter+vec3(aCorner.x*uRadius.x,0.0,aCorner.y*uRadius.y);gl_Position=uVP*vec4(pos,1.0);}`;
const F=`precision mediump float;varying vec2 vUV;uniform float uOpacity;
void main(){float r=length(vUV);float softness=1.0-smoothstep(0.12,0.99,r);
gl_FragColor=vec4(0.008,0.018,0.032,clamp(softness*uOpacity,0.0,1.0));}`;
export function createJMSoftContactShadow(gl){
 if(!gl||typeof gl.createShader!=='function')throw new TypeError('WebGL context required');
 function shader(type,src){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error('Contact shadow shader failed: '+gl.getShaderInfoLog(sh));return sh}
 const v=shader(gl.VERTEX_SHADER,V),f=shader(gl.FRAGMENT_SHADER,F),program=gl.createProgram();
 gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Contact shadow link failed: '+gl.getProgramInfoLog(program));
 gl.deleteShader?.(v);gl.deleteShader?.(f);
 const a=gl.getAttribLocation(program,'aCorner'),vp=gl.getUniformLocation(program,'uVP'),c=gl.getUniformLocation(program,'uCenter'),r=gl.getUniformLocation(program,'uRadius'),op=gl.getUniformLocation(program,'uOpacity');
 const vertices=gl.createBuffer(),indices=gl.createBuffer();
 gl.bindBuffer(gl.ARRAY_BUFFER,vertices);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,1,1,-1,1]),gl.STATIC_DRAW);
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);
 gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array([0,1,2,0,2,3]),gl.STATIC_DRAW);
 let drawCount=0;
 function draw(scene,subjects){
  if(!Array.isArray(subjects)||!subjects.length)return 0;
  const before=drawCount;
  if(!scene?.vp||scene.vp.length!==16)throw new TypeError('Projection required');
  gl.useProgram(program);
  gl.uniformMatrix4fv(vp,false,new Float32Array(scene.vp));
  gl.bindBuffer(gl.ARRAY_BUFFER,vertices);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);
  if(a>=0){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0)}
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(false);
  gl.disable(gl.CULL_FACE);
  try{
   for(const item of subjects){
    if(!Number.isFinite(item.x)||!Number.isFinite(item.z))continue;
    const radius=Number.isFinite(item.radius)?Math.max(.05,item.radius):.44;
    gl.uniform3fv(c,new Float32Array([item.x,.082,item.z]));
    gl.uniform2fv(r,new Float32Array([radius*1.10,radius*.82]));
    gl.uniform1f(op,Number.isFinite(item.opacity)?Math.min(.7,Math.max(0,item.opacity)):.27);
    gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0);drawCount++;
   }
  }finally{
   gl.depthMask(true);gl.disable(gl.BLEND);gl.enable(gl.CULL_FACE);
   if(scene.restoreProgram)gl.useProgram(scene.restoreProgram);
  }
  return drawCount-before;
 }
 function dispose(){gl.deleteBuffer?.(vertices);gl.deleteBuffer?.(indices);gl.deleteProgram?.(program)}
 return Object.freeze({draw,dispose,version:JM_SOFT_CONTACT_SHADOW_VERSION});
}
