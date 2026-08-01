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
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;ctx.clearRect(0,0,w,h);routeTrail();drawAmbient(now);
 ctx.save();if(shake>0&&!NS.settings.reducedMotion){ctx.translate(rand(-shake,shake),rand(-shake,shake));shake=Math.max(0,shake-dt*28)}
 for(const p of particles){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(p.drag,dt*60);p.vy=p.vy*Math.pow(p.drag,dt*60)+90*dt;const k=1-p.age/p.life;ctx.globalAlpha=Math.max(0,k);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size*(.45+k),0,Math.PI*2);ctx.fill()}particles=particles.filter(p=>p.age<p.life);
 for(const r of ripples){r.age+=dt;r.r+=dt*150;ctx.globalAlpha=Math.max(0,1-r.age/r.life)*.55;ctx.strokeStyle=r.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke()}ripples=ripples.filter(r=>r.age<r.life);ctx.restore();ctx.globalAlpha=1;requestAnimationFrame(frame)}requestAnimationFrame(frame);
NS.fx={burst,ripple,shake(amount=8){shake=Math.max(shake,amount)},signal(type,x=w/2,y=h/2){ripple(x,y,type==='fault'?NS.profile.danger:NS.profile.accent2);burst(x,y,type,type==='ding'?42:type==='fault'?24:15);if(type==='fault')this.shake(10);if(type==='ding')this.shake(4)}};
addEventListener('pointerdown',event=>{NS.state.interactions++;ripple(event.clientX,event.clientY);burst(event.clientX,event.clientY,'contact',8)},{passive:true,capture:true});
})();
