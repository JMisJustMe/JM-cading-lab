(()=>{
'use strict';
const NS=window.JMVisualCampaign;
const canvas=document.createElement('canvas');canvas.id='jmvc-fx';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);const ctx=canvas.getContext('2d',{alpha:true});
let particles=[],ripples=[],trails=[],shake=0,last=performance.now(),w=0,h=0,dpr=1;
const rand=(a,b)=>a+Math.random()*(b-a);
function resize(){const budget=NS.performanceBudget?.()||{dpr:1};dpr=budget.dpr;w=innerWidth;h=innerHeight;canvas.width=Math.max(1,Math.floor(w*dpr));canvas.height=Math.max(1,Math.floor(h*dpr));canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0)}
addEventListener('resize',resize,{passive:true});resize();
function burst(x,y,type='contact',count=16){if(NS.settings.reducedMotion)return;const budget=NS.performanceBudget?.()||{particles:64};count=Math.min(count,budget.particles-particles.length);const colors=type==='fault'?[NS.profile.danger,'#fff']:type==='ding'?[NS.profile.accent2,'#fff',NS.profile.accent]:[NS.profile.accent,NS.profile.accent2];for(let i=0;i<count;i++){const a=rand(0,Math.PI*2),s=rand(25,120);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-rand(5,45),life:rand(.35,.9),age:0,size:rand(1.5,4.5),color:colors[i%colors.length],drag:rand(.88,.96)})}}
function ripple(x,y,color=NS.profile.accent){if(NS.settings.reducedMotion)return;ripples.push({x,y,r:3,age:0,life:.65,color})}
function routeTrail(){if(!NS.settings.routeTrails||NS.settings.reducedMotion)return;const count=NS.engine==='army-federation'?12:NS.engine==='gameforge'?6:NS.engine==='playform'?8:5;const t=performance.now()/1000;trails=[];for(let i=0;i<count;i++){const phase=i/count*Math.PI*2+t*.35;const rx=Math.min(w,h)*(.2+.03*Math.sin(i)),ry=Math.min(w,h)*(.12+.02*Math.cos(i));trails.push({x:w/2+Math.cos(phase)*rx,y:h/2+Math.sin(phase*(NS.profile.motion==='relay'?1.5:1))*ry,alpha:.18+.15*Math.sin(t+i)})}}
function drawAmbient(t){const p=NS.profile;ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.12;const grad=ctx.createRadialGradient(w*.5,h*.38,10,w*.5,h*.38,Math.max(w,h)*.58);grad.addColorStop(0,p.accent+'55');grad.addColorStop(.45,p.accent2+'22');grad.addColorStop(1,'transparent');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);ctx.restore();
 if(NS.settings.routeTrails){ctx.save();ctx.lineWidth=1.5;ctx.strokeStyle=p.accent;ctx.setLineDash([5,14]);ctx.lineDashOffset=-t*.025;ctx.globalAlpha=.18;ctx.beginPath();for(let i=0;i<trails.length;i++){const q=trails[i];if(i===0)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y)}if(trails.length>2)ctx.closePath();ctx.stroke();ctx.restore()}}

function sceneNode(x,y,r,color,label){ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.48;const g=ctx.createRadialGradient(x,y,0,x,y,r*2.6);g.addColorStop(0,color+'88');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r*2.6,y-r*2.6,r*5.2,r*5.2);ctx.globalAlpha=.9;ctx.fillStyle=color;ctx.strokeStyle='#ffffff99';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.stroke();if(label){ctx.fillStyle='#fff';ctx.font=`800 ${Math.max(9,r*.72)}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,x,y)}ctx.restore()}
function sceneLine(a,b,color,alpha=.32,dash=[]){ctx.save();ctx.strokeStyle=color;ctx.globalAlpha=alpha;ctx.lineWidth=2;ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore()}
function drawEngineScene(t){
 if(NS.settings.reducedMotion)t=0;const p=NS.profile,cx=w*.5,cy=h*.47,s=Math.min(w,h),pulse=(Math.sin(t*.002)+1)/2;
 ctx.save();ctx.globalCompositeOperation='screen';
 if(NS.engine==='glyphplay'){
  const tw=Math.max(26,s*.085),th=tw*.48,ox=cx,oy=cy-s*.22;ctx.globalAlpha=.34;
  for(let y=0;y<7;y++)for(let x=0;x<7;x++){const px=ox+(x-y)*tw*.5,py=oy+(x+y)*th*.5;ctx.fillStyle=(x+y)%2?p.accent+'3d':p.accent2+'2b';ctx.strokeStyle=p.accent+'44';ctx.beginPath();ctx.moveTo(px,py-th*.5);ctx.lineTo(px+tw*.5,py);ctx.lineTo(px,py+th*.5);ctx.lineTo(px-tw*.5,py);ctx.closePath();ctx.fill();ctx.stroke()}
  sceneNode(ox-tw*1.5,oy+th*4.4,9,p.accent,'P');sceneNode(ox+tw*1.5,oy+th*2.5,10,p.accent2,'G');sceneLine({x:ox-tw*1.5,y:oy+th*4.4},{x:ox+tw*1.5,y:oy+th*2.5},p.accent,.35,[6,8]);
 }else if(NS.engine==='gameforge'){
  const n=6,gap=Math.min(120,w*.135),start=cx-gap*(n-1)/2;let prev=null;for(let i=0;i<n;i++){const q={x:start+i*gap,y:cy+Math.sin(i*.9)*s*.05};if(prev)sceneLine(prev,q,i%2?p.accent:p.accent2,.42,[8,7]);sceneNode(q.x,q.y,Math.max(8,s*.022),i%2?p.accent:p.accent2,String(i+1));prev=q}const progress=(t*.00016)%1;const px=start+gap*(n-1)*progress;sceneNode(px,cy+Math.sin(progress*(n-1)*.9)*s*.05,5+pulse*3,'#fff','');
 }else if(NS.engine==='glyphforge'){
  const cell=Math.max(9,Math.min(18,s*.035)),gx=cx-cell*6,gy=cy-cell*6;ctx.globalAlpha=.28;for(let y=0;y<12;y++)for(let x=0;x<12;x++){ctx.strokeStyle=p.accent+'55';ctx.strokeRect(gx+x*cell,gy+y*cell,cell-1,cell-1);if((x===2&&y>2&&y<10)||(y===3&&x>2&&x<9)||(x===8&&y>3&&y<9)||(y===8&&x>4&&x<9)){ctx.fillStyle=(x+y)%2?p.accent:p.accent2;ctx.fillRect(gx+x*cell+2,gy+y*cell+2,cell-5,cell-5)}}sceneNode(cx+cell*4.6,cy-cell*4.7,8,p.accent2,'↗');
 }else if(NS.engine==='playform'){
  const n=8,r=s*.25,nodes=[];for(let i=0;i<n;i++){const a=-Math.PI/2+i/n*Math.PI*2;nodes.push({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r*.58})}for(let i=0;i<n;i++)sceneLine(nodes[i],nodes[(i+1)%n],i%2?p.accent:p.accent2,.36,[5,7]);nodes.forEach((q,i)=>sceneNode(q.x,q.y,7+(i===0?pulse*3:0),i%2?p.accent:p.accent2,String(i+1)));const a=-Math.PI/2+(t*.00018%(1))*Math.PI*2;sceneNode(cx+Math.cos(a)*r,cy+Math.sin(a)*r*.58,6,'#fff','');
 }else if(NS.engine==='jmgamecore'){
  const labels=['BR','SB','IN','SV','TR','RC','HB'],r=s*.24,center={x:cx,y:cy};labels.forEach((label,i)=>{const a=-Math.PI/2+i/labels.length*Math.PI*2,q={x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r*.62};sceneLine(center,q,p.accent,.33,[4,8]);sceneNode(q.x,q.y,8,i%2?p.accent:p.accent2,label)});sceneNode(cx,cy,18+pulse*3,p.accent2,'CORE');
 }else if(NS.engine==='jm-game-native-core'){
  const lanes=5,step=Math.min(62,w*.105),start=cx-step*3;for(let lane=0;lane<lanes;lane++){const y=cy+(lane-2)*34;sceneLine({x:start,y},{x:start+step*6,y},lane%2?p.accent:p.accent2,.28,[3,9]);for(let i=0;i<7;i++){const active=i===Math.floor((t*.0015+lane)%7);sceneNode(start+i*step,y,active?8:5,active?p.accent2:p.accent,active?'T':'')}}
 }else if(NS.engine==='kading-game-estate-engine'){
  const labels=['GAME','BODY','INPUT','LOOP','CONSEQ','TARGET'];const gap=Math.min(92,w*.15),start=cx-gap*(labels.length-1)/2;labels.forEach((label,i)=>{const q={x:start+i*gap,y:cy+Math.sin(i*.8)*30};if(i)sceneLine({x:start+(i-1)*gap,y:cy+Math.sin((i-1)*.8)*30},q,p.accent,.38,[7,6]);sceneNode(q.x,q.y,8,i%2?p.accent:p.accent2,label.slice(0,2))});
 }else if(NS.engine==='jm-game-engine-console'){
  const cols=3,rows=3,bw=Math.min(100,w*.22),bh=52,startX=cx-bw*1.5,startY=cy-bh*1.5;for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const px=startX+x*bw,py=startY+y*bh;ctx.globalAlpha=.32;ctx.fillStyle=(x+y)%2?p.accent+'55':p.accent2+'44';ctx.strokeStyle=p.accent+'77';ctx.fillRect(px+4,py+4,bw-10,bh-10);ctx.strokeRect(px+4,py+4,bw-10,bh-10);sceneNode(px+bw-18,py+18,4+(x===Math.floor((t*.001)%3)&&y===Math.floor((t*.0006)%3)?pulse*4:0),p.accent2,'')}
 }else if(NS.engine==='army-federation'){
  const n=9,r=s*.26,nodes=[];for(let i=0;i<n;i++){const a=-Math.PI/2+i/n*Math.PI*2;nodes.push({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r*.62})}for(let i=0;i<n-1;i++)sceneLine(nodes[i],nodes[i+1],i%2?p.accent:p.accent2,.42,[6,8]);nodes.forEach((q,i)=>sceneNode(q.x,q.y,8,i%2?p.accent:p.accent2,String(i+1)));const prog=(t*.00012)%1,seg=Math.min(n-2,Math.floor(prog*(n-1))),local=prog*(n-1)-seg,a=nodes[seg],b=nodes[seg+1];sceneNode(a.x+(b.x-a.x)*local,a.y+(b.y-a.y)*local,6,'#fff','');
 }
 ctx.restore();
}

function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;ctx.clearRect(0,0,w,h);routeTrail();drawAmbient(now);drawEngineScene(now);
 ctx.save();if(shake>0&&!NS.settings.reducedMotion){ctx.translate(rand(-shake,shake),rand(-shake,shake));shake=Math.max(0,shake-dt*28)}
 for(const p of particles){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(p.drag,dt*60);p.vy=p.vy*Math.pow(p.drag,dt*60)+90*dt;const k=1-p.age/p.life;ctx.globalAlpha=Math.max(0,k);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size*(.45+k),0,Math.PI*2);ctx.fill()}particles=particles.filter(p=>p.age<p.life);
 for(const r of ripples){r.age+=dt;r.r+=dt*150;ctx.globalAlpha=Math.max(0,1-r.age/r.life)*.55;ctx.strokeStyle=r.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke()}ripples=ripples.filter(r=>r.age<r.life);ctx.restore();ctx.globalAlpha=1;requestAnimationFrame(frame)}requestAnimationFrame(frame);
NS.fx={burst,ripple,shake(amount=8){shake=Math.max(shake,amount)},signal(type,x=w/2,y=h/2){ripple(x,y,type==='fault'?NS.profile.danger:NS.profile.accent2);burst(x,y,type,type==='ding'?42:type==='fault'?24:15);if(type==='fault')this.shake(10);if(type==='ding')this.shake(4)}};
addEventListener('pointerdown',event=>{NS.state.interactions++;ripple(event.clientX,event.clientY);burst(event.clientX,event.clientY,'contact',8)},{passive:true,capture:true});
})();
