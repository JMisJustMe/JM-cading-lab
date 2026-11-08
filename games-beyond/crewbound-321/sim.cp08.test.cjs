"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const core=require("./sim.js"),capsule=require("./continuity.js");
const {Game,ORIGINAL_BODY_SHA256}=core;
const make=()=>new Game(321);
test("CP08 capsule preserves entire live 3+2+1 state and deterministic random stream",()=>{
 const g=make(),[a,b]=g.floor("player");
 g.choose(a.id);g.choose(b.id);g.setAction("ATTACK");g.setTarget(340,420);
 assert.equal(g.commit(),true);
 for(let i=0;i<75;i++)g.step(.05);
 const initialLog=g.log.length,prior=g.rng.state(),saved=capsule.pack(g);
 assert.equal(g.rng.state(),prior,"saving advanced randomness");
 assert.equal(g.log.length,initialLog,"saving emitted a receipt");
 const restored=capsule.unpack(saved);
 assert.deepEqual(restored.snapshot(),g.snapshot());
 assert.equal(restored.rng.state(),prior);
 assert.equal(restored.rng(),g.rng(),"future draws differed after restoration");
 assert.equal(restored.lastRivalPair().turn,1);
 assert.equal(restored.stats.player.hits,g.stats.player.hits);
});
test("CP08 recovery supports unfinished planning, both independent moves and selected-pair identity",()=>{
 const g=make(),[a,b]=g.floor("player");
 g.choose(a.id);g.choose(b.id);
 g.setPairAction(a.id,"MOVE");g.setPairTarget(a.id,210,390);
 g.setPairAction(b.id,"GUARD");g.setPairTarget(b.id,420,500);
 g.setEditing(b.id);
 const before=g.pairPreview();
 const restored=capsule.unpack(capsule.pack(g));
 assert.deepEqual(restored.pairPreview(),before);
 assert.equal(restored.canCommit(),true);
 assert.equal(restored.commit(),true);
 assert.deepEqual(restored.log.find(x=>x.type==="SIMULTANEOUS_PAIR_COMMIT").playerPlans.map(x=>x.action),["MOVE","GUARD"]);
});
test("CP08 collision and scope: foreign/edited pilot ancestry and cast are rejected",()=>{
 const original=JSON.parse(capsule.pack(make()));
 const check=(change,detail)=>{
  const copy=JSON.parse(JSON.stringify(original));change(copy);
  assert.throws(()=>capsule.unpack(JSON.stringify(copy)),/save rejected/,detail);
 };
 check(d=>d.source_sha256="other","source authority");
 check(d=>d.cast_schema="COMBOUND","independent pilot cast");
 check(d=>d.schema="JM.CREWBOUND.CP99","unknown version");
 check(d=>d.units[0].key="BRAX","individual key");
 check(d=>d.units[0].team="enemy","team allegiance");
 check(d=>d.units[0].maxHp=999999,"combat balance");
 check(d=>d.units[0].role="unknown","role validity");
 check(d=>d.units[0].x=-300,"coordinate safety");
 check(d=>d.career.wins=300,"career totals");
 check(d=>d.rng=-1,"seed");
 check(d=>d.log=Array(122).fill({type:"CONTACT",time:0}),"bounded logs");
 assert.throws(()=>capsule.unpack("{not JSON"),/invalid JSON/);
 assert.throws(()=>capsule.unpack("z".repeat(capsule.MAX_LENGTH+1)),/JSON size/);
});
test("CP08 failed second command rolls back all earlier shield effects, damage, randomness and receipts",()=>{
 const g=make(),support=g.yard("player")[0],floor=g.floor("player")[0];
 g.choose(support.id);g.choose(floor.id);g.setAction("GUARD");g.setTarget(floor.x,floor.y);
 const before=JSON.stringify(g.snapshot()),rng=g.rng.state();
 const original=g.order;let orders=0;
 g.order=function(...args){if(++orders===2)return false;return original.apply(this,args)};
 assert.equal(g.commit(),false);
 assert.equal(g.turn,0);
 assert.equal(JSON.stringify(g.snapshot()),before);
 assert.equal(g.rng.state(),rng);
 assert.equal(g.stats.player.assists,0);
 assert.equal(g.impact[support.id].assists,0);
});
test("CP08 rival response survives bounded log eviction and export/import",()=>{
 const g=make(),[a,b]=g.floor("player");
 g.choose(a.id);g.choose(b.id);g.setTarget(340,420);
 assert.equal(g.commit(),true);
 const rival=g.lastRivalPair();
 for(let i=0;i<160;i++)g.receipt("DIAGNOSTIC",{sequence:i});
 assert.equal(g.log.some(x=>x.type==="SIMULTANEOUS_PAIR_COMMIT"),false);
 assert.deepEqual(g.lastRivalPair(),rival);
 assert.deepEqual(capsule.unpack(capsule.pack(g)).lastRivalPair(),rival);
});
test("CP08 experience rewards all six independently exactly once at final outcome",()=>{
 const g=make(),a=g.floor("player")[0],b=g.floor("enemy")[0];
 a.x=300;a.y=300;b.x=310;b.y=306;a.cooldown=0;
 g.strike(a,b);
 g.time=179.95;g.scores.player=9;g.scores.enemy=0;
 g.step(.05);
 assert.equal(g.ended,true);
 assert.equal(g.career.matches,1);
 assert.equal(Object.keys(g.career.pilots).length,6);
 assert.ok(g.career.pilots[a.key].xp>0);
 assert.ok(g.career.pilots[a.key].matches===1);
 assert.equal(g.log.filter(x=>x.type==="CREW_EXPERIENCE").length,1);
 assert.equal(g.closeMatchCareer(),false);
 assert.equal(g.career.matches,1);
 const next=new Game(987,{career:g.career});
 assert.equal(next.career.matches,1);
 assert.equal(next.career.pilots[a.key].xp,g.career.pilots[a.key].xp);
 assert.equal(next.team("player").length,6);
});
test("CP08 experience grades never alter combat stats, matchmaking or random outcomes",()=>{
 const earned={matches:120,wins:61,pilots:Object.fromEntries(core.CREWS.player.map(k=>[k,{xp:5500,matches:120}]))};
 const fresh=make(),veteran=new Game(321,{career:earned});
 assert.deepEqual(fresh.units,veteran.units,"ranks changed gameplay bodies");
 assert.equal(veteran.pilotRank(core.CREWS.player[0]),"ACE");
 const pairFresh=fresh.floor("player").slice(0,2);
 const pairVeteran=veteran.floor("player").slice(0,2);
 for(const [g,pair] of [[fresh,pairFresh],[veteran,pairVeteran]]){
   pair.forEach(u=>g.choose(u.id));g.setAction("ATTACK");g.setTarget(340,410);assert.equal(g.commit(),true);
   for(let i=0;i<120;i++)g.step(.05);
 }
 assert.deepEqual(fresh.units,veteran.units,"paid-for XP changed deterministic combat");
 assert.deepEqual(fresh.stats,veteran.stats);
 assert.deepEqual(fresh.scores,veteran.scores);
});
test("CP08 original cast and source identity are preserved across capsules and next match",()=>{
 const g=make(),before=g.snapshot(),saved=JSON.parse(capsule.pack(g));
 assert.equal(saved.source_sha256,ORIGINAL_BODY_SHA256);
 assert.equal(ORIGINAL_BODY_SHA256,"5d022e4a1bde479f25ebcfe74f817a7f277742942f8b71d9ca6f1681893dfee7");
 const restored=capsule.unpack(JSON.stringify(saved));
 assert.deepEqual(restored.units.map(x=>({name:x.name,key:x.key,team:x.team,role:x.role})),
   g.units.map(x=>({name:x.name,key:x.key,team:x.team,role:x.role})));
 assert.deepEqual(restored.snapshot().units,before.units);
});
