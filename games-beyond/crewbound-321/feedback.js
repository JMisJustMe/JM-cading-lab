/* JM CREWBOUND CP09 · original pilot-specific combat readability.
   Purely visual projection of actual receipts, never an extra combat system.
   All 12 CREWBOUND silhouettes and their kit ownership remain independent
   from COMBOUND. No audio, network, automatic haptics or new permissions. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.JM_CREWBOUND_321_FEEDBACK=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const SHAPES=Object.freeze({
    KEPLER:"wings", IRONVALE:"shock", SOLACE:"ribbons",
    LOCKE:"walls", ASTER:"orbit", NOX:"crosshair",
    STATIC:"bolt", LATCH:"snare", EMBER:"flames",
    WROUGHT:"ram", VIVID:"lance", DASHER:"spiral"
  });
  const MODES=["FULL","QUIET","OFF"];
  const safe=n=>typeof n==="number"&&Number.isFinite(n)?n:0;
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const lookup=(game,name,side)=>{
    const units=game?.units||[];
    return units.find(u=>u.name===name&&(side===undefined||u.team===side))||null;
  };
  const source=(game,rec)=>lookup(game,rec.fighter||rec.from||rec.body,rec.side);
  function eventToEffect(rec,game){
    if(!rec||typeof rec.type!=="string"||!game)return null;
    let u,kind,x,y,label,color,shape;
    if(rec.type==="CONTACT"){
      u=lookup(game,rec.to);
      if(!u)return null;
      kind="contact";x=u.x;y=u.y;label=safe(rec.damage)>0?"−"+Math.round(rec.damage):"BLOCK";
      color=u.team==="player"?"#ff8faa":"#85f9ce";shape="hit";
    }else if(rec.type==="SIGNATURE"){
      u=lookup(game,rec.fighter,rec.side);
      if(!u||!SHAPES[u.key])return null;
      kind="signature";x=u.x;y=u.y;label=String(rec.move||"SIGNATURE").slice(0,26);
      color=u.team==="player"?"#9ff7ff":"#ffc084";shape=SHAPES[u.key];
    }else if(rec.type==="FIGHTER_DOWN"){
      u=lookup(game,rec.body,rec.side);if(!u)return null;
      kind="down";x=u.x;y=u.y;label="KNOCKDOWN";color="#fff1a8";shape="down";
    }else if(rec.type==="YARD_INTERVENTION"){
      u=lookup(game,rec.body,rec.side);if(!u)return null;
      kind="yard";x=u.team==="player"?135:545;y=u.team==="player"?710:130;
      label=u.name+" SUPPORT";color=u.team==="player"?"#8effdb":"#ffb1c6";shape="shield";
    }else if(rec.type==="RELAY_CAPTURE"){
      const z=(game.zones||[]).find(z=>z.id===rec.zone);
      if(!z)return null;
      kind="relay";x=z.x;y=z.y;label=rec.side==="player"?"RELAY SECURED":"RELAY LOST";
      color=rec.side==="player"?"#a7ffcd":"#ff9ea8";shape="orbit";
    }else return null;
    if(!Number.isFinite(x)||!Number.isFinite(y))return null;
    return {kind,x:clamp(x,0,680),y:clamp(y,0,840),label,color,shape,
      body:u?.name||null,ttl:kind==="signature"?1.25:kind==="down"?1.18:.9,age:0};
  }
  function summary(rec){
    if(!rec)return "";
    if(rec.type==="CONTACT")return String(rec.from||"Fighter")+" → "+String(rec.to||"target")+
      " · "+(safe(rec.damage)>0?Math.round(rec.damage)+" damage":"shielded");
    if(rec.type==="SIGNATURE")return String(rec.fighter||"Fighter")+" · "+String(rec.move||"signature");
    if(rec.type==="FIGHTER_DOWN")return String(rec.body||"Fighter")+" knocked down";
    if(rec.type==="YARD_INTERVENTION")return String(rec.body||"Yard fighter")+" assists · "+String(rec.mode||"");
    if(rec.type==="RELAY_CAPTURE")return rec.side==="player"?"Your crew captured a relay":"Rival crew captured a relay";
    if(rec.type==="SIMULTANEOUS_PAIR_COMMIT")return "Go "+rec.turn+" · both crews committed";
    return "";
  }
  function createFeedback(initialMode="FULL"){
    let gameRef=null,logRef=null,seen=new WeakSet(),effects=[],mode=MODES.includes(initialMode)?initialMode:"FULL";
    function observe(game){
      if(!game||!Array.isArray(game.log))return 0;
      // A new match, an imported match, or a rolled-back atomic command:
      // historical events must not be replayed as if they happened just now.
      if(game!==gameRef||game.log!==logRef){
        gameRef=game;logRef=game.log;seen=new WeakSet();effects=[];
        for(const e of game.log)if(e&&typeof e==="object")seen.add(e);
        return 0;
      }
      let added=0;
      for(const rec of game.log){
        if(!rec||typeof rec!=="object"||seen.has(rec))continue;
        seen.add(rec);
        const e=eventToEffect(rec,game);
        if(e&&mode!=="OFF"){effects.push(e);added++}
      }
      if(effects.length>28)effects=effects.slice(-28);
      return added;
    }
    function tick(dt){
      if(!Number.isFinite(dt)||dt<=0)return;
      const step=clamp(dt,0,.075);
      for(const e of effects)e.age+=step;
      effects=effects.filter(e=>e.age<e.ttl);
    }
    function setMode(m){
      if(!MODES.includes(m))return false;
      mode=m;if(mode==="OFF")effects=[];return true;
    }
    function mark(ctx,e){
      const t=clamp(e.age/e.ttl,0,1),full=mode==="FULL";
      const amp=full?1-t:1;
      const rad=full?25+64*t:42;
      const x=e.x,y=e.y;
      ctx.save();ctx.translate(x,y);ctx.globalAlpha=clamp(amp*.95,.01,1);
      ctx.strokeStyle=e.color;ctx.fillStyle=e.color;ctx.lineWidth=e.kind==="signature"?5:3;
      ctx.lineCap="round";ctx.lineJoin="round";
      const circle=(r,start=0,end=Math.PI*2)=>{
        ctx.beginPath();ctx.arc(0,0,r,start,end);ctx.stroke();
      };
      const path=points=>{
        ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
        for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
        ctx.stroke();
      };
      if(e.shape==="wings"){
        path([[-rad,-14],[-rad*.35,-rad*.4],[-12,0],[-rad*.6,rad*.35]]);
        path([[rad,-14],[rad*.35,-rad*.4],[12,0],[rad*.6,rad*.35]]);
      }else if(e.shape==="shock"||e.shape==="ram"){
        circle(rad);circle(rad*.6);
        for(let i=0;i<6;i++){const a=i*Math.PI/3;path([[Math.cos(a)*rad*.65,Math.sin(a)*rad*.65],[Math.cos(a)*rad*1.35,Math.sin(a)*rad*1.35]])}
      }else if(e.shape==="ribbons"){
        for(let i=-1;i<=1;i++){
          const a=i*15;path([[-rad,a-15],[-rad*.55,a+10],[0,a-12],[rad*.5,a+10],[rad,a-8]]);
        }
      }else if(e.shape==="walls"){
        for(let i=-1;i<=1;i++)path([[i*25-13,-rad*.8],[i*25-13,rad*.8],[i*25+13,rad*.8]]);
      }else if(e.shape==="orbit"){
        ctx.save();ctx.rotate(full?t*2.1:0);
        ctx.scale(1,.48);circle(rad);ctx.scale(1,2);circle(rad*.46);ctx.restore();
      }else if(e.shape==="crosshair"){
        circle(rad*.72);
        path([[-rad,0],[-rad*.4,0]]);path([[rad*.4,0],[rad,0]]);
        path([[0,-rad],[0,-rad*.4]]);path([[0,rad*.4],[0,rad]]);
      }else if(e.shape==="bolt"){
        path([[-rad*.42,-rad],[0,-rad*.16],[-rad*.15,rad*.13],[rad*.48,rad],[-rad*.03,rad*.15],[rad*.15,-rad*.16]]);
      }else if(e.shape==="snare"){
        for(let i=-1;i<=1;i++)path([[-rad,i*15],[rad,i*15]]);
        for(let i=-1;i<=1;i++)path([[i*15,-rad],[i*15,rad]]);
      }else if(e.shape==="flames"){
        for(let i=-2;i<=2;i++)path([[i*14,rad*.35],[i*14-11,-rad*.12],[i*14+8,-rad],[i*14+12,rad*.35]]);
      }else if(e.shape==="lance"){
        path([[-rad,rad*.3],[rad,-rad*.3]]);
        path([[rad*.3,-rad*.6],[rad,-rad*.3],[rad*.45,rad*.3]]);
      }else if(e.shape==="spiral"){
        ctx.beginPath();
        for(let i=0;i<=32;i++){const a=i*.36,r=rad*i/32;const xx=Math.cos(a)*r,yy=Math.sin(a)*r;
          if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy)}
        ctx.stroke();
      }else if(e.shape==="shield"){
        circle(rad*.72);path([[-rad*.45,0],[0,rad*.37],[rad*.45,-rad*.38]]);
      }else if(e.shape==="down"){
        circle(rad);path([[-rad*.38,-rad*.38],[rad*.38,rad*.38]]);
        path([[rad*.38,-rad*.38],[-rad*.38,rad*.38]]);
      }else{
        circle(rad);
      }
      // Labels are placed in canvas coordinates and remain legible at
      // ~360px viewport (font is 28px on 680px world width).
      ctx.font="900 25px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.shadowColor="#06101c";ctx.shadowBlur=6;
      ctx.fillStyle=e.kind==="contact"?e.color:"#fff5db";
      const text=String(e.label).slice(0,28);
      const tx=clamp(0,28-e.x,650-e.x);
      const ty=e.kind==="signature"?-rad-28:-rad-18;
      ctx.fillText(text,tx,ty);
      ctx.restore();
    }
    function paint(ctx){
      if(mode==="OFF"||!ctx||typeof ctx.save!=="function")return;
      for(const e of effects)mark(ctx,e);
    }
    return {
      observe,tick,paint,setMode,
      mode:()=>mode,
      count:()=>effects.length,
      snapshot:()=>effects.map(e=>({...e}))
    };
  }
  return {SHAPES,MODES,eventToEffect,summary,createFeedback};
});