/* JM CREWBOUND CP08 · local, optional, portable match continuity.
 * Never networked, never merges identities or reauthors original games.
 * A capsule resumes exactly the recorded deterministic random stream.
 */
(function(root,factory){
  const core=root.JM_CREWBOUND_321_SIM||(typeof require==="function"?require("./sim.js"):null);
  const api=factory(core);
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.JM_CREWBOUND_321_CONTINUITY=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(core){
  "use strict";
  const {Game,W,H,WINDOW,ORIGINAL_BODY_SHA256,CAST_SCHEMA}=core;
  const SCHEMA="JM.CREWBOUND.CP08.MATCH_CAPSULE/1", MAX_LENGTH=220000;
  const MODES=["COMBO","ATTACK","GUARD","MOVE","DEPLOY"];
  const NUMERIC=["x","y","vx","vy","hp","shield","marked","bound","guard",
    "hitFlash","cooldown","supportCooldown","pulseCooldown","surge","kitCooldown","specialFlash"];
  const STAT_KEYS=["hits","damage","guards","assists","combos","downs"];
  const IMPACT_KEYS=["hits","damage","guards","assists","downs","signatures"];
  const dup=x=>JSON.parse(JSON.stringify(x));
  function insist(ok,reason){if(!ok)throw Error("CREWBOUND save rejected: "+reason)}
  function finite(n,low,high){return typeof n==="number"&&Number.isFinite(n)&&n>=low&&n<=high}
  function integer(n,low,high){return Number.isSafeInteger(n)&&n>=low&&n<=high}
  function target(t){return t&&typeof t==="object"&&finite(t.x,24,W-24)&&finite(t.y,24,H-24)}
  function statShape(s,keys,scope){
    insist(s&&typeof s==="object",scope);
    const next={};
    for(const k of keys){
      insist(finite(s[k],0,10000000),scope+" "+k);
      next[k]=s[k];
    }
    return next;
  }
  function pack(g){
    insist(g instanceof Game,"not the current CREWBOUND game");
    const obj={
      schema:SCHEMA,source_sha256:ORIGINAL_BODY_SHA256,cast_schema:CAST_SCHEMA,
      seed:g.seed,rng:g.rng.state(),time:g.time,resolve:g.resolve,turn:g.turn,
      action:g.action,selected:dup(g.selected),target:dup(g.target),pairPlans:dup(g.pairPlans),
      editing:g.editing,die:g.die,ended:g.ended,winner:g.winner,matchReason:g.matchReason,
      pairLink:dup(g.pairLink),lastCommittedRival:dup(g.lastCommittedRival),
      finalized:g.finalized,career:dup(g.career),impact:dup(g.impact),
      scores:dup(g.scores),stats:dup(g.stats),zones:dup(g.zones),
      units:dup(g.units),log:dup(g.log)
    };
    const json=JSON.stringify(obj);
    insist(json.length<=MAX_LENGTH,"checkpoint too large");
    return json;
  }
  function unpack(raw){
    insist(typeof raw==="string"&&raw.length>25&&raw.length<=MAX_LENGTH,"JSON size");
    let data;try{data=JSON.parse(raw)}catch{throw Error("CREWBOUND save rejected: invalid JSON")}
    insist(data&&typeof data==="object"&&!Array.isArray(data),"capsule root");
    insist(data.schema===SCHEMA,"capsule version");
    insist(data.source_sha256===ORIGINAL_BODY_SHA256,"original CREWBOUND ancestry");
    insist(data.cast_schema===CAST_SCHEMA,"exclusive pilot cast");
    insist(integer(data.seed,0,0xffffffff)&&integer(data.rng,0,0xffffffff),"deterministic seed");
    insist(finite(data.time,0,180.05)&&finite(data.resolve,0,WINDOW+.001),"battle clock");
    insist(integer(data.turn,0,5000)&&MODES.includes(data.action),"turn / action");
    insist(typeof data.ended==="boolean"&&typeof data.finalized==="boolean","match finalisation");
    insist([null,"player","enemy"].includes(data.winner),"winner");
    insist(data.matchReason===null||["CREW DOWN","TIME / RELAY SCORE"].includes(data.matchReason),"end reason");
    insist(!data.finalized||data.ended,"career finalised without match end");
    insist((data.ended&&data.winner!==null)||(!data.ended&&data.winner===null),"winner state");
    const game=new Game(data.seed,{career:data.career});
    insist(data.career&&typeof data.career==="object","career");
    insist(integer(data.career.matches,0,100000)&&integer(data.career.wins,0,data.career.matches),"career totals");
    for(const key of Object.keys(game.career.pilots)){
      const p=data.career.pilots?.[key];
      insist(p&&integer(p.xp,0,10000000)&&integer(p.matches,0,data.career.matches),"pilot career "+key);
    }
    insist(Array.isArray(data.units)&&data.units.length===game.units.length,"twelve sovereign pilot bodies");
    const aliveKeys=new Set();
    const units=game.units.map((old,i)=>{
      const incoming=data.units[i];
      insist(incoming&&incoming.id===old.id&&incoming.team===old.team&&
        incoming.key===old.key&&incoming.name===old.name&&
        incoming.index===old.index&&incoming.maxHp===old.maxHp,
        "body/ancestry identity at "+i);
      insist(["floor","yard","flex","down"].includes(incoming.role),"pilot role "+i);
      insist(typeof incoming.alive==="boolean","pilot alive flag "+i);
      const fresh={...old,role:incoming.role,alive:incoming.alive};
      for(const k of NUMERIC){
        const limit=k==="vx"||k==="vy"?5000:k==="x"?W:k==="y"?H:
          k==="hp"?old.maxHp:k==="shield"?400:10000;
        const low=k==="vx"||k==="vy"?-5000:0;
        insist(finite(incoming[k],low,limit),"pilot "+i+" "+k);
        fresh[k]=incoming[k];
      }
      insist(finite(fresh.x,24,W-24)&&finite(fresh.y,24,H-24),"fighter arena bounds");
      insist((fresh.alive&&fresh.hp>0&&fresh.role!=="down")||
        (!fresh.alive&&fresh.hp===0&&fresh.role==="down"),"alive/knockdown consistency");
      if(fresh.alive)aliveKeys.add(fresh.id);
      insist(typeof incoming.selected==="boolean","fighter selection bit");
      fresh.selected=incoming.selected;
      if(incoming.order===null)fresh.order=null;
      else{
        const o=incoming.order;
        insist(o&&MODES.includes(o.mode)&&target(o.target)&&finite(o.remaining,0,WINDOW+.001)&&
          ["player","enemy"].includes(o.issuedBy)&&finite(o.bonus,.5,2),"fighter order");
        fresh.order={mode:o.mode,target:{x:o.target.x,y:o.target.y},
          remaining:o.remaining,issuedBy:o.issuedBy,bonus:o.bonus};
      }
      return fresh;
    });
    for(const side of ["player","enemy"]){
      const active=units.filter(u=>u.alive&&u.team===side);
      insist(active.filter(u=>u.role==="floor").length<=4,"floor capacity "+side);
      insist(active.filter(u=>u.role==="flex").length<=1,"flex capacity "+side);
    }
    insist(Array.isArray(data.selected)&&data.selected.length<=2&&
      new Set(data.selected).size===data.selected.length,"selected pair");
    insist(data.selected.every(id=>units.some(u=>u.id===id&&u.team==="player"&&u.alive)),"selected ownership");
    insist(units.every(u=>u.selected===data.selected.includes(u.id)),"selected bits parity");
    insist(data.target===null||target(data.target),"shared target");
    insist(data.editing===null||data.selected.includes(data.editing),"current fighter editor");
    insist(data.die===null||integer(data.die,1,6),"optional dice");
    insist(data.pairPlans&&typeof data.pairPlans==="object"&&!Array.isArray(data.pairPlans),"individual plans");
    const pairPlans=Object.create(null);
    for(const [id,plan] of Object.entries(data.pairPlans)){
      insist(data.selected.includes(id)&&plan&&typeof plan==="object","plan fighter");
      insist(plan.action===undefined||MODES.includes(plan.action),"plan action");
      insist(plan.target===undefined||target(plan.target),"plan destination");
      pairPlans[id]={...(plan.action?{action:plan.action}:{}),...(plan.target?{target:{x:plan.target.x,y:plan.target.y}}:{})};
    }
    insist(data.scores&&finite(data.scores.player,0,1000)&&finite(data.scores.enemy,0,1000),"relay scores");
    const stats={},impact={};
    for(const side of ["player","enemy"])stats[side]=statShape(data.stats?.[side],STAT_KEYS,side+" stats");
    for(const u of units)impact[u.id]=statShape(data.impact?.[u.id],IMPACT_KEYS,"fighter impact "+u.name);
    insist(Array.isArray(data.zones)&&data.zones.length===game.zones.length,"relay zone count");
    const zones=game.zones.map((z,i)=>{
      const p=data.zones[i];
      insist(p&&p.id===z.id&&p.x===z.x&&p.y===z.y&&p.r===z.r,"relay coordinates");
      insist([null,"player","enemy"].includes(p.holder)&&finite(p.progress,0,1),"relay state");
      return {...z,holder:p.holder,progress:p.progress};
    });
    insist(data.pairLink===null||(data.pairLink&&Array.isArray(data.pairLink.ids)&&
      data.pairLink.ids.length===2&&data.pairLink.ids.every(id=>units.some(u=>u.id===id&&u.team==="player"))&&
      finite(data.pairLink.until,0,185)&&integer(data.pairLink.bonusCount,0,10000)),"pair synergy");
    insist(data.lastCommittedRival===null||(data.lastCommittedRival&&
      integer(data.lastCommittedRival.turn,1,5000)&&
      Array.isArray(data.lastCommittedRival.rival)&&data.lastCommittedRival.rival.length<=2&&
      data.lastCommittedRival.rival.every(v=>v&&typeof v.name==="string"&&
        v.name.length<=50&&MODES.includes(v.action)&&target(v.target))),"rival response");
    insist(Array.isArray(data.log)&&data.log.length<=120,"bounded match receipts");
    for(const v of data.log){
      insist(v&&typeof v.type==="string"&&v.type.length<70&&finite(v.time,0,180.05),"match receipt shape");
      if(v.type==="SIMULTANEOUS_PAIR_COMMIT")
        insist(Array.isArray(v.rival)&&v.rival.every(r=>r&&typeof r.name==="string"&&
          MODES.includes(r.action)&&target(r.target)),"paired rival receipt");
    }
    game.units=units;game.time=data.time;game.resolve=data.resolve;game.turn=data.turn;
    game.action=data.action;game.selected=[...data.selected];
    game.target=data.target?{x:data.target.x,y:data.target.y}:null;
    game.pairPlans=pairPlans;game.editing=data.editing;game.die=data.die;
    game.ended=data.ended;game.winner=data.winner;game.matchReason=data.matchReason;
    game.pairLink=dup(data.pairLink);game.lastCommittedRival=dup(data.lastCommittedRival);
    game.finalized=data.finalized;game.impact=impact;game.stats=stats;
    game.scores={player:data.scores.player,enemy:data.scores.enemy};
    game.zones=zones;game.log=dup(data.log);game.rng.restore(data.rng);
    return game;
  }
  return {SCHEMA,MAX_LENGTH,pack,unpack};
});
