// JM GameForge Encounter /1. Optional native gameplay contact.
// GameForge retains player input, positions, movement, collision and room source.
// This descendant operates only on an explicit player's "Engage" action.
// Its typed state travels inside the existing signed GameForge world snapshot.
export function GameForgeEncounter(){
  const spawn=[[735,190],[755,170],[745,195]];
  const fresh=()=>({schema:'jm.gameforge.encounter/1',shield:4,wins:[],
    rooms:spawn.map(([x,y])=>({phase:'idle',x,y,hp:3,cooldown:0,stun:0,attackDelay:1}))});
  const phase=['idle','active','won','lost'];
  function validate(s){
    if(!s.encounter)return true;const e=s.encounter;
    const finite=(v,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;
    if(e.schema!=='jm.gameforge.encounter/1'||!Number.isInteger(e.shield)||e.shield<0||e.shield>4||
      !Array.isArray(e.wins)||new Set(e.wins).size!==e.wins.length||e.wins.some(n=>!Number.isInteger(n)||n<0||n>2)||
      !Array.isArray(e.rooms)||e.rooms.length!==3)throw Error('JM_ENCOUNTER_SCHEMA_HOLD');
    e.rooms.forEach((r,i)=>{
      if(!r||!phase.includes(r.phase)||!Number.isInteger(r.hp)||r.hp<0||r.hp>3||
        !finite(r.x,900)||!finite(r.y,570)||!finite(r.cooldown,3)||!finite(r.stun,3)||!finite(r.attackDelay,3)||
        (r.phase==='won')!==(e.wins.includes(i))||(r.phase==='won'&&r.hp!==0)||
        (r.phase==='active'&&r.hp===0)||(r.phase==='lost'&&r.hp<=0))
        throw Error('JM_ENCOUNTER_STATE_HOLD');
    });
    return true;
  }
  function ensure(s){if(!s.encounter)s.encounter=fresh();validate(s);return s.encounter;}
  function view(s){const e=s.encounter;return !e?{phase:'idle',shield:4,wins:[],guardian:{...fresh().rooms[s.active]}}:{
    phase:e.rooms[s.active].phase,shield:e.shield,wins:e.wins.slice(),
    guardian:{...e.rooms[s.active]}
  }}
  function engage(s,player,free){
    const e=ensure(s),r=e.rooms[s.active];
    if(r.phase==='won')return {kind:'encounter-already-won'};
    if(r.phase==='active')return {kind:'encounter-already-active'};
    let [x,y]=spawn[s.active];
    if(player&&typeof free==='function'){
      const candidates=[[player.x+140,player.y],[player.x-140,player.y],
        [player.x,player.y-140],[player.x,player.y+140]];
      const near=candidates.find(q=>free(q[0],q[1],20));
      if(near)[x,y]=near;
    }
    Object.assign(r,{phase:'active',x,y,hp:3,cooldown:0,stun:0,attackDelay:1});
    e.shield=4;return {kind:'encounter-started',room:s.active};
  }
  function pulse(s,player){
    const e=ensure(s),r=e.rooms[s.active];
    if(r.phase!=='active')return {kind:'encounter-inactive'};
    if(r.cooldown>0)return {kind:'pulse-cooling',cooldown:r.cooldown};
    r.cooldown=.65;
    const distance=Math.hypot(player.x-r.x,player.y-r.y);
    if(distance>160)return {kind:'pulse-miss',distance};
    r.hp--;r.stun=.50;
    if(r.hp===0){r.phase='won';e.wins.push(s.active);e.shield=Math.min(4,e.shield+1);
      return {kind:'encounter-won',room:s.active,wins:e.wins.length};}
    return {kind:'pulse-hit',hp:r.hp};
  }
  function step(s,player,dt,free){
    if(!s.encounter)return null;
    const e=s.encounter,r=e.rooms[s.active];
    if(r.phase!=='active')return null;
    dt=Math.min(.04,Math.max(0,dt));r.cooldown=Math.max(0,r.cooldown-dt);
    r.stun=Math.max(0,r.stun-dt);r.attackDelay=Math.max(0,r.attackDelay-dt);
    const dx=player.x-r.x,dy=player.y-r.y,d=Math.hypot(dx,dy);
    if(r.stun===0&&d>46&&d<440){
      const v=105*dt,nx=r.x+dx/d*v,ny=r.y+dy/d*v;
      if(free(nx,r.y,20))r.x=nx;
      if(free(r.x,ny,20))r.y=ny;
    }
    if(d<54&&r.attackDelay===0){
      e.shield--;r.attackDelay=1.1;
      if(e.shield<=0){e.shield=0;r.phase='lost';return {kind:'encounter-lost',room:s.active};}
      return {kind:'guardian-hit',shield:e.shield};
    }
    return null;
  }
  return {fresh,validate,ensure,view,engage,pulse,step};
}
