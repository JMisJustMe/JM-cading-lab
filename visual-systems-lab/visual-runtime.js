(()=>{
'use strict';
const DPR=()=>Math.min(2,window.devicePixelRatio||1);
function fit(canvas){const r=canvas.getBoundingClientRect(),d=DPR();const w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}const ctx=canvas.getContext('2d');ctx.setTransform(d,0,0,d,0,0);return{ctx,w:r.width,h:r.height,d}}
const gold='#e1ba68',gold2='#f3d99a',ink='#eef3ef',muted='#6f8997';

class AmbientField{
  constructor(canvas){this.canvas=canvas;this.points=[];this.running=true;this.t=0;this.resize=()=>this.seed();window.addEventListener('resize',this.resize);this.seed();this.loop()}
  seed(){const {w,h}=fit(this.canvas);this.points=Array.from({length:Math.max(22,Math.floor(w*h/26000))},()=>({x:Math.random()*w,y:Math.random()*h,r:.5+Math.random()*1.6,v:.1+Math.random()*.35,p:Math.random()*6.28}))}
  loop(){if(!this.running)return;const {ctx,w,h}=fit(this.canvas);ctx.clearRect(0,0,w,h);this.t+=.006;const g=ctx.createRadialGradient(w*.72,h*.18,0,w*.72,h*.18,Math.max(w,h)*.75);g.addColorStop(0,'rgba(201,145,47,.13)');g.addColorStop(.35,'rgba(27,79,104,.08)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.strokeStyle='rgba(216,173,89,.08)';ctx.lineWidth=1;for(let i=0;i<6;i++){ctx.beginPath();ctx.arc(w*.76,h*.2,80+i*58+Math.sin(this.t*4+i)*5,0,Math.PI*2);ctx.stroke()}this.points.forEach(p=>{p.y-=p.v;if(p.y<-5)p.y=h+5;ctx.fillStyle=`rgba(233,207,150,${.16+.12*Math.sin(this.t*4+p.p)})`;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,6.283);ctx.fill()});requestAnimationFrame(()=>this.loop())}
  setRunning(v){this.running=v;if(v)this.loop()}
}

class IllusionEngine{
  constructor(canvas){this.canvas=canvas;this.type='muller';this.angle=42;this.pressure=64;this.measure=false;this.phase=0;this.running=true;this.types=['muller','rubin','drift','checker'];this.loop()}
  setType(type){this.type=type;this.phase=0;this.draw()}
  next(){const i=(this.types.indexOf(this.type)+1)%this.types.length;this.setType(this.types[i]);return this.type}
  setAngle(v){this.angle=+v;this.draw()}
  setPressure(v){this.pressure=+v;this.draw()}
  setMeasure(v){this.measure=!!v;this.draw()}
  loop(){if(!this.running)return;this.phase+=.012*(.35+this.pressure/85);this.draw();requestAnimationFrame(()=>this.loop())}
  draw(){const {ctx,w,h}=fit(this.canvas);ctx.clearRect(0,0,w,h);const bg=ctx.createRadialGradient(w*.5,h*.5,0,w*.5,h*.5,Math.max(w,h)*.72);bg.addColorStop(0,'#102434');bg.addColorStop(1,'#02070b');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);if(this.type==='muller')this.muller(ctx,w,h);if(this.type==='rubin')this.rubin(ctx,w,h);if(this.type==='drift')this.drift(ctx,w,h);if(this.type==='checker')this.checker(ctx,w,h)}
  muller(ctx,w,h){const len=Math.min(w*.52,300),cx=w*.55,y1=h*.38,y2=h*.68,fin=Math.min(58,len*.22),a=this.angle*Math.PI/180;ctx.lineWidth=Math.max(3,w/250);ctx.lineCap='round';ctx.strokeStyle=gold2;[[y1,1],[y2,-1]].forEach(([y,dir])=>{ctx.beginPath();ctx.moveTo(cx-len/2,y);ctx.lineTo(cx+len/2,y);ctx.stroke();for(const side of[-1,1]){const x=cx+side*len/2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-side*dir*Math.cos(a)*fin,y-Math.sin(a)*fin);ctx.moveTo(x,y);ctx.lineTo(x-side*dir*Math.cos(a)*fin,y+Math.sin(a)*fin);ctx.stroke()}});ctx.fillStyle='rgba(225,186,104,.13)';ctx.beginPath();ctx.ellipse(cx,y1,len*.68,24+this.pressure*.08,0,0,6.283);ctx.fill();ctx.beginPath();ctx.ellipse(cx,y2,len*.68,24+this.pressure*.08,0,0,6.283);ctx.fill();if(this.measure){ctx.strokeStyle='#b9f4d0';ctx.setLineDash([5,5]);ctx.strokeRect(cx-len/2-2,y1-17,len+4,34);ctx.strokeRect(cx-len/2-2,y2-17,len+4,34);ctx.setLineDash([])}}
  rubin(ctx,w,h){ctx.fillStyle='#f0e5ce';ctx.fillRect(0,0,w,h);const cx=w/2,top=h*.16,bottom=h*.84;ctx.fillStyle='#071019';ctx.beginPath();ctx.moveTo(cx,top);const profile=(side)=>{ctx.bezierCurveTo(cx+side*w*.08,h*.25,cx+side*w*.09,h*.31,cx+side*w*.04,h*.37);ctx.bezierCurveTo(cx+side*w*.12,h*.42,cx+side*w*.12,h*.50,cx+side*w*.045,h*.53);ctx.bezierCurveTo(cx+side*w*.12,h*.62,cx+side*w*.11,h*.72,cx+side*w*.02,bottom)};profile(1);ctx.lineTo(cx,bottom);ctx.lineTo(cx,bottom);profile(-1);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(214,168,77,.24)';ctx.beginPath();ctx.ellipse(cx,h*.53,w*.19+Math.sin(this.phase)*5,h*.32,0,0,6.283);ctx.fill()}
  drift(ctx,w,h){ctx.translate(w/2,h/2);const rings=Math.max(9,Math.floor(Math.min(w,h)/28));for(let r=rings;r>0;r--){const rad=r*Math.min(w,h)/(rings*2.05);ctx.beginPath();const steps=64;for(let i=0;i<=steps;i++){const a=i/steps*6.283;const wobble=3.5*Math.sin(a*8+r+this.phase*(r%2?1:-1));const rr=rad+wobble;const x=Math.cos(a)*rr,y=Math.sin(a)*rr;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();ctx.strokeStyle=r%2?gold:'rgba(225,235,238,.75)';ctx.lineWidth=Math.max(2,rad/rings*.32);ctx.stroke()}ctx.setTransform(1,0,0,1,0,0)}
  checker(ctx,w,h){const s=Math.min(w/9,h/7),ox=(w-s*8)/2,oy=(h-s*6)/2;for(let y=0;y<6;y++)for(let x=0;x<8;x++){const shade=(x+y)%2?62:165;ctx.fillStyle=`rgb(${shade},${shade},${shade})`;ctx.fillRect(ox+x*s,oy+y*s,s,s)}const gx=ox+s*5.2;ctx.fillStyle='#315f4e';ctx.beginPath();ctx.ellipse(gx,oy+s*.7,s*.55,s*.22,0,0,6.283);ctx.fill();ctx.fillRect(gx-s*.55,oy+s*.7,s*1.1,s*3.1);ctx.fillStyle='#264b3e';ctx.beginPath();ctx.ellipse(gx,oy+s*3.8,s*.55,s*.22,0,0,6.283);ctx.fill();const sh=ctx.createLinearGradient(gx-s*2,0,gx+s*2,0);sh.addColorStop(0,'rgba(0,0,0,.62)');sh.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=sh;ctx.beginPath();ctx.moveTo(gx-s*.25,oy+s*.9);ctx.lineTo(gx-s*3.2,oy+s*5.8);ctx.lineTo(gx+s*.9,oy+s*5.8);ctx.lineTo(gx+s*.55,oy+s*.9);ctx.fill();ctx.strokeStyle='#f0d291';ctx.lineWidth=2;ctx.strokeRect(ox+s*2,oy+s*2,s,s);ctx.strokeRect(ox+s*5,oy+s*4,s,s)}
}

class MotionEngine{
  constructor(canvas){this.canvas=canvas;this.speed=70;this.density=52;this.pull=90;this.preset='orbit';this.running=true;this.t=0;this.loop()}
  set(k,v){this[k]=typeof v==='string'?v:+v}
  loop(){if(!this.running)return;this.t+=.004*(.15+this.speed/40);this.draw();requestAnimationFrame(()=>this.loop())}
  draw(){const {ctx,w,h}=fit(this.canvas);ctx.fillStyle='rgba(2,7,11,.28)';ctx.fillRect(0,0,w,h);const cx=w/2,cy=h/2,n=Math.floor(this.density);for(let i=0;i<n;i++){const q=i/n,a=q*6.283*3+this.t;let x,y,r;if(this.preset==='tunnel'){r=(q*w*.55+this.t*22)% (w*.62);x=cx+Math.cos(a*1.7)*r;y=cy+Math.sin(a*1.7)*r*.58}else if(this.preset==='breathe'){r=Math.min(w,h)*(.08+q*.42)*(1+.14*Math.sin(this.t*2+q*8));x=cx+Math.cos(a)*r;y=cy+Math.sin(a)*r}else{r=Math.min(w,h)*(.12+q*.37);x=cx+Math.cos(a+q*this.pull/30)*r;y=cy+Math.sin(a*.78+q*this.pull/40)*r*.72}const alpha=.18+.72*(1-q);ctx.fillStyle=i%4===0?gold2:`rgba(117,184,211,${alpha})`;ctx.beginPath();ctx.arc(x,y,1.2+(1-q)*3.4,0,6.283);ctx.fill();if(i%5===0){ctx.strokeStyle=`rgba(214,168,77,${alpha*.22})`;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(x,y);ctx.stroke()}}}
  pause(v){this.running=v===undefined?!this.running:v;if(this.running)this.loop();return this.running}
}

class ImageField{
  constructor(canvas,empty){this.canvas=canvas;this.empty=empty;this.image=null;this.filters={brightness:100,contrast:100,saturate:100,hue:0,blur:0};this.compare=false;window.addEventListener('resize',()=>this.draw())}
  load(file){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{this.image=img;this.empty.hidden=true;this.draw();resolve(img)};img.onerror=reject;img.src=URL.createObjectURL(file)})}
  setFilter(k,v){this.filters[k]=+v;this.draw()}
  reset(){this.filters={brightness:100,contrast:100,saturate:100,hue:0,blur:0};this.draw()}
  setCompare(v){this.compare=v;this.draw()}
  draw(){const {ctx,w,h}=fit(this.canvas);ctx.clearRect(0,0,w,h);if(!this.image)return;const s=Math.min(w/this.image.width,h/this.image.height),dw=this.image.width*s,dh=this.image.height*s,x=(w-dw)/2,y=(h-dh)/2;ctx.filter=this.compare?'none':`brightness(${this.filters.brightness}%) contrast(${this.filters.contrast}%) saturate(${this.filters.saturate}%) hue-rotate(${this.filters.hue}deg) blur(${this.filters.blur}px)`;ctx.drawImage(this.image,x,y,dw,dh);ctx.filter='none'}
  export(){if(!this.image)return null;return this.canvas.toDataURL('image/png')}
}

class VideoField{
  constructor(video,empty){this.video=video;this.empty=empty;this.url=null}
  load(file){if(this.url)URL.revokeObjectURL(this.url);this.url=URL.createObjectURL(file);this.video.src=this.url;this.empty.hidden=true;return new Promise(resolve=>this.video.onloadedmetadata=()=>resolve(this.video))}
  toggle(){this.video.paused?this.video.play():this.video.pause()}
  step(delta){this.video.pause();this.video.currentTime=Math.max(0,Math.min(this.video.duration||0,this.video.currentTime+delta/30))}
  setSpeed(v){this.video.playbackRate=+v}
  setContrast(v){this.video.style.filter=`contrast(${v}%)`}
  capture(){if(!this.video.videoWidth)return null;const c=document.createElement('canvas');c.width=this.video.videoWidth;c.height=this.video.videoHeight;const x=c.getContext('2d');x.filter=getComputedStyle(this.video).filter||'none';x.drawImage(this.video,0,0);return c.toDataURL('image/jpeg',.9)}
}

window.JMVisualRuntime={AmbientField,IllusionEngine,MotionEngine,ImageField,VideoField,fit};
})();
