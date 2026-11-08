"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {Game,ROSTER,CREWS,W,H,WINDOW,ORIGINAL_BODY_SHA256}=require("./sim.js");
const make=()=>new Game(321);
const plan=(g,ids,action="COMBO",x=340,y=400)=>{
  for(const id of ids)assert.equal(g.choose(id),true);
  assert.equal(g.setAction(action),true);assert.equal(g.setTarget(x,y),true);
  return g.commit();
};
test("source identity stays the exact pre-existing CREWBOUND v0.5",()=>{
 assert.equal(ORIGINAL_BODY_SHA256,"5d022e4a1bde479f25ebcfe74f817a7f277742942f8b71d9ca6f1681893dfee7");
 assert.equal(Object.keys(ROSTER).length,12);
 assert.equal(ROSTER.IRONVALE.hp,1760);assert.equal(ROSTER.LOCKE.mass,2.12);
 assert.equal(ROSTER.IRONVALE.archetype,"BRAX");assert.equal(ROSTER.LOCKE.archetype,"GROVE");
});
test("both sides begin with distinct 3-floor 2-yard 1-flex roles",()=>{
 const g=make();for(const side of ["player","enemy"]){
  assert.equal(g.team(side).length,6);assert.equal(g.floor(side).length,3);
  assert.equal(g.yard(side).length,2);assert.ok(g.flex(side));
 }
});
test("each fighter retains a distinct CP01 proposed movement speed",()=>{
 const values=Object.values(ROSTER).map(x=>x.cp01_proposed_speed);
 assert.equal(new Set(values).size,12);assert.ok(Math.min(...values)>0);
});
test("one selected character cannot commit a go",()=>{
 const g=make();g.choose(g.floor("player")[0].id);g.setTarget(340,200);
 assert.equal(g.commit(),false);assert.equal(g.turn,0);
});
test("two distinct characters and a target are required",()=>{
 const g=make();const two=g.floor("player").slice(0,2);
 g.choose(two[0].id);g.choose(two[1].id);assert.equal(g.commit(),false);
 g.setTarget(340,350);assert.equal(g.commit(),true);assert.equal(g.turn,1);
});
test("tap third fighter replaces oldest pair member",()=>{
 const g=make(),three=g.floor("player");
 three.forEach(u=>g.choose(u.id));
 assert.deepEqual(g.selected,[three[1].id,three[2].id]);
});
test("your crew and rival crew both MOVE in shared real time",()=>{
 const g=make(),me=g.floor("player")[0],foe=g.floor("enemy")[0];
 const start=[me.x,me.y,foe.x,foe.y];
 for(let i=0;i<45;i++)g.step(1/60);
 assert.notDeepEqual([me.x,me.y],start.slice(0,2));
 assert.notDeepEqual([foe.x,foe.y],start.slice(2));
});
test("the two plans and rival plans resolve simultaneously",()=>{
 const g=make(),two=g.floor("player").slice(0,2);
 assert.equal(plan(g,two.map(x=>x.id)),true);
 assert.equal(g.turn,1);assert.equal(g.resolve,WINDOW);
 assert.equal(g.log.filter(x=>x.type==="SIMULTANEOUS_PAIR_COMMIT").length,1);
 assert.equal(g.log.filter(x=>x.type==="ORDER"&&x.side==="player").length,2);
 assert.equal(g.log.filter(x=>x.type==="ORDER"&&x.side==="enemy").length,2);
});
test("orders cannot be spammed while the current go resolves",()=>{
 const g=make(),two=g.floor("player").slice(0,2);
 plan(g,two.map(x=>x.id));assert.equal(g.commit(),false);
 for(let i=0;i<300;i++)g.step(.02);assert.equal(g.resolve,0);
 assert.equal(g.turn,1);
});
test("off-floor support can guard an ally without joining the floor",()=>{
 const g=make();const yard=g.yard("player")[0],floor=g.floor("player")[0];
 g.choose(yard.id);g.choose(floor.id);g.setAction("GUARD");g.setTarget(floor.x,floor.y);
 assert.equal(g.commit(),true);assert.equal(yard.role,"yard");
 assert.ok(g.floor("player").some(x=>x.shield>0));
 assert.ok(g.log.some(x=>x.type==="YARD_INTERVENTION"&&x.body===yard.name));
});
test("flex can deploy a fourth floor fighter while yard remains two",()=>{
 const g=make(),flex=g.flex("player"),floor=g.floor("player")[0];
 g.choose(flex.id);g.choose(floor.id);g.setAction("DEPLOY");g.setTarget(345,400);
 assert.equal(g.commit(),true);assert.equal(g.floor("player").length,4);
 assert.equal(g.yard("player").length,2);assert.equal(g.flex("player"),null);
});
test("physical arena target clamps to safe dimensions",()=>{
 const g=make();assert.equal(g.setTarget(-500,9999),true);
 assert.deepEqual(g.target,{x:30,y:H-30});
 assert.equal(g.setTarget(NaN,340),false);
});
test("optional die is bounded and only a minor modifier",()=>{
 const g=make();const die=g.roll();assert.ok(die>=1&&die<=6);
 plan(g,g.floor("player").slice(0,2).map(x=>x.id));
 const bonuses=g.floor("player").slice(0,2).map(u=>u.order.bonus);
 assert.ok(bonuses.every(x=>x>=.92&&x<=1.12));
});
test("on-field contact can damage opponents and emit receipts",()=>{
 const g=make(),me=g.floor("player")[0],foe=g.floor("enemy")[0];
 me.x=330;me.y=330;foe.x=343;foe.y=335;
 const old=foe.hp;g.step(.016);
 assert.ok(foe.hp<old);assert.ok(g.log.some(x=>x.type==="CONTACT"));
});
test("new cast traces inherited source combat stats and independent signature names",()=>{
 for(const x of Object.values(ROSTER)){
  assert.ok(x.hp>=1000&&x.hp<=2200);
  assert.ok(x.mass>.5&&x.power>.5);
  assert.ok(x.signature_name&&x.shape&&x.ability_effect&&x.palette.length===3);
 }
});
test("a fresh game does not inherit prior transient orders",()=>{
 const g=make();plan(g,g.floor("player").slice(0,2).map(u=>u.id));
 const fresh=make();assert.equal(fresh.turn,0);assert.equal(fresh.resolve,0);
 assert.equal(fresh.units.filter(u=>u.order!==null).length,0);
});

test("CP02 has twelve independent, uniquely named crew members and silhouettes",()=>{
 const names=Object.values(ROSTER).map(f=>f.name);
 const silhouettes=Object.values(ROSTER).map(f=>f.silhouette);
 assert.equal(new Set(names).size,12);assert.equal(new Set(silhouettes).size,12);
 assert.ok(names.every(n=>!["Zipp","Brax","Mira","Vexa","Grove","Orbi","Knot","Skip"].includes(n)));
 assert.equal(new Set(CREWS.player.concat(CREWS.enemy)).size,12);
});
test("each cast identity recovers a named original donor without sharing original appearance",()=>{
 const original=require("./roster.js");
 for(const f of Object.values(ROSTER)){
  const donor=original.fighters[f.archetype];
  assert.ok(donor);assert.equal(f.mass,donor.mass);
  assert.equal(f.power,donor.power);
  assert.equal(f.source_name,donor.name);
  assert.equal(f.source_signature,donor.signature_name);
  assert.notDeepEqual(f.palette,donor.palette);
  assert.ok(f.maneuver&&f.role&&f.kit&&f.defense&&f.attack);
 }
});
test("the two squads have different complete identities, not mirror duplicates",()=>{
 const g=make();
 assert.deepEqual(g.team("player").map(x=>x.name),["Kepler","Ironvale","Solace","Locke","Aster","Nox"]);
 assert.deepEqual(g.team("enemy").map(x=>x.name),["Static","Latch","Ember","Wrought","Vivid","Dasher"]);
 assert.equal(new Set(g.units.map(x=>x.key)).size,12);
});

test("CP04 independent A/B actions and destinations produce two committed player orders",()=>{
 const g=make(),two=g.floor("player").slice(0,2);
 for(const u of two)assert.equal(g.choose(u.id),true);
 assert.equal(g.setPairAction(two[0].id,"ATTACK"),true);
 assert.equal(g.setPairTarget(two[0].id,205,265),true);
 assert.equal(g.canCommit(),false,"A alone cannot commit");
 assert.equal(g.setPairAction(two[1].id,"GUARD"),true);
 assert.equal(g.setPairTarget(two[1].id,430,560),true);
 assert.equal(g.canCommit(),true);
 assert.equal(g.commit(),true);
 const plans=g.log.find(r=>r.type==="SIMULTANEOUS_PAIR_COMMIT").playerPlans;
 assert.deepEqual(plans.map(x=>x.action),["ATTACK","GUARD"]);
 assert.deepEqual(plans.map(x=>x.target),[{x:205,y:265},{x:430,y:560}]);
 assert.equal(g.turn,1);
 assert.equal(g.selected.length,0);assert.equal(Object.keys(g.pairPlans).length,0);
});

test("CP04 linked controls retain original two-fighter default behaviour",()=>{
 const g=make(),two=g.floor("player").slice(0,2);
 two.forEach(u=>g.choose(u.id));
 g.setAction("MOVE");g.setTarget(320,420);
 assert.equal(g.canCommit(),true);
 assert.equal(g.commit(),true);
 const plans=g.log.find(x=>x.type==="SIMULTANEOUS_PAIR_COMMIT").playerPlans;
 assert.deepEqual(plans.map(x=>x.action),["MOVE","MOVE"]);
 assert.equal(plans[0].target.x,285);assert.equal(plans[1].target.x,355);
});

test("CP04 deselect or replace clears stale individual plans and rejects foreign IDs",()=>{
 const g=make(),three=g.floor("player");
 g.choose(three[0].id);g.choose(three[1].id);
 assert.equal(g.setEditing(three[0].id),true);
 assert.equal(g.setPairTarget(three[0].id,160,280),true);
 assert.equal(g.setPairAction("enemy-0-SKIP","GUARD"),false);
 assert.equal(g.setPairAction(three[0].id,"MISTAKE"),false);
 g.choose(three[2].id);
 assert.equal(g.selected.includes(three[0].id),false);
 assert.equal(g.pairPlans[three[0].id],undefined);
 assert.equal(g.editing,null);
 assert.equal(g.canCommit(),false);
});

test("CP04 linked retarget explicitly clears individual-target overrides",()=>{
 const g=make(),two=g.floor("player").slice(0,2);
 two.forEach(u=>g.choose(u.id));
 g.setPairTarget(two[0].id,135,330);g.setPairTarget(two[1].id,550,360);
 assert.equal(g.canCommit(),true);
 g.setTarget(350,410);
 assert.equal(g.pairPlans[two[0].id].target,undefined);
 assert.equal(g.pairPlans[two[1].id].target,undefined);
 g.setPairAction(two[0].id,"ATTACK");g.setPairAction(two[1].id,"GUARD");
 g.setAction("COMBO");
 assert.equal(g.pairPlans[two[0].id].action,undefined);
 assert.equal(g.pairPlans[two[1].id].action,undefined);
});

test("CP05 twelve different role kits, silhouettes, abilities and source-traceable ancestors",()=>{
 const kit=require("./combat-kit.js");
 assert.equal(Object.keys(kit.KITS).length,12);
 const fighters=Object.values(ROSTER);
 for(const key of Object.keys(ROSTER)){
  assert.ok(kit.KITS[key],"missing original player identity "+key);
  assert.ok(kit.KITS[key].reach>=40&&kit.KITS[key].reach<=100);
  assert.ok(kit.KITS[key].recharge>=5);
  assert.ok(kit.KITS[key].defense&&kit.KITS[key].special);
 }
 assert.equal(new Set(Object.values(kit.KITS).map(v=>v.name)).size,12);
 assert.equal(new Set(Object.values(kit.KITS).map(v=>v.defense)).size,12);
 assert.equal(new Set(Object.values(kit.KITS).map(v=>v.special)).size,12);
 assert.equal(new Set(fighters.map(v=>v.silhouette)).size,12);
});

test("CP05 every character can trigger its own original cooldown-gated signature",()=>{
 const combat=require("./combat-kit.js");
 for(const key of Object.keys(combat.KITS)){
  const g=make(),a=g.units.find(x=>x.key===key);
  const b=g.units.find(x=>x.team!==a.team);
  assert.ok(a&&b,key);
  a.role="floor";b.role="floor";
  a.kitCooldown=0;
  assert.equal(combat.castSpecial(g,a,b,40),true,"failed "+key);
  assert.ok(a.kitCooldown>0,key);
  assert.ok(a.specialFlash>0,key);
  const receipt=g.log.filter(x=>x.type==="SIGNATURE");
  assert.equal(receipt.length,1,key);
  assert.equal(receipt[0].move,combat.KITS[key].name,key);
  assert.equal(combat.castSpecial(g,a,b,40),false,"cooldown bypass "+key);
 }
});

test("CP05 defensive identities vary real damage, not merely colours",()=>{
 const combat=require("./combat-kit.js");
 const g=make(),attacker=g.floor("enemy")[0];
 const iron=g.units.find(x=>x.key==="IRONVALE"),wrought=g.units.find(x=>x.key==="WROUGHT");
 iron.role="floor";wrought.role="floor";
 iron.guard=0;wrought.guard=0;
 assert.ok(combat.guardMultiplier(g,wrought,attacker)<combat.guardMultiplier(g,iron,attacker));
 const locke=g.units.find(x=>x.key==="LOCKE");
 locke.guard=2;assert.ok(combat.guardMultiplier(g,locke,attacker)<.6);
});

test("CP05 linked pair damage bonus is conditional on actual partner proximity",()=>{
 const g=make(),[a,b]=g.floor("player"),foe=g.floor("enemy")[0];
 a.x=300;a.y=300;b.x=300;b.y=320;foe.x=310;foe.y=306;
 assert.equal(plan(g,[a.id,b.id],"COMBO",310,320),true);
 assert.ok(g.pairLink&&g.pairLink.ids.length===2);
 a.cooldown=0;g.strike(a,foe);
 assert.ok(g.stats.player.combos>=1);
 assert.ok(g.stats.player.hits>=1);
 assert.ok(g.log.some(x=>x.type==="CONTACT"));
});

test("CP05 relay occupation rewards presence but never free contested points",()=>{
 const g=make(),z=g.zones[0];
 for(const u of g.floor("player")){
  u.x=z.x+12;u.y=z.y+12;
  u.order={mode:"GUARD",target:{x:z.x,y:z.y},remaining:20};
 }
 for(const u of g.floor("enemy")){
  u.x=580;u.y=130;
  u.order={mode:"GUARD",target:{x:590,y:120},remaining:20};
 }
 for(let i=0;i<100;i++)g.step(.05);
 assert.ok(g.scores.player>0,"no relay score");
 assert.ok(g.log.some(x=>x.type==="RELAY_CAPTURE"&&x.side==="player"));
 assert.ok(g.scores.enemy>=0);
 const before=g.scores.player;
 g.zones[0].x=580;g.zones[0].y=130;
 // Once the rival dominates the relocated relay, the player's score stops increasing.
 g.zones[1].x=580;g.zones[1].y=130;
 for(let i=0;i<15;i++)g.step(.05);
 assert.ok(g.scores.player<=before+.03);
});

test("CP05 match conclusion reports winner, objective scores and combat stats",()=>{
 const g=make();
 g.time=179.95;g.scores.player=9;g.scores.enemy=3;
 g.step(.05);
 assert.equal(g.ended,true);
 assert.ok(["player","enemy"].includes(g.winner));
 assert.equal(g.matchReason,"TIME / RELAY SCORE");
 const r=g.log.find(x=>x.type==="MATCH_END");
 assert.equal(r.winner,g.winner);
 assert.equal(r.scores.player,g.scores.player);
 assert.ok(Number.isFinite(r.hits.player));
});

test("CP05 yard assists have real cooldown and recorded contribution",()=>{
 const g=make(),yard=g.yard("player")[0],floor=g.floor("player")[0];
 g.choose(yard.id);g.choose(floor.id);g.setAction("GUARD");g.setTarget(floor.x,floor.y);
 assert.equal(g.commit(),true);
 assert.ok(g.stats.player.assists>=1);
 assert.ok(yard.supportCooldown>0);
 assert.ok(g.floor("player").some(u=>u.shield>0));
});

test("CP05 snapshot exposes relay scores, capture zones and match statistics without changing source",()=>{
 const g=make(),s=g.snapshot();
 assert.equal(s.zones.length,2);
 assert.equal(s.scores.player,0);
 assert.equal(s.stats.enemy.hits,0);
 assert.equal(s.matchReason,null);
 assert.equal(ORIGINAL_BODY_SHA256,"5d022e4a1bde479f25ebcfe74f817a7f277742942f8b71d9ca6f1681893dfee7");
});
