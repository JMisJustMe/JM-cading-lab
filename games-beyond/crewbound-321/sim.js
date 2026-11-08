/* CREWBOUND 3+2+1 CP01 — additive prototype. Derived from original exact PrimeBody roster.js,
   not a replacement for v0.5, COMBOUND, or its verified Games House carrier. */
(function(root,factory){
  const R=root.JM_CREWBOUND_321_ROSTER||(typeof require==="function"?require("./roster.js"):null);
  const C=root.JM_CREWBOUND_321_CAST||(typeof require==="function"?require("./cast.js"):null);
  const K=root.JM_CREWBOUND_321_COMBAT||(typeof require==="function"?require("./combat-kit.js"):null);
  const api=factory(R,C,K);
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.JM_CREWBOUND_321_SIM=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(source,cast,combat){
  "use strict";
  if(!source?.fighters)throw Error("Original CREWBOUND roster unavailable");
  if(!combat?.KITS||Object.keys(combat.KITS).length!==12)throw Error("Independent CREWBOUND CP05 fighter kits unavailable");
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
      surge:0,kitCooldown:0,specialFlash:0,order:null,selected:false};
  }
  class Game{
    constructor(seed=321){
      this.rng=rand(seed);this.seed=seed;this.time=0;this.resolve=0;this.turn=0;this.action="COMBO";
      this.selected=[];this.target=null;this.pairPlans=Object.create(null);this.editing=null;this.die=null;this.ended=false;this.winner=null;this.log=[];
      this.W=W;this.H=H;
      this.scores={player:0,enemy:0};this.matchReason=null;this.pairLink=null;
      this.stats={player:{hits:0,damage:0,guards:0,assists:0,combos:0,downs:0},enemy:{hits:0,damage:0,guards:0,assists:0,combos:0,downs:0}};
      this.zones=[{id:"relay-west",x:W*.30,y:H*.46,r:100,holder:null,progress:0},
        {id:"relay-east",x:W*.70,y:H*.54,r:100,holder:null,progress:0}];
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
      if(at>=0){this.selected.splice(at,1);delete this.pairPlans[id];if(this.editing===id)this.editing=null}
      else{
        if(this.selected.length===2){const evicted=this.selected.shift();delete this.pairPlans[evicted];if(this.editing===evicted)this.editing=null}
        this.selected.push(id);
      }
      this.units.forEach(v=>v.selected=this.selected.includes(v.id));return true;
    }
    setTarget(x,y){
      if(!Number.isFinite(x)||!Number.isFinite(y))return false;
      this.target={x:clamp(x,30,W-30),y:clamp(y,30,H-30)};
      for(const plan of Object.values(this.pairPlans))delete plan.target;
      return true;
    }
    setAction(a){
      if(!["COMBO","ATTACK","GUARD","MOVE","DEPLOY"].includes(a))return false;
      this.action=a;for(const plan of Object.values(this.pairPlans))delete plan.action;return true;
    }
    setEditing(id){
      if(id!==null&&!this.selected.includes(id))return false;
      this.editing=id;return true;
    }
    setPairAction(id,a){
      if(!this.selected.includes(id)||!["COMBO","ATTACK","GUARD","MOVE","DEPLOY"].includes(a))return false;
      (this.pairPlans[id]??={}).action=a;return true;
    }
    setPairTarget(id,x,y){
      if(!this.selected.includes(id)||!Number.isFinite(x)||!Number.isFinite(y))return false;
      (this.pairPlans[id]??={}).target={x:clamp(x,30,W-30),y:clamp(y,30,H-30)};return true;
    }
    canCommit(){
      if(this.ended||this.resolve>0||this.selected.length!==2)return false;
      const fighters=this.selected.map(id=>this.find(id));
      return fighters.every(u=>{
        if(!u?.alive||u.team!=="player")return false;
        const plan=this.pairPlans[u.id]||{},mode=plan.action||this.action;
        if(u.role!=="floor"&&mode!=="DEPLOY"&&u.supportCooldown>0)return false;
        return !!(plan.target||this.target);
      });
    }
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
      amount*=combat.guardMultiplier(this,target,by);
      if(target.guard>0)amount*=.5;
      if(R[target.key].archetype==="SKIP"&&this.rng()<.18)amount*=.25;
      if(target.marked>0){amount*=1.5;target.marked=0}
      const blocked=Math.min(target.shield,amount);target.shield-=blocked;
      const taken=Math.max(0,amount-blocked);target.hp=Math.max(0,target.hp-taken);target.hitFlash=.26;
      if(by?.team&&this.stats[by.team])this.stats[by.team].damage+=taken;
      if(!target.hp){target.alive=false;target.role="down";target.order=null;
        if(by?.team&&this.stats[by.team])this.stats[by.team].downs++;
        this.receipt("FIGHTER_DOWN",{body:target.name,side:target.team,by:by?.name})}
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
      this.stats[u.team].assists++;
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
      if(mode==="GUARD"){u.guard=WINDOW;u.shield=Math.min(350,u.shield+55);this.stats[u.team].guards++}
      this.receipt("ORDER",{body:u.name,side:u.team,mode,target:u.order.target});return true;
    }
    commit(){
      if(!this.canCommit())return false;
      const units=this.selected.map(id=>this.find(id));
      const before=this.log.length;
      const planned=units.map((u,i)=>{
        const proposal=this.pairPlans[u.id]||{},target=proposal.target||this.target;
        return {u,action:proposal.action||this.action,target:{
          x:clamp(target.x+(proposal.target?0:i?35:-35),30,W-30),y:target.y}};
      });
      const issued=planned.map(p=>this.order(p.u,p.action,p.target,"player"));
      if(!issued.every(Boolean)){this.log.length=before;return false}
      this.turn++;
      this.pairLink={ids:units.map(u=>u.id),until:this.time+WINDOW,bonusCount:0};
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
          const wounded=actor.hp/actor.maxHp<.28,nearThreat=target&&dist(actor,target)<130;
          const choice=this.rng();
          const action=wounded&&nearThreat?"GUARD":actor.role==="yard"&&choice<.35?"GUARD":choice<.2?"MOVE":choice<.43?"GUARD":choice<.74?"ATTACK":"COMBO";
          this.order(actor,action,{x,y},"enemy");
          enemyPlans.push({name:actor.name,action,target:{x,y}});
        }
      }
      this.receipt("SIMULTANEOUS_PAIR_COMMIT",{turn:this.turn,player:units.map(u=>u.name),
        playerPlans:planned.map(p=>({name:p.u.name,action:p.action,target:p.target})),
        rival:enemyPlans,die:this.die});
      this.resolve=WINDOW;this.selected=[];this.target=null;this.pairPlans=Object.create(null);this.editing=null;this.die=null;
      this.units.forEach(u=>u.selected=false);return true;
    }
    strike(a,b){
      const profile=combat.strikeModifier(a,b);
      if(a.cooldown>0||!b?.alive||a.role!=="floor"||dist(a,b)>profile.reach)return;
      let power=42*R[a.key].power*profile.damage;
      if(this.pairLink&&this.time<this.pairLink.until&&this.pairLink.ids.includes(a.id)){
        const partner=this.find(this.pairLink.ids.find(id=>id!==a.id));
        if(partner?.alive&&partner.role==="floor"&&dist(a,partner)<145){
          power*=1.13;this.stats[a.team].combos++;this.pairLink.bonusCount++;
        }
      }
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
      a.cooldown=profile.cooldown;
      this.stats[a.team].hits++;
      combat.castSpecial(this,a,b,damage);
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
        for(const p of ["cooldown","supportCooldown","pulseCooldown","kitCooldown","specialFlash","hitFlash","guard","marked","bound"])u[p]=Math.max(0,u[p]-dt);
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
      // Two contested living-field relay zones reward prediction, not idle camping.
      for(const z of this.zones){
        const count=side=>this.floor(side).filter(u=>dist(u,z)<z.r).length;
        const player=count("player"),enemy=count("enemy"),controlling=player>enemy?"player":enemy>player?"enemy":null;
        if(!controlling){z.progress=Math.max(0,z.progress-dt*.1);continue}
        z.progress=Math.min(1,z.progress+dt*.18);
        if(z.progress>=.55&&z.holder!==controlling){
          z.holder=controlling;this.receipt("RELAY_CAPTURE",{zone:z.id,side:controlling});
        }
        if(z.progress>=.55)this.scores[controlling]+=dt*.34;
      }
      if(this.time>=180||!this.team("player").length||!this.team("enemy").length){
        const hp=t=>this.team(t).reduce((sum,u)=>sum+u.hp,0);
        const defeated=side=>this.team(side).length===0;
        const rating=side=>hp(side)/this.units.filter(u=>u.team===side).reduce((n,u)=>n+u.maxHp,0)*100+this.scores[side];
        this.matchReason=defeated("player")||defeated("enemy")?"CREW DOWN":"TIME / RELAY SCORE";
        this.ended=true;
        this.winner=defeated("enemy")?"player":defeated("player")?"enemy":
          rating("player")>=rating("enemy")?"player":"enemy";
        this.receipt("MATCH_END",{winner:this.winner,reason:this.matchReason,time:Math.round(this.time),
          scores:{...this.scores},hits:{player:this.stats.player.hits,enemy:this.stats.enemy.hits}});
      }
    }
    snapshot(){return {time:this.time,turn:this.turn,resolve:this.resolve,selected:[...this.selected],target:this.target,
      action:this.action,ended:this.ended,winner:this.winner,matchReason:this.matchReason,
       scores:{...this.scores},stats:JSON.parse(JSON.stringify(this.stats)),
       zones:this.zones.map(z=>({...z})),units:this.units.map(u=>({...u,order:u.order?{...u.order}:null})),log:this.log.slice(-8)}}
  }
  return {Game,ROSTER:R,CREWS,W,H,WINDOW,ORIGINAL_BODY_SHA256:source.source_sha256,CAST_SCHEMA:cast?.schema||null,ORIGINAL_ARCHETYPES:source.fighters,KITS:combat.KITS};
});
