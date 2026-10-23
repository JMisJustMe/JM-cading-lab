/**
 * JM Mission 002 CP11: real mutations in two receiving bodies from CP10 native
 * five-authority composition. Each recipient retains its own schema and identity.
 * Private FIVE//FLIP and comic authored visual carriers stay out of public repo.
 */
import {createHash} from 'node:crypto';
import {executeCP10Composition} from './m002-cp10-multi-mechanism.mjs';
const clone=x=>structuredClone(x);
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const allowedMedia=['game','comic'];
function validateGame(r){
 if(r?.schema!=='jm.m002.cp11.game-host/1'||!Array.isArray(r.allies)||r.allies.length<1||
   !Array.isArray(r.enemies)||r.enemies.length<1||typeof r.selected!=='string'||
   r.allies.some(x=>typeof x.id!=='string'||!Number.isFinite(x.x)||!Number.isFinite(x.y)||
     !Number.isFinite(x.hp)||!Number.isFinite(x.guardTicks))||
   r.enemies.some(x=>typeof x.id!=='string'||!Number.isFinite(x.x)||
     !Number.isFinite(x.hp)||x.hp<0)||!r.allies.some(x=>x.id===r.selected))
  throw Error('CP11_GAME_RECIPIENT_HOLD');
}
function validateComic(r){
 if(r?.schema!=='jm.m002.cp11.comic-host/1'||!Array.isArray(r.pages)||
   !Number.isInteger(r.edition)||r.edition<0||
   typeof r.owner!=='string')throw Error('CP11_COMIC_RECIPIENT_HOLD');
}
export const CP11_RECEIVER_BOUNDARY=Object.freeze({
 status:'CURRENT_NATIVE_RECIPIENT_MUTATION_WITH_EXACT_CP10_COMPOSITION',
 ownerDonor:'FIVE//FLIP private Game v0.20a separate current owner seat',
 gameScope:'typed recipient mutation; not original private browser main loop',
 comicScope:'typed illustrated page production instructions; real PNG output proved separately in owner local Chromium studio',
 originalTheography:'HOLD_NOT_RECOVERED',physicalSamsung:'HOLD'
});
export function executeCP11Recipients(spec,recipient){
 if(!spec||!allowedMedia.includes(spec.medium))throw Error('CP11_RECIPIENT_MEDIUM_HOLD');
 if(spec.medium==='game')validateGame(recipient);
 else validateComic(recipient);
 const before=clone(recipient),copy=clone(recipient);
 const composed=executeCP10Composition(spec);
 if(!composed.oneBody.receipt.ok||composed.combibind.state.collapsed||
   composed.choice.state.creative.response!==spec.choice||
   composed.logic.allowed!==composed.contact.gate)throw Error('CP11_REAL_AUTHORITY_CONTRADICTION');
 if(composed.status!=='NATIVE_COMPOSITION_EXECUTED'){
  return {schema:'jm.m002.cp11.executed-recipient/1',status:'DENIED_RECIPIENT_UNCHANGED',
    beforeSha256:sha(before),afterSha256:sha(copy),recipient:copy,
    changed:false,composition:composed,
    receipt:{kind:'CP11_WORLD_LAW_DENIAL',mutationCount:0},
    boundary:CP11_RECEIVER_BOUNDARY};
 }
 const source=composed.artifact;
 let changes=[];
 if(spec.medium==='game'){
  const actor=copy.allies.find(x=>x.id===copy.selected);
  const ability=source?.ability?.type;
  if(ability==='GUARD_FIELD'){
   for(const ally of copy.allies.filter(x=>x.hp>0)){
    const prior=ally.guardTicks;ally.guardTicks=Math.max(prior,4);
    changes.push({type:'TEAM_GUARD',actor:ally.id,before:prior,after:ally.guardTicks});
   }
  }else if(ability==='ROUTE_LEAP'){
   const old=actor.x;actor.x=Math.min(1200,actor.x+175);
   if(actor.x===old)throw Error('CP11_LEAP_NO_REAL_MOVEMENT_HOLD');
   changes.push({type:'IN_WORLD_MOVEMENT',actor:actor.id,fromX:old,toX:actor.x});
  }else if(ability==='RESONANCE_BLAST'){
   const enemy=copy.enemies.filter(x=>x.hp>0).sort((a,b)=>Math.abs(a.x-actor.x)-Math.abs(b.x-actor.x))[0];
   if(!enemy)throw Error('CP11_NO_DAMAGEABLE_TARGET_HOLD');
   const hp=enemy.hp;enemy.hp=Math.max(0,hp-22);
   changes.push({type:'COMBAT_HEALTH_MUTATION',target:enemy.id,before:hp,after:enemy.hp});
  }else throw Error('CP11_UNDECLARED_NATIVE_ABILITY_HOLD');
  copy.events=[...(copy.events||[]),{type:'CP11_COMPOSITION_EXECUTED',
   action:ability,actor:copy.selected,choice:spec.choice,source:'CP10_NATIVE_COMPOSITION'}];
 }else{
  if(!Array.isArray(source.panels)||source.panels.length===0)
    throw Error('CP11_COMIC_NATIVE_PANELS_HOLD');
  const start=copy.pages.length,mode=spec.choice;
  const tint={protect:'#6ae9d4',explore:'#a4b8ff',amplify:'#ff9aca'}[mode];
  const drawing=source.panels.map((panel,i)=>({
   sourceStep:panel.step,actor:spec.subject,caption:panel.dialogue,
   layout:{page:start+i+1,frame:panel.frame,background:'connected-world',ink:tint},
   layerCommands:[{op:'background',fill:tint},{op:'figure',pose:mode},
    {op:'speech',text:panel.dialogue,position:'top'}],
   contactContinuity:clone(panel.earned)}));
  copy.pages.push(...drawing);copy.edition++;
  changes=drawing.map((p,i)=>({type:'PAGE_ILLUSTRATION_INSTRUCTION',
   page:start+i+1,actor:p.actor,frame:p.layout.frame}));
 }
 if(changes.length===0||sha(before)===sha(copy))throw Error('CP11_NO_RECIPIENT_MUTATION_HOLD');
 if(JSON.stringify(recipient)!==JSON.stringify(before))throw Error('CP11_ORIGINAL_RECIPIENT_CHANGED');
 return {schema:'jm.m002.cp11.executed-recipient/1',status:'ACTUAL_RECIPIENT_MUTATION',
  medium:spec.medium,identity:spec.subject,choice:spec.choice,
  beforeSha256:sha(before),afterSha256:sha(copy),recipient:copy,
  changed:true,changes,composition:composed,
  receipt:{kind:'CP11_ACTUAL_RECIPIENT_DING',source:'REAL_CP10_NATIVE',
    mutationCount:changes.length,digest:sha({from:before,to:copy,changes})},
  boundary:CP11_RECEIVER_BOUNDARY};
}
