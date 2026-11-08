/* JM CREWBOUND CP05 · additive unique tactical fighter kits.
   Each crew-only identity has original combat behaviour. Donor physics and
   historical source remain separately retained in roster.js / cast.js.
   This module does not modify COMBOUND or original CREWBOUND Arena v0.5. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 root.JM_CREWBOUND_321_COMBAT=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const KITS=Object.freeze({
  KEPLER:    {name:"RAIL SLIP",style:"SKATE",reach:52,damage:.92,cooldown:.63,recharge:6,defense:"bank-evasion",special:"dash-ricochet"},
  IRONVALE:  {name:"CRASH ANCHOR",style:"BRACE",reach:47,damage:1.38,cooldown:1.28,recharge:7,defense:"brace",special:"shockwave"},
  SOLACE:    {name:"AFTERIMAGE RELAY",style:"WEAVE",reach:49,damage:.78,cooldown:.78,recharge:5.5,defense:"relay",special:"team-shield"},
  LOCKE:     {name:"GATE SHUNT",style:"HOLD",reach:43,damage:.84,cooldown:1.13,recharge:6.5,defense:"intercept",special:"fortress"},
  ASTER:     {name:"SOLAR CHOIR",style:"ORBIT",reach:66,damage:.86,cooldown:.94,recharge:6,defense:"halo",special:"twin-pulse"},
  NOX:       {name:"HIDDEN VECTOR",style:"MARK",reach:72,damage:1.12,cooldown:1.14,recharge:6,defense:"shadow",special:"precision"},
  STATIC:    {name:"GLITCH LEAP",style:"SHIFT",reach:43,damage:.87,cooldown:.64,recharge:6.5,defense:"phase",special:"blink"},
  LATCH:     {name:"CROSSHATCH",style:"SNARE",reach:68,damage:.82,cooldown:1.06,recharge:7,defense:"tether",special:"snare"},
  EMBER:     {name:"FIRE CIRCLE",style:"BEAT",reach:55,damage:1.02,cooldown:.95,recharge:6.6,defense:"heat-veil",special:"rhythm-wave"},
  WROUGHT:   {name:"IRON PROCESSION",style:"RAM",reach:54,damage:1.29,cooldown:1.33,recharge:8,defense:"heavy-shell",special:"siege-drive"},
  VIVID:     {name:"BRIGHT CUT",style:"PARRY",reach:86,damage:.91,cooldown:.81,recharge:5.7,defense:"parry",special:"lance-line"},
  DASHER:    {name:"CORKSCREW RUN",style:"DRIFT",reach:56,damage:1.01,cooldown:.73,recharge:5.9,defense:"drift",special:"momentum"}
 });
 function get(key){return KITS[key]||null}
 function guardMultiplier(g,target,attacker){
  const kit=get(target.key),defense=kit?.defense;
  if(!defense)return 1;
  const speed=Math.hypot(target.vx,target.vy);
  let factor=1;
  switch(defense){
   case "bank-evasion": factor=speed>90?.76:.99;break;
   case "brace":factor=target.guard>0?.62:.92;break;
   case "relay":factor=target.shield>0?.84:1;break;
   case "intercept":factor=target.guard>0?.55:.89;break;
   case "halo":factor=target.shield>0?.76:1;break;
   case "shadow":factor=speed>45?.81:.98;break;
   case "phase":factor=target.kitCooldown<=0?.61:.94;break;
   case "tether":factor=attacker?.bound>0?.67:1;break;
   case "heat-veil":factor=target.guard>0?.72:1;break;
   case "heavy-shell":factor=.74;break;
   case "parry":factor=target.guard>0?.47:.94;break;
   case "drift":factor=speed>90?.72:1;break;
  }
  return factor;
 }
 function strikeModifier(a,foe){
  const kit=get(a.key);
  if(!kit)return {damage:1,reach:43,cooldown:1};
  let damage=kit.damage;
  const speed=Math.hypot(a.vx,a.vy);
  if(a.key==="DASHER")damage*=1+Math.min(.4,speed/600);
  if(a.key==="NOX"&&foe.hp/foe.maxHp<.42)damage*=1.25;
  if(a.key==="IRONVALE"&&a.order?.mode==="ATTACK")damage*=1.18;
  if(a.key==="VIVID"&&a.guard>0)damage*=1.16;
  return {damage,reach:kit.reach,cooldown:kit.cooldown};
 }
 function castSpecial(game,a,foe,dealt){
  const kit=get(a.key);
  if(!kit||a.kitCooldown>0||!foe?.alive||dealt<=0)return false;
  a.kitCooldown=kit.recharge;
  a.specialFlash=1.05;
  const allies=game.floor(a.team).filter(u=>u!==a);
  const rivals=game.floor(foe.team).filter(u=>u!==foe);
  const near=(list,origin,r)=>list.filter(u=>Math.hypot(u.x-origin.x,u.y-origin.y)<=r);
  switch(a.key){
   case "KEPLER":
    a.shield=Math.min(320,a.shield+45);a.vx*=1.22;a.vy*=1.22;break;
   case "IRONVALE":
    for(const u of near(rivals,foe,92))game.hurt(u,Math.min(55,dealt*.32),a);
    foe.vx+=(foe.x-a.x)*.9;foe.vy+=(foe.y-a.y)*.9;break;
   case "SOLACE":
    for(const u of near(allies,a,180))u.shield=Math.min(350,u.shield+83);
    a.shield=Math.min(350,a.shield+32);break;
   case "LOCKE":
    for(const u of near(allies,a,165)){u.guard=Math.max(u.guard,2.5);u.shield=Math.min(350,u.shield+63)}
    a.shield=Math.min(350,a.shield+56);break;
   case "ASTER":
    for(const u of near(rivals,foe,120))game.hurt(u,Math.min(65,dealt*.42),a);break;
   case "NOX":
    foe.marked=Math.max(foe.marked,3.5);
    game.hurt(foe,Math.min(48,dealt*.34),a);break;
   case "STATIC":
    a.x=Math.max(24,Math.min(game.W-24,a.x+(a.x<foe.x?-38:38)));
    a.y=Math.max(24,Math.min(game.H-24,a.y+(a.y<foe.y?-20:20)));a.shield=Math.min(350,a.shield+26);break;
   case "LATCH":
    foe.bound=Math.max(foe.bound,2.8);
    foe.vx*=.42;foe.vy*=.42;break;
   case "EMBER":
    for(const u of near(rivals,foe,110)){game.hurt(u,Math.min(44,dealt*.27),a);
     u.vx+=(u.x-foe.x)*.6;u.vy+=(u.y-foe.y)*.6}
    break;
   case "WROUGHT":
    foe.vx+=(foe.x-a.x)*1.7;foe.vy+=(foe.y-a.y)*1.7;
    a.guard=Math.max(a.guard,1.7);break;
   case "VIVID":
    foe.marked=Math.max(foe.marked,1.5);
    foe.bound=Math.max(foe.bound,1.25);break;
   case "DASHER":
    a.vx*=1.32;a.vy*=1.32;
    a.shield=Math.min(350,a.shield+38);break;
  }
  game.receipt("SIGNATURE",{side:a.team,fighter:a.name,move:kit.name,target:foe.name});
  return true;
 }
 return {KITS,get,guardMultiplier,strikeModifier,castSpecial};
});
