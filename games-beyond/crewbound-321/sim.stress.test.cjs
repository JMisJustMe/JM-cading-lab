/* JM CREWBOUND CP05: seeded multi-match integrity + non-finite coordinate guard.
   Synthetic native simulation, NOT physical Fold8 or competitive balance approval. */
"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {Game,W,H,ROSTER}=require("./sim.js");
test("CP05 sixteen reproducible A/B + yard/relay matches obey legal combat invariants",()=>{
 const outcomes={player:0,enemy:0},records=[];
 for(let seed=321;seed<337;seed++){
  const g=new Game(seed);let iterations=0;
  while(!g.ended&&iterations<4200){
   if(g.resolve<=0){
    const live=g.team("player");
    if(live.length>=2){
     const a=live[seed%live.length],b=live[(seed+1)%live.length];
     if(a.id!==b.id){
      g.choose(a.id);g.choose(b.id);
      g.setPairAction(a.id,iterations%2?"ATTACK":"MOVE");
      g.setPairTarget(a.id,340+(seed%5-2)*45,330);
      g.setPairAction(b.id,iterations%3?"GUARD":"COMBO");
      g.setPairTarget(b.id,340,470+(seed%4-2)*26);
      if(!g.canCommit())g.setTarget(340,420);
      g.commit();
     }
    }
   }
   g.step(.05);iterations++;
   for(const u of g.units){
    for(const v of [u.x,u.y,u.vx,u.vy,u.hp,u.shield,u.kitCooldown])assert.ok(Number.isFinite(v),seed+" "+u.name+" nonfinite");
    assert.ok(u.x>=24&&u.x<=W-24,seed+" x "+u.name);
    assert.ok(u.y>=24&&u.y<=H-24,seed+" y "+u.name);
    assert.ok(u.hp>=0&&u.hp<=u.maxHp);
    assert.ok(u.shield>=0&&u.shield<=400);
   }
   for(const side of ["player","enemy"]){
    assert.ok(g.floor(side).length<=4,"illegal floor size");
    assert.ok(Number.isFinite(g.scores[side])&&g.scores[side]>=0,"invalid relay");
   }
  }
  assert.equal(g.ended,true,"match failed to end seed "+seed);
  assert.ok(["player","enemy"].includes(g.winner));
  assert.ok(g.log.some(x=>x.type==="MATCH_END"),"missing finish receipt");
  outcomes[g.winner]++;records.push({seed,turn:g.turn,reason:g.matchReason,winner:g.winner});
 }
 assert.equal(outcomes.player+outcomes.enemy,16);
 console.log("CREWBOUND_CP05_16_SEEDED_MATCHES",JSON.stringify({outcomes,rounds:records}));
});
test("CP05 nonfinite targeting, foreign commands and cooldown bypass stay rejected",()=>{
 const g=new Game(777),a=g.floor("player")[0],b=g.floor("player")[1];
 assert.equal(g.setTarget(NaN,0),false);
 assert.equal(g.setPairTarget(a.id,Infinity,4),false);
 assert.equal(g.setPairTarget("enemy-0-fake",10,20),false);
 assert.equal(g.setPairAction("enemy-0-fake","ATTACK"),false);
 assert.equal(g.setPairAction(a.id,"INVALID"),false);
 const names=Object.keys(ROSTER);assert.equal(names.length,12);
 g.choose(a.id);g.choose(b.id);g.setTarget(340,410);
 assert.equal(g.commit(),true);assert.equal(g.commit(),false);
});
