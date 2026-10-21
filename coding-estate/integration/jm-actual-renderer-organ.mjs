// Adapted descendant of the recovered JM_NATIVE_SCENE_DOOR_WEBGL_CP2.html script organ.
// An unused vertex-stage uTime declaration was removed and vertex float precision
// aligned with fragment precision after Android WebView rejected the donor shader.
// Original owner carrier and its hashes below remain preserved as ancestry,
// NOT hashes of this repaired descendant module.
// Original full carrier SHA-256: 6588ff741c580a68f0a484f790fb813e5933be8cbb2f120db7786acacd13ed4b
// Renderer script SHA-256: ba2e1339ac686ff4c93621985f737fca12b8bb1b44fd3ead15472527adfdcbb0
export function installJMActualRenderer(){
/* JM Actual Engine — scene-generation 3D render organ.
   Directly inherits the matrix and primitive mesh implementations from the exact
   JM Actual Engine v12.2 Dual Render Rejoin source.  The multi-light/fog/wet surface
   shader, world builder and gameplay scene are an additive authoring descendant.
   No Three.js, Babylon, remote assets, or non-JM game engine. */
(()=>{'use strict';
function mat4Identity(){return [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}
function mat4Multiply(a,b){
  const out=new Array(16).fill(0);
  for(let c=0;c<4;c++)for(let r=0;r<4;r++)
    out[c*4+r]=a[0*4+r]*b[c*4+0]+a[1*4+r]*b[c*4+1]+a[2*4+r]*b[c*4+2]+a[3*4+r]*b[c*4+3];
  return out;
}
function mat4Perspective(fovy,aspect,near,far){
  const f=1/Math.tan(fovy/2),nf=1/(near-far);
  return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,(2*far*near)*nf,0];
}
function vec3Norm(v){
  const n=Math.hypot(v[0],v[1],v[2])||1;
  return [v[0]/n,v[1]/n,v[2]/n];
}
function vec3Sub(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]}
function vec3Cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function vec3Dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
function mat4LookAt(eye,target,up=[0,1,0]){
  const z=vec3Norm(vec3Sub(eye,target));
  const x=vec3Norm(vec3Cross(up,z));
  const y=vec3Cross(z,x);
  return [
    x[0],y[0],z[0],0,
    x[1],y[1],z[1],0,
    x[2],y[2],z[2],0,
    -vec3Dot(x,eye),-vec3Dot(y,eye),-vec3Dot(z,eye),1
  ];
}
function mat4Translate(m,v){
  const t=[1,0,0,0,0,1,0,0,0,0,1,0,v[0],v[1],v[2],1];
  return mat4Multiply(m,t);
}
function mat4Scale(m,v){
  const q=[v[0],0,0,0,0,v[1],0,0,0,0,v[2],0,0,0,0,1];
  return mat4Multiply(m,q);
}
function mat4RotX(m,a){
  const c=Math.cos(a),s=Math.sin(a);
  return mat4Multiply(m,[1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1]);
}
function mat4RotY(m,a){
  const c=Math.cos(a),s=Math.sin(a);
  return mat4Multiply(m,[c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]);
}
function mat4RotZ(m,a){
  const c=Math.cos(a),s=Math.sin(a);
  return mat4Multiply(m,[c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1]);
}
function transformPoint(m,p){
  const x=p[0],y=p[1],z=p[2],w=1;
  return [
    m[0]*x+m[4]*y+m[8]*z+m[12]*w,
    m[1]*x+m[5]*y+m[9]*z+m[13]*w,
    m[2]*x+m[6]*y+m[10]*z+m[14]*w,
    m[3]*x+m[7]*y+m[11]*z+m[15]*w
  ];
}
function modelMatrix(o){
  let m=mat4Identity();
  m=mat4Translate(m,o.pos);
  m=mat4RotX(m,o.rot[0]);
  m=mat4RotY(m,o.rot[1]);
  m=mat4RotZ(m,o.rot[2]);
  m=mat4Scale(m,o.scale);
  return m;
}
function cameraEye(){
  const c=R.camera;
  const cp=Math.cos(c.pitch),sp=Math.sin(c.pitch),cy=Math.cos(c.yaw),sy=Math.sin(c.yaw);
  return [c.distance*cp*sy,c.distance*sp,c.distance*cp*cy];
}

function pushTri(vertices,normals,a,b,c,n){
  for(const p of [a,b,c]){vertices.push(...p);normals.push(...n)}
}
function meshCube(){
  const p=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
  const faces=[
    [0,1,2,3,[0,0,-1]],[4,7,6,5,[0,0,1]],[0,4,5,1,[0,-1,0]],
    [3,2,6,7,[0,1,0]],[1,5,6,2,[1,0,0]],[0,3,7,4,[-1,0,0]]
  ];
  const v=[],n=[];
  for(const [a,b,c,d,no] of faces){
    pushTri(v,n,p[a],p[b],p[c],no);pushTri(v,n,p[a],p[c],p[d],no);
  }
  return {v,n};
}
function meshOcta(){
  const top=[0,1.25,0],bot=[0,-1.25,0];
  const ring=[[1,0,0],[0,0,1],[-1,0,0],[0,0,-1]];
  const v=[],n=[];
  for(let i=0;i<4;i++){
    const a=ring[i],b=ring[(i+1)%4];
    const nt=vec3Norm(vec3Cross(vec3Sub(a,top),vec3Sub(b,top)));
    const nb=vec3Norm(vec3Cross(vec3Sub(b,bot),vec3Sub(a,bot)));
    pushTri(v,n,top,a,b,nt);pushTri(v,n,bot,b,a,nb);
  }
  return {v,n};
}
function meshHexPrism(){
  const v=[],n=[],topY=.92,botY=-.92,N=6;
  const ring=[];
  for(let i=0;i<N;i++){
    const a=i/N*Math.PI*2;
    ring.push([Math.cos(a),0,Math.sin(a)]);
  }
  for(let i=0;i<N;i++){
    const a=ring[i],b=ring[(i+1)%N];
    pushTri(v,n,[0,topY,0],[a[0],topY,a[2]],[b[0],topY,b[2]],[0,1,0]);
    pushTri(v,n,[0,botY,0],[b[0],botY,b[2]],[a[0],botY,a[2]],[0,-1,0]);
    const no=vec3Norm([a[0]+b[0],0,a[2]+b[2]]);
    pushTri(v,n,[a[0],botY,a[2]],[b[0],botY,b[2]],[b[0],topY,b[2]],no);
    pushTri(v,n,[a[0],botY,a[2]],[b[0],topY,b[2]],[a[0],topY,a[2]],no);
  }
  return {v,n};
}

const col = (hex)=>{if(Array.isArray(hex))return hex;hex=String(hex||'#ffffff').replace('#','');if(hex.length===3)hex=hex.split('').map(c=>c+c).join('');return [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255)};
const ob=(mesh,x,y,z,sx,sy,sz,c,em=0,rotY=0)=>({mesh,pos:[x,y,z],scale:[sx,sy,sz],rot:[0,rotY,0],color:col(c),em});
const C={sea:'#10283c',navy:'#0c2034',floor:'#15374a',floor2:'#1b4353',tile:'#1a4053',edge:'#4cebd7',gold:'#f3c87d',copper:'#b4665d',pink:'#ff7995',blue:'#69c9f4',cyan:'#77fff2',leaf:'#4be6b0',violet:'#9b92ff',steel:'#43617c',panel:'#274a60'};
function ringMesh(N=28){const v=[],n=[];for(let i=0;i<N;i++){const a=i/N*Math.PI*2,b=(i+1)/N*Math.PI*2; const f=(t,r)=>[Math.cos(t)*r,0,Math.sin(t)*r];pushTri(v,n,f(a,.91),f(b,.91),f(a,1.0),[0,1,0]);pushTri(v,n,f(a,1),f(b,.91),f(b,1),[0,1,0]);}return {v,n}}
function cylinder(N=14){const v=[],n=[];for(let i=0;i<N;i++){const a=i/N*Math.PI*2,b=(i+1)/N*Math.PI*2,ac=Math.cos(a),as=Math.sin(a),bc=Math.cos(b),bs=Math.sin(b);pushTri(v,n,[ac,-1,as],[bc,-1,bs],[ac,1,as],[ac,0,as]);pushTri(v,n,[ac,1,as],[bc,-1,bs],[bc,1,bs],[bc,0,bs]);pushTri(v,n,[0,1,0],[ac,1,as],[bc,1,bs],[0,1,0]);pushTri(v,n,[0,-1,0],[bc,-1,bs],[ac,-1,as],[0,-1,0])}return {v,n}}
function sphere(N=14,M=9){const v=[],n=[];for(let j=0;j<M;j++){const t0=j/M*Math.PI,t1=(j+1)/M*Math.PI;for(let i=0;i<N;i++){const f0=i/N*Math.PI*2,f1=(i+1)/N*Math.PI*2;const p=(t,f)=>[Math.sin(t)*Math.cos(f),Math.cos(t),Math.sin(t)*Math.sin(f)];const a=p(t0,f0),b=p(t1,f0),c=p(t0,f1),d=p(t1,f1);pushTri(v,n,a,b,c,a);pushTri(v,n,c,b,d,d)}}return {v,n}}
function makeWorld(){const list=[];const add=(...v)=>list.push(ob(...v));
 // Original rooftop donor preserved as a dormant reference; generated scenes replace this via staticScene. Hero space is 30 x 30 units; geometry all generated by JM renderer.
 add('cube',0,-.55,0,15.6,.6,15.6,'#18374b');add('cube',0,-.08,0,15.05,.08,15.05,'#28475a');
 for(let i=-4;i<=4;i++){for(let j=-4;j<=4;j++){if((i+j)%3===0)add('cube',i*3.05,-.005,j*3.05,1.48,.02,1.48,i%2?'#244e5f':'#214452');}}
 for(let i=-14;i<=14;i+=3.5){add('cube',i,.024,0,.026,.025,14.5,'#397187',.1);add('cube',0,.025,i,14.5,.025,.026,'#397187',.1)}
 for(const sg of [-1,1]){add('cube',sg*15.7,.52,0,.28,.52,15.65,'#34516b');add('cube',sg*15.65,1.12,0,.13,.08,15.65,'#55f2e3',.8); add('cube',0,.52,sg*15.65,15.65,.52,.28,'#34516b');add('cube',0,1.12,sg*15.65,15.65,.08,.13,'#55f2e3',.8);}
 for(let v=-15;v<=15;v+=5){for(const sg of [-1,1]){add('cube',v,.72,sg*15.55,.18,.73,.18,'#5a8491');add('cube',sg*15.55,.72,v,.18,.73,.18,'#5a8491')}}
 for(const [x,z] of [[-13,-12],[13,-12],[-13,12],[13,12]]){add('cube',x,.35,z,1.2,.4,1.2,'#1d6479');add('cylinder',x,.85,z,.48,.26,.48,'#4cfbe4',.6);add('sphere',x,1.28,z,.32,.35,.32,'#91fff4',1.2)}
 // City depth: buildings outside the platform, tinted atmospheric, unique configurations.
 let seed=41432;function rng(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
 for(let i=0;i<44;i++){const a=i/44*Math.PI*2+(rng()-.5)*.22,r=29+rng()*34,x=Math.sin(a)*r,z=Math.cos(a)*r,h=6+rng()*20,w=2+rng()*3;let tint=['#1c344d','#254159','#283952','#1d425a','#2c3a53'][i%5];
 add('cube',x,h/2-9,z,w,h/2,w,tint);add('cube',x,h-8.95,z,w*1.05,.12,w*1.05,'#385872');
 if(i%2===0){for(let k=0;k<3;k++)add('cube',x-w*.4+ k*w*.4,h*.4+k*.9-7.7,z+w+.02,.07,.21,.02,i%3===0?'#58a5a9':'#d49a76',.28)}
 if(i%5===0){add('cube',x,h-8,z,w*.05,.9,w*.05,'#6e9eae');add('sphere',x,h-7.1,z,.24,.24,.24,'#ffcd83',.8)}
 }
 // Roof vents and water reservoir pieces.
 for(const [x,z] of [[-11,7],[11,9],[-12,-7],[12,-12]]){add('cube',x,.3,z,1.2,.27,.8,'#406079');add('cube',x,.58,z,.93,.06,.53,'#4d889c');for(let k=-1;k<=1;k++)add('cube',x+k*.35,.66,z,.025,.02,.38,'#90bbc0')}
 // Lush hydroponic planters, glowing rooftop lanterns and rain collectors.
 for(const [x,z] of [[-11,1],[11,3],[-8,12],[8,11],[-11,-10],[11,-9]]){
   add('cube',x,.30,z,1.35,.30,.95,'#325871');add('cube',x,.57,z,1.27,.06,.84,'#6dc4ad',.22);
   for(let k=0;k<3;k++){const bx=x+(k-1)*.66;add('cylinder',bx,.88,z,.11,.38,.11,'#599f81');add('octa',bx,1.47,z,.42,.60,.40,k%2?'#4bbb8e':'#72df9c',.12)}
 }
 for(const [x,z] of [[-4,-13],[4,-13],[-4,13],[4,13]]){
   add('cube',x,.40,z,.58,.4,.58,'#33516a');add('cylinder',x,1.65,z,.07,.99,.07,'#62939b');add('sphere',x,2.70,z,.27,.31,.27,'#fed19b',.85)
 }
 // Three water arteries become visibly wet/illuminated, ending at objectives.
 for(const [a,b] of [[[-9,-7],[8,-4]],[[8,-4],[0,9]],[[-9,-7],[0,9]]]){let dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),ang=Math.atan2(dx,dz);add('cube',(a[0]+b[0])/2,.028,(a[1]+b[1])/2,.085,.025,len/2,'#255b69',.15,ang)}
 return list;
}
class JMWorldRenderer3D {
 constructor(canvas){this.canvas=canvas;this.gl=null;this.program=null;this.loc=null;this.meshes={};this.static=[];this.lastScene=null;this.drawCalls=0;this.error=null;this.w=1;this.h=1;
  try{const gl=canvas.getContext('webgl',{alpha:false,antialias:true,depth:true,powerPreference:'high-performance'})||canvas.getContext('experimental-webgl');if(!gl)throw Error('WEBGL_UNAVAILABLE');this.gl=gl;this.init();}catch(e){this.error=String(e.message||e)} }
 init(){const gl=this.gl;
 const vs=`precision mediump float;attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aColor;attribute float aGlow;uniform float uBatch; uniform mat4 uMVP;uniform mat4 uModel;uniform vec3 uColor;uniform float uGlow;varying vec3 vColor;varying vec3 vWorld;varying vec3 vNormal;varying float vGlow;
 void main(){ vec4 wp=uModel*vec4(aPosition,1.);vWorld=wp.xyz;vNormal=normalize(mat3(uModel)*aNormal);vColor=mix(uColor,aColor,uBatch);vGlow=mix(uGlow,aGlow,uBatch);gl_Position=uMVP*vec4(aPosition,1.);}`;
 const fs=`precision mediump float;varying vec3 vColor;varying vec3 vWorld;varying vec3 vNormal;varying float vGlow;uniform vec3 uEye;uniform float uTime;
 void main(){vec3 n=normalize(vNormal);vec3 l=normalize(vec3(-.35,1.0,-.52));float diffuse=max(dot(n,l),0.0);vec3 eye=normalize(uEye-vWorld);float spec=pow(max(dot(reflect(-l,n),eye),0.0),22.0);float rim=pow(1.0-max(dot(n,eye),0.0),2.0);float shimmer=.5+.5*sin(vWorld.x*3.9+vWorld.z*4.6+uTime*2.1);vec3 light=vColor*(.52+diffuse*.80) + vec3(.62,.49,.42)*spec*.42+vec3(.19,.42,.57)*rim*.48;light+=vColor*vGlow*(.75+shimmer*.34);float dist=length(uEye-vWorld);float fog=smoothstep(35.0,95.0,dist)*.63;light=mix(light,vec3(.07,.16,.24),fog);light=1.-exp(-light*1.33);gl_FragColor=vec4(pow(light,vec3(.89)),1.);}`;
 const mk=(t,s)=>{const sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error('SHADER '+gl.getShaderInfoLog(sh));return sh};const p=gl.createProgram();gl.attachShader(p,mk(gl.VERTEX_SHADER,vs));gl.attachShader(p,mk(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('LINK '+gl.getProgramInfoLog(p));this.program=p;
 this.loc={position:gl.getAttribLocation(p,'aPosition'),normal:gl.getAttribLocation(p,'aNormal'),aColor:gl.getAttribLocation(p,'aColor'),aGlow:gl.getAttribLocation(p,'aGlow'),uBatch:gl.getUniformLocation(p,'uBatch'),mvp:gl.getUniformLocation(p,'uMVP'),model:gl.getUniformLocation(p,'uModel'),color:gl.getUniformLocation(p,'uColor'),glow:gl.getUniformLocation(p,'uGlow'),eye:gl.getUniformLocation(p,'uEye'),time:gl.getUniformLocation(p,'uTime')};
 for(const [name,shape] of Object.entries({cube:meshCube(),octa:meshOcta(),hex:meshHexPrism(),sphere:sphere(),cylinder:cylinder(),ring:ringMesh()})){const m={v:gl.createBuffer(),n:gl.createBuffer(),count:shape.v.length/3};gl.bindBuffer(gl.ARRAY_BUFFER,m.v);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(shape.v),gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,m.n);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(shape.n),gl.STATIC_DRAW);m.data=shape;this.meshes[name]=m;}gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);this.error=null;this.buildStaticBatch();this.setupSky();
 }
 buildStaticBatch(){
 const gl=this.gl,v=[],n=[],c=[],g=[];for(const item of this.static){const mesh=this.meshes[item.mesh].data,mat=modelMatrix(item);for(let i=0;i<mesh.v.length;i+=3){const p=transformPoint(mat,[mesh.v[i],mesh.v[i+1],mesh.v[i+2]]);v.push(p[0],p[1],p[2]);const a=mesh.n.slice(i,i+3);const nn=vec3Norm([mat[0]*a[0]+mat[4]*a[1]+mat[8]*a[2],mat[1]*a[0]+mat[5]*a[1]+mat[9]*a[2],mat[2]*a[0]+mat[6]*a[1]+mat[10]*a[2]]);n.push(...nn);c.push(...item.color);g.push(item.em||0)}}
 this.batch={count:v.length/3};for(const [name,data] of Object.entries({v,n,c,g})){const buff=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buff);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);this.batch[name]=buff}
 }

 setupSky(){const gl=this.gl;const vert=`attribute vec2 aPosition;varying vec2 vUV;void main(){vUV=(aPosition+1.0)*.5;gl_Position=vec4(aPosition,0.,1.);}`;
 const frag=`precision mediump float;varying vec2 vUV;uniform float uTime;
 void main(){float y=vUV.y;vec3 low=vec3(.18,.28,.34),mid=vec3(.088,.16,.27),top=vec3(.015,.048,.12);vec3 rgb=mix(low,mid,smoothstep(.2,.68,y));rgb=mix(rgb,top,smoothstep(.55,1.,y));float sun=exp(-pow(distance(vUV,vec2(.82,.53))/.16,2.)*3.4);float horizon=pow(1.-abs(y-.29),13.);rgb+=vec3(.46,.27,.13)*sun*.85+vec3(.20,.19,.15)*horizon*.36;float haze=sin(vUV.x*37.+uTime*.02)*sin(y*22.)*.004;rgb+=haze;gl_FragColor=vec4(rgb,1.);}`;
 const compile=(type,text)=>{const sh=gl.createShader(type);gl.shaderSource(sh,text);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error('SKY_SHADER '+gl.getShaderInfoLog(sh));return sh};const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vert));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,frag));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('SKY_LINK '+gl.getProgramInfoLog(program));const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,1,1,-1,-1,1,1,-1,1]),gl.STATIC_DRAW);this.sky={program,buffer:b,position:gl.getAttribLocation(program,'aPosition'),time:gl.getUniformLocation(program,'uTime')};
 }
 drawSky(time){const gl=this.gl,sky=this.sky;gl.disable(gl.DEPTH_TEST);gl.useProgram(sky.program);gl.bindBuffer(gl.ARRAY_BUFFER,sky.buffer);gl.enableVertexAttribArray(sky.position);gl.vertexAttribPointer(sky.position,2,gl.FLOAT,false,0,0);gl.uniform1f(sky.time,time);gl.drawArrays(gl.TRIANGLES,0,6);gl.disableVertexAttribArray(sky.position);gl.enable(gl.DEPTH_TEST);}
 drawBatch(vp){const gl=this.gl,b=this.batch,l=this.loc;gl.uniform1f(l.uBatch,1);gl.uniformMatrix4fv(l.mvp,false,new Float32Array(vp));gl.uniformMatrix4fv(l.model,false,new Float32Array(mat4Identity()));
 for(const [buffer,loc,size] of [[b.v,l.position,3],[b.n,l.normal,3],[b.c,l.aColor,3],[b.g,l.aGlow,1]]){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0)}gl.drawArrays(gl.TRIANGLES,0,b.count);this.drawCalls++;gl.disableVertexAttribArray(l.aColor);gl.disableVertexAttribArray(l.aGlow);gl.vertexAttrib3f(l.aColor,0,0,0);gl.vertexAttrib1f(l.aGlow,0);gl.uniform1f(l.uBatch,0);
 }
 staticScene(models){if(!this.gl||this.error)throw Error('JM_SCENE_RENDERER_NOT_READY');if(!Array.isArray(models)||models.length<1)throw Error('JM_SCENE_NO_GEOMETRY');if(this.batch){for(const k of ['v','n','c','g'])if(this.batch[k])this.gl.deleteBuffer(this.batch[k]);}this.static=models.slice();this.buildStaticBatch();return {objects:this.static.length,triangles:this.batch.count/3};}
 resize(){const dpr=Math.min(window.devicePixelRatio||1,1.6);const width=Math.max(1,Math.round(this.canvas.clientWidth*dpr)),height=Math.max(1,Math.round(this.canvas.clientHeight*dpr));if(this.w!==width||this.h!==height){this.w=width;this.h=height;this.canvas.width=width;this.canvas.height=height;this.gl.viewport(0,0,width,height)} }
 draw(model,vp,eye,time){const gl=this.gl,m=this.meshes[model.mesh]||this.meshes.cube;if(!m)return; const mat=modelMatrix(model),mvp=mat4Multiply(vp,mat);gl.bindBuffer(gl.ARRAY_BUFFER,m.v);gl.vertexAttribPointer(this.loc.position,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(this.loc.position);gl.bindBuffer(gl.ARRAY_BUFFER,m.n);gl.vertexAttribPointer(this.loc.normal,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(this.loc.normal);gl.uniformMatrix4fv(this.loc.mvp,false,new Float32Array(mvp));gl.uniformMatrix4fv(this.loc.model,false,new Float32Array(mat));gl.uniform3fv(this.loc.color,new Float32Array(model.color));gl.uniform1f(this.loc.glow,model.em||0);gl.drawArrays(gl.TRIANGLES,0,m.count);this.drawCalls++ }
 frame(game,scene,time){if(!this.gl||this.error)return;this.resize();const gl=this.gl;
 // Behind-and-above perspective: genuine JM WebGL 3D, not a 2D canvas projection.
 const p=game.player;this.focus=this.focus||[p.x,1,p.z];this.focus[0]+=(p.x-this.focus[0])*.10;this.focus[2]+=(p.z-this.focus[2])*.10;
 const drift=(game.camera==='ORBIT'?Math.sin(time*.16)*5.5:0);const cam=[this.focus[0]+12+drift,16.5,this.focus[2]+26];const target=[this.focus[0],1.5,this.focus[2]];const vp=mat4Multiply(mat4Perspective(60*Math.PI/180,this.w/this.h,.15,185),mat4LookAt(cam,target));this.vp=vp;this.cam=cam;this.target=target;
 gl.clearColor(.015,.047,.081,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);this.drawSky(time);gl.useProgram(this.program);gl.uniform3fv(this.loc.eye,new Float32Array(cam));gl.uniform1f(this.loc.time,time);this.drawCalls=0;
 this.drawBatch(vp);
 const dynamic=game.sceneObjects(scene,time);
 for(const obj of dynamic)this.draw(obj,vp,cam,time);
 this.lastScene={source:scene?.scene_hash||null,drawCalls:this.drawCalls,webgl:true,actorCount:scene?.objects?.length||0,trianglesApprox:dynamic.length};
 }
 pickGround(clientX,clientY){
  // Invert this scene's perspective camera ray onto the GameForge floor.
  // This only selects a *requested destination*. GameForge retains movement,
  // collision, door contact, progression and the actual player position.
  if(!this.cam||!this.target||!this.w||!this.h)return null;
  const box=this.canvas.getBoundingClientRect();
  if(box.width<=0||box.height<=0)return null;
  const nx=2*(clientX-box.left)/box.width-1;
  const ny=1-2*(clientY-box.top)/box.height;
  if(!Number.isFinite(nx)||!Number.isFinite(ny)||Math.abs(nx)>1||Math.abs(ny)>1)return null;
  const eye=this.cam,forward=vec3Norm(vec3Sub(this.target,eye));
  const right=vec3Norm(vec3Cross(forward,[0,1,0]));
  const up=vec3Norm(vec3Cross(right,forward));
  const spread=Math.tan(Math.PI/6),aspect=this.w/this.h;
  const ray=vec3Norm([
    forward[0]+right[0]*nx*spread*aspect+up[0]*ny*spread,
    forward[1]+right[1]*nx*spread*aspect+up[1]*ny*spread,
    forward[2]+right[2]*nx*spread*aspect+up[2]*ny*spread
  ]);
  if(ray[1]>=-.0001)return null;
  const distance=-eye[1]/ray[1];
  if(!Number.isFinite(distance)||distance<=0)return null;
  const hit={x:eye[0]+ray[0]*distance,z:eye[2]+ray[2]*distance};
  if(!Number.isFinite(hit.x)||!Number.isFinite(hit.z))return null;
  return hit;
 }
 project(point){if(!this.vp)return null;const q=transformPoint(this.vp,point);if(q[3]<=.01)return null;return{x:(q[0]/q[3]*.5+.5)*this.canvas.clientWidth,y:(-.5*q[1]/q[3]+.5)*this.canvas.clientHeight,visible:Math.abs(q[0]/q[3])<1.25&&Math.abs(q[1]/q[3])<1.25}}
 proof(){return{schema:'jm.actual-engine.3d-rooftop-stage/2.0',renderPath:'JM Actual Engine-derived portable scene generation: v12.2 matrices/meshes + JM WebGL lit stage',webgl:!!this.gl&&!this.error,drawCalls:this.drawCalls,sceneHash:this.lastScene?.source||null,error:this.error,externals:0}}
}
window.JM_RAIN_RENDER=Object.freeze({Renderer:JMWorldRenderer3D,object:ob,colors:C,matrixLineage:'Recovered JM Actual Engine v12.2 WebGL 3D / Dual Render Rejoin',renderMode:'WEBGL_3D'});
})();

return window.JM_RAIN_RENDER;
}
