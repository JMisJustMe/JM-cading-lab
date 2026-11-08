"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {Game}=require("./sim.js");
const Feedback=require("./feedback.js");
test("CP09 one independent combat feedback pattern for every exclusive fighter",()=>{
 const keys=["KEPLER","IRONVALE","SOLACE","LOCKE","ASTER","NOX",
   "STATIC","LATCH","EMBER","WROUGHT","VIVID","DASHER"];
 assert.deepEqual(Object.keys(Feedback.SHAPES).sort(),keys.sort());
 assert.equal(new Set(Object.values(Feedback.SHAPES)).size,12);
 for(const key of keys){
  const g=new Game(321),a=g.units.find(u=>u.key===key),b=g.units.find(u=>u.team!==a.team);
  b.hp=b.maxHp=10000;
  const fx=Feedback.createFeedback();fx.observe(g);
  const e=Feedback.eventToEffect({type:"SIGNATURE",side:a.team,fighter:a.name,move:key+" SPECIAL"},g);
  assert.equal(e.kind,"signature");
  assert.equal(e.body,a.name);
  assert.equal(e.shape,Feedback.SHAPES[key]);
 }
});
test("CP09 visual contact, knockdown, yard assist and relay trace are real source projections",()=>{
 const g=new Game(321),a=g.floor("player")[0],b=g.floor("enemy")[0],z=g.zones[0];
 const samples=[
  [{type:"CONTACT",from:a.name,to:b.name,damage:32},"contact","−32"],
  [{type:"CONTACT",from:a.name,to:b.name,damage:0},"contact","BLOCK"],
  [{type:"FIGHTER_DOWN",body:b.name,side:"enemy"},"down","KNOCKDOWN"],
  [{type:"YARD_INTERVENTION",body:g.yard("player")[0].name,side:"player"},"yard","SUPPORT"],
  [{type:"RELAY_CAPTURE",zone:z.id,side:"player"},"relay","RELAY SECURED"]
 ];
 for(const [rec,kind,label] of samples){
  const e=Feedback.eventToEffect(rec,g);
  assert.equal(e.kind,kind);
  assert.ok(e.label.includes(label));
  assert.ok(e.x>=0&&e.x<=680&&e.y>=0&&e.y<=840);
 }
 assert.equal(Feedback.eventToEffect({type:"UNKNOWN"},g),null);
 assert.equal(Feedback.eventToEffect({type:"SIGNATURE",fighter:"COMBOUND FICTION",side:"player"},g),null);
});
test("CP09 event listener is read-only and processes only actually new receipts",()=>{
 const g=new Game(321),fx=Feedback.createFeedback();
 const baseline=JSON.stringify(g.snapshot()),beforeRng=g.rng.state(),oldLog=g.log.length;
 assert.equal(fx.observe(g),0);
 g.receipt("RELAY_CAPTURE",{zone:g.zones[0].id,side:"player"});
 assert.equal(fx.observe(g),1);
 assert.equal(fx.observe(g),0);
 assert.equal(fx.snapshot().length,1);
 assert.equal(g.rng.state(),beforeRng);
 assert.equal(g.log.length,oldLog+1);
 assert.deepEqual(JSON.parse(baseline).units,g.snapshot().units);
 fx.tick(.25);assert.ok(fx.snapshot()[0].age>0);
 for(let i=0;i<80;i++)fx.tick(.04);
 assert.equal(fx.count(),0);
});
test("CP09 capped effects remain bounded through many combat events and a 120-record log",()=>{
 const g=new Game(321),fx=Feedback.createFeedback();fx.observe(g);
 for(let i=0;i<180;i++){
  g.receipt("CONTACT",{from:g.floor("player")[0].name,to:g.floor("enemy")[0].name,damage:i});
  fx.observe(g);
 }
 assert.ok(g.log.length<=120);
 assert.equal(fx.count(),28);
 assert.equal(fx.snapshot().at(-1).label,"−179");
 assert.ok(fx.snapshot().every(x=>x.age===0));
});
test("CP09 reduced motion / off modes preserve combat and do not replay resumed history",()=>{
 const g=new Game(321),fx=Feedback.createFeedback("QUIET");
 assert.equal(fx.mode(),"QUIET");fx.observe(g);
 g.receipt("CONTACT",{from:"Kepler",to:g.floor("enemy")[0].name,damage:14});
 assert.equal(fx.observe(g),1);
 assert.equal(fx.setMode("OFF"),true);
 assert.equal(fx.count(),0);
 assert.equal(fx.setMode("unknown"),false);
 assert.equal(fx.observe(g),0);
 const restored=new Game(321);
 restored.log=g.log.map(x=>({...x}));
 fx.setMode("FULL");
 assert.equal(fx.observe(restored),0,"resumed history must not animate again");
 restored.receipt("RELAY_CAPTURE",{zone:restored.zones[0].id,side:"player"});
 assert.equal(fx.observe(restored),1);
 assert.equal(fx.count(),1);
});
test("CP09 visual renderer cannot influence deterministic combat, RNG or original identity",()=>{
 const a=new Game(321),b=new Game(321),fx=Feedback.createFeedback();
 fx.observe(b);
 const commit=g=>{
  const x=g.floor("player").slice(0,2);x.forEach(u=>g.choose(u.id));
  g.setAction("ATTACK");g.setTarget(340,410);assert.equal(g.commit(),true);
 };
 commit(a);commit(b);fx.observe(b);
 for(let i=0;i<100;i++){a.step(.05);b.step(.05);fx.observe(b);fx.tick(.05);}
 assert.deepEqual(a.snapshot(),b.snapshot());
 assert.equal(a.rng.state(),b.rng.state());
 assert.equal(a.log.length,b.log.length);
});
test("CP09 accessible trace speaks real combat outcomes",()=>{
 assert.equal(Feedback.summary({type:"CONTACT",from:"Kepler",to:"Static",damage:12}),"Kepler → Static · 12 damage");
 assert.equal(Feedback.summary({type:"CONTACT",from:"Kepler",to:"Static",damage:0}),"Kepler → Static · shielded");
 assert.equal(Feedback.summary({type:"YARD_INTERVENTION",body:"Solace",mode:"GUARD"}),"Solace assists · GUARD");
 assert.equal(Feedback.summary({type:"SIMULTANEOUS_PAIR_COMMIT",turn:2}),"Go 2 · both crews committed");
 assert.equal(Feedback.summary({type:"unrelated"}),"");
});
