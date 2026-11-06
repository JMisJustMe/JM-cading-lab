/* CREWBOUND 3+2+1 CP01 — additive prototype. Derived from original exact PrimeBody roster.js,
   not a replacement for v0.5, COMBOUND, or its verified Games House carrier. */
(function(root,factory){
  const R=root.JM_CREWBOUND_321_ROSTER||(typeof require==="function"?require("./roster.js"):null);
  const C=root.JM_CREWBOUND_321_CAST||(typeof require==="function"?require("./cast.js"):null);
  const api=factory(R,C);
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.JM_CREWBOUND_321_SIM=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(source,cast){
  "use strict";
  if(!source?.fighters)throw Error("Original CREWBOUND roster unavailable");
  const R=cast?.fighters||source.fighters,W=680,H=840,WINDOW=4.3,MAX_FLOOR=4;
  const CREWS=cast?.crews||{player:["ZIPP","BRAX","MIRA","GROVE","ORBI","VEXA"],enemy:["SKIP","KNOT","VEXA","ORBI","GROVE","BRAX"]};
  const clamp=(x,l,h)=>Math.max(l,Math.min(h,x));
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const rand=(seed)=>{let x=seed>>>0;return()=>((x=(1664525*x+1013904223)>>>0)/4294967296)};
  function createUnit(team,key,index){
    const f=R[key],floor=index<3;
    return {id:team+"-"+index+"-"+key,team,key,name:f.name,index,role:floor?"floor":index<5?"yard":"flex",
      x:135+(index%3)*205,y:team==="player"?675:155,vx:0,vy:0,hp:f.hp,maxHp:f.hp,alive:true,
      shield:0,marked:0,bound:0,guard:0,hitFlash:0,cooldown:0,supportCooldown:0,pulseCooldown:0,
      surge:0,order:null,selected:false};
  }
  class Game{
    constructor(seed=321){
      this.rng=rand(seed);this.seed=seed;this.time=0;this.resolve=0;this.turn=0;this.action="COMBO";
      this.selected=[];this.target=null;this.die=null;this.ended=false;this.winner=null;this.log=[];
      this.units=Object.entries(CREWS).flatMap(([team,keys])=>keys.map((k,i)=>createUnit(team,k,i)));
      this.receipt("MATCH_START",{source_sha256:source.source_sha256,formation:"3 floor + 2 yard + 1 flex",simultaneous:true,unique_cast:cast?.schema||"BASELINE"});
    }
    receipt(type,data={}){const v={time:Math.round(this.time*100)/100,type,...data};this.log.push(v);if(this.log.length>120)this.log.shift();return v}
    team(t){return this.units.filter(u=>u.team===t&&u.alive)}
    floor(t){return this.team(t).filter(u=>u.role==="floor")}
    yard(t){return this.team(t).filter(u=>u.role==="yard")}
    flex(t){return this.team(t).find(u=>u.role==="flex")||null}
    find(id){return this.units.find(u=>u.id===id)}
    nearest(u){return this.floor(u.team==="player"?"enemy":"player").sort((a,b)=>dist(a,u)-dist(b,u))[0]||null}
    choose(id){
      if(this.ended||this.resolve>0)return false;
      const u=this.find(id);if(!u||u.team!=="player"||!u.alive)return false;
      const at=this.selected.indexOf(id);
      if(at>=0)this.selected.splice(at,1);else{if(this.selected.length===2)this.selected.shift();this.selected.push(id)}
      this.units.forEach(v=>v.selected=this.selected.includes(v.id));return true;
    }
    setTarget(x,y){
      if(!Number.isFinite(x)||!Number.isFinite(y))return false;
      this.target={x:clamp(x,30,W-30),y:clamp(y,30,H-30)};return true;
    }
    setAction(a){if(!["COMBO","ATTACK","GUARD","MOVE","DEPLOY"].includes(a))return false;this.action=a;return true}
    roll(){if(this.resolve>0||this.ended)return 0;this.die=1+Math.floor(this.rng()*6);this.receipt("OPTIONAL_DIE",{value:this.die});return this.die}
    deploy(u){
      if(!u?.alive||u.role==="floor")return false;
      if(this.floor(u.team).length>=MAX_FLOOR){
        const outgoing=this.floor(u.team).filter(p=>!this.selected.includes(p.id)).sort((a,b)=>a.index-b.index)[0];
        if(!outgoing)return false;
        outgoing.role="yard";outgoing.order=null;outgoing.vx=outgoing.vy=0;
      }
      u.role="floor";u.x=clamp(u.x,70,W-70);u.y=u.team==="player"?H-112:112;
      u.vx=u.vy=0;this.receipt("FLEX_OR_YARD_DEPLOY",{team:u.team,body:u.name,floor:this.floor(u.team).length});return true;
    }
    hurt(target,amount,by){
      if(!target?.alive||target.role!=="floor")return 0;
      if(R[target.key].archetype==="GROVE")amount*=.68;
      if(target.guard>0)amount*=.5;
      if(R[target.key].archetype==="SKIP"&&this.rng()<.18)amount*=.25;
      if(target.marked>0){amount*=1.5;target.marked=0}
      const blocked=Math.min(target.shield,amount);target.shield-=blocked;
      const taken=Math.max(0,amount-blocked);target.hp=Math.max(0,target.hp-taken);target.hitFlash=.26;
      if(!target.hp){target.alive=false;target.role="down";target.order=null;this.receipt("FIGHTER_DOWN",{body:target.name,side:target.team,by:by?.name})}
      return taken;
    }
    intervene(u,mode,target){
      if(u.supportCooldown>0)return false;
      const allies=this.floor(u.team),ally=allies.sort((a,b)=>dist(a,target)-dist(b,target))[0];
      if(!ally)return false;
      if(mode==="GUARD"){
        ally.shield=Math.min(350,ally.shield+85+R[u.key].mass*30);ally.guard=Math.max(ally.guard,3);
      }else if(mode==="MOVE"){
        ally.vx+=(target.x-ally.x)*.2;ally.vy+=(target.y-ally.y)*.2;ally.shield=Math.min(350,ally.shield+30);
      }else{
        const enemy=this.nearest(ally);
        if(enemy)this.hurt(enemy,25+R[u.key].power*22,u);
      }
      u.supportCooldown=5;
      this.receipt("YARD_INTERVENTION",{body:u.name,side:u.team,mode});
      return true;
    }
    order(u,mode,target,issuedBy){
      if(u.role!=="floor"){
        if(mode==="DEPLOY")this.deploy(u);
        else return this.intervene(u,mode,target);
      }
      if(u.role!=="floor"||!u.alive)return false;
      u.order={mode,target:{...target},remaining:WINDOW,issuedBy,bonus:issuedBy==="player"&&this.die?clamp(.88+this.die*.04,.92,1.12):1};
      if(mode==="GUARD"){u.guard=WINDOW;u.shield=Math.min(350,u.shield+55)}
      this.receipt("ORDER",{body:u.name,side:u.team,mode,target:u.order.target});return true;
    }
    commit(){
      if(this.ended||this.resolve>0||this.selected.length!==2||!this.target)return false;
      const units=this.selected.map(id=>this.find(id));
      if(units.some(u=>!u?.alive||u.team!=="player"||u.role!=="floor"&&this.action!=="DEPLOY"&&u.supportCooldown>0))return false;
      const before=this.log.length;
      const x=this.target.x,y=this.target.y;
      const issued=units.map((u,i)=>this.order(u,this.action,{x:clamp(x+(i?35:-35),30,W-30),y},"player"));
      if(!issued.some(Boolean)){this.log.length=before;return false}
      this.turn++;
      const enemyUnits=this.floor("enemy").concat(this.yard("enemy").filter(u=>u.supportCooldown<=0));
      const chosen=[],enemyPlans=[];
      for(let i=0;i<2&&enemyUnits.length>chosen.length;i++){
        const pool=enemyUnits.filter(u=>!chosen.includes(u));
        pool.sort((a,b)=>{const da=this.nearest(a),db=this.nearest(b);return (da?dist(a,da):999)-(db?dist(b,db):999)});
        const actor=pool[Math.floor(this.rng()*Math.min(2,pool.length))]||pool[0];
        chosen.push(actor);
        const target=this.nearest(actor);
        if(target){
          const x=clamp(target.x+target.vx*.55+(this.rng()-.5)*70,30,W-30);
          const y=clamp(target.y+target.vy*.55+(this.rng()-.5)*70,30,H-30);
          const action=this.rng()<.3?"GUARD":this.rng()<.6?"ATTACK":"COMBO";
          this.order(actor,action,{x,y},"enemy");
          enemyPlans.push({name:actor.name,action,target:{x,y}});
        }
      }
      this.receipt("SIMULTANEOUS_PAIR_COMMIT",{turn:this.turn,player:units.map(u=>u.name),rival:enemyPlans,die:this.die});
      this.resolve=WINDOW;this.selected=[];this.target=null;this.die=null;
      this.units.forEach(u=>u.selected=false);return true;
    }
    strike(a,b){
      if(a.cooldown>0||!b?.alive||dist(a,b)>37+R[a.key].mass*5)return;
      let power=42*R[a.key].power;
      if(a.order?.mode==="COMBO")power*=1.25;power*=a.order?.bonus||1;
      if(R[a.key].archetype==="ZIPP"&&a.surge){power*=1+.2*a.surge;a.surge=0}
      if(R[a.key].archetype==="BRAX"){power*=1.3;b.vx+=(b.x-a.x)*2.2;b.vy+=(b.y-a.y)*2.2}
      const damage=this.hurt(b,power,a);
      if(R[a.key].archetype==="VEXA")b.marked=3;
      if(R[a.key].archetype==="KNOT")b.bound=1.8;
      if(R[a.key].archetype==="ORBI"&&a.pulseCooldown<=0){
        this.floor(b.team).filter(x=>x!==b&&dist(x,b)<95).forEach(x=>this.hurt(x,power*.4,a));
        a.pulseCooldown=5;
      }
      if(R[a.key].archetype==="MIRA")this.floor(a.team).filter(x=>x!==a&&dist(x,a)<88).forEach(x=>x.shield=Math.min(350,x.shield+40));
      if(R[a.key].archetype==="GROVE")a.shield=Math.min(350,a.shield+20);
      a.cooldown=Math.max(.5,1.25-R[a.key].cp01_proposed_speed/400);
      this.receipt("CONTACT",{from:a.name,to:b.name,damage:Math.round(damage)});
    }
    reinforce(t){
      if(this.floor(t).length>=3)return;
      for(const candidate of this.yard(t).concat(this.flex(t)?[this.flex(t)]:[])){
        if(this.floor(t).length>=3)break;
        this.deploy(candidate);
      }
    }
    step(seconds){
      if(!Number.isFinite(seconds)||seconds<=0||this.ended)return;
      const dt=clamp(seconds,0,.05);this.time+=dt;this.resolve=Math.max(0,this.resolve-dt);
      for(const u of this.units){
        if(!u.alive)continue;
        for(const p of ["cooldown","supportCooldown","pulseCooldown","hitFlash","guard","marked","bound"])u[p]=Math.max(0,u[p]-dt);
        if(u.role!=="floor")continue;
        if(u.order){u.order.remaining-=dt;if(u.order.remaining<=0)u.order=null}
        const f=R[u.key],foe=this.nearest(u);
        let target=u.order?.target;
        if(!target&&foe){
          const angle=Math.atan2(u.y-foe.y,u.x-foe.x)+Math.sin(this.time*.8+u.index*2.2)*.55;
          const gap=u.hp/u.maxHp<.3?190:85;
          target={x:foe.x+Math.cos(angle)*gap,y:foe.y+Math.sin(angle)*gap};
        }
        if(!target)continue;
        const dx=target.x-u.x,dy=target.y-u.y,len=Math.hypot(dx,dy)||1;
        let desired=f.cp01_proposed_speed*(u.bound>0?.66:1)*(u.order?.mode==="ATTACK"?1.14:1)*(u.order?.mode==="GUARD"?.52:1);
        // Twelve original CP02 tactical identities; different movement paths, not only different colours.
        if(f.maneuver==="weave")desired*=1+.10*Math.sin(this.time*4+u.index);
        if(f.maneuver==="zigzag")desired*=1+.15*Math.sin(this.time*5);
        if(f.maneuver==="charge"&&u.order?.mode==="ATTACK")desired*=1.23;
        if(f.maneuver==="anchor"&&u.guard>0)desired*=.63;
        if(f.maneuver==="pulse")desired*=1+.12*Math.sin(this.time*6.2);
        if(f.maneuver==="drift")desired*=1.05;
        if(f.maneuver==="lure"&&foe&&dist(u,foe)<120)desired*=.75;
        if(f.maneuver==="orbit"&&foe&&dist(u,foe)<170)desired*=1.12;
        if(f.maneuver==="sidestep"&&foe)desired*=1+.12*Math.sin(this.time*3);
        if(f.maneuver==="fence"&&foe&&dist(u,foe)<100)desired*=.87;
        const pace=desired*clamp(len/55,0,1);
        const sway=f.maneuver==="bank"?.23*Math.sin(this.time*2.5+u.index):
          f.maneuver==="weave"?.24*Math.sin(this.time*3+u.index):
          f.maneuver==="zigzag"?.3*Math.sin(this.time*6+u.index):
          f.maneuver==="drift"?.15*Math.cos(this.time*2+u.index):0;
        const speed=pace,smooth=clamp(dt*(2.6+2.4/(.6+f.mass))*(f.maneuver==="drift"?.72:1),0,1);
        const twistX=(-dy/len)*sway*speed,twistY=(dx/len)*sway*speed;
        u.vx+=(dx/len*speed+twistX-u.vx)*smooth;u.vy+=(dy/len*speed+twistY-u.vy)*smooth;
        u.x+=u.vx*dt;u.y+=u.vy*dt;
        if(u.x<24||u.x>W-24||u.y<24||u.y>H-24){
          if(R[u.key].archetype==="ZIPP")u.surge=Math.min(4,u.surge+1);
          if(R[u.key].archetype==="SKIP"){u.vx*=-.8;u.vy*=-.8}
        }
        u.x=clamp(u.x,24,W-24);u.y=clamp(u.y,24,H-24);
      }
      // Crucially, both teams attack and evade during the same advancing clock.
      for(const team of ["player","enemy"])for(const u of this.floor(team))this.strike(u,this.nearest(u));
      this.reinforce("player");this.reinforce("enemy");
      if(this.time>=180||!this.team("player").length||!this.team("enemy").length){
        const hp=t=>this.team(t).reduce((sum,u)=>sum+u.hp,0);
        this.ended=true;this.winner=hp("player")>=hp("enemy")?"player":"enemy";
        this.receipt("MATCH_END",{winner:this.winner,time:Math.round(this.time)});
      }
    }
    snapshot(){return {time:this.time,turn:this.turn,resolve:this.resolve,selected:[...this.selected],target:this.target,
      action:this.action,ended:this.ended,winner:this.winner,units:this.units.map(u=>({...u,order:u.order?{...u.order}:null})),log:this.log.slice(-8)}}
  }
  return {Game,ROSTER:R,CREWS,W,H,WINDOW,ORIGINAL_BODY_SHA256:source.source_sha256,CAST_SCHEMA:cast?.schema||null,ORIGINAL_ARCHETYPES:source.fighters};
});
