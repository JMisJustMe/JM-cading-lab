/* CREWBOUND CP02 — original twelve-character canvas costume system.
   Fighter silhouettes are crew-scale humanoid/pilot silhouettes, NOT COMBOUND creatures.
   No external artwork, image assets or font dependencies. */
(function(root){
"use strict";
function draw(ctx,f,x=0,y=0,size=68,time=0,team="player"){
 if(!f)return;
 const [primary,dark,accent]=f.palette,who=f.silhouette,scale=size/72;
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
 const bob=Math.sin(time*2+(f.cp01_proposed_speed||100)/16)*1.5;
 ctx.translate(0,bob);
 function stroke(color="#081421",w=3){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineJoin="round";ctx.lineCap="round"}
 function path(pts,fill,outline="#081421",w=2.6){
  ctx.beginPath();pts.forEach(([xx,yy],i)=>i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy));ctx.closePath();
  ctx.fillStyle=fill;ctx.fill();if(outline){stroke(outline,w);ctx.stroke()}
 }
 function ell(x,y,rx,ry,fill,outline="#081421",w=2){
  ctx.beginPath();ctx.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,Math.PI*2);
  if(fill){ctx.fillStyle=fill;ctx.fill()}if(outline){stroke(outline,w);ctx.stroke()}
 }
 function line(pts,color=accent,w=3){
  ctx.beginPath();pts.forEach(([xx,yy],i)=>i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy));
  stroke(color,w);ctx.stroke();
 }
 function rect(x,y,w,h,fill,r=3){
  ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();stroke(dark,1.8);ctx.stroke();
 }
 ctx.shadowColor=primary;ctx.shadowBlur=10;
 ell(0,32,24,5,"#06111c88",null);
 // Motion/readable equipment behind the character: unique to the cast identity.
 switch(who){
  case "glider":
   path([[-10,-13],[-42,-27],[-33,2],[-13,11]],accent);
   path([[10,-13],[42,-27],[33,2],[13,11]],primary);
   line([[-33,-20],[-20,-11],[-14,2]],dark,3);line([[33,-20],[20,-11],[14,2]],dark,3);
   break;
  case "anvil":
   rect(-37,-13,21,29,dark,7);rect(17,-13,21,29,dark,7);
   path([[-38,-15],[-24,-34],[-8,-21]],accent);
   path([[38,-15],[24,-34],[8,-21]],accent);
   break;
  case "ribbon":
   line([[-13,-13],[-31,-27],[-38,-9],[-25,15],[-42,25]],primary,7);
   line([[13,-12],[29,-32],[43,-11],[29,12],[43,31]],accent,5);
   break;
  case "sentinel":
   path([[-30,-19],[-18,-34],[-8,-12],[-14,28],[-31,17]],primary);
   path([[16,-14],[43,-15],[40,28],[18,27]],dark);
   break;
  case "astral":
   ell(0,-3,37,32,null,accent,4);
   ell(0,-3,32,38,null,primary,2);
   ell(-32,-14,5,5,accent,null);ell(31,11,4,4,primary,null);
   break;
  case "marksman":
   path([[-6,-18],[-26,-36],[-33,33],[-8,16]],dark);
   path([[6,-18],[26,-30],[31,21],[10,15]],primary);
   break;
  case "jester":
   path([[-12,-15],[-34,-40],[-24,-5]],primary);
   path([[12,-15],[38,-38],[22,-3]],accent);
   line([[-35,18],[-22,4],[-41,-4]],accent,5);
   break;
  case "grappler":
   ell(-32,9,11,13,null,primary,4);ell(-32,9,5,6,dark,null);
   line([[-25,6],[-40,-13],[-15,-24],[27,-10]],accent,3.5);
   break;
  case "drummer":
   ell(-27,11,14,14,primary,accent,4);ell(27,11,14,14,primary,accent,4);
   ell(-27,11,5,5,dark,null);ell(27,11,5,5,dark,null);
   line([[-27,-8],[-37,-30]],accent,4);line([[27,-8],[39,-28]],accent,4);
   break;
  case "juggernaut":
   path([[-41,-27],[-16,-30],[-21,19],[-39,21]],dark);
   path([[41,-27],[16,-30],[21,19],[39,21]],dark);
   rect(-30,-33,60,18,primary,6);
   break;
  case "lancer":
   line([[20,26],[35,-9],[38,-42]],accent,5);
   path([[38,-53],[49,-30],[30,-30]],primary);
   path([[-15,-13],[-34,3],[-15,12]],dark);
   break;
  case "rider":
   ell(0,31,17,12,dark,primary,5);
   ell(0,31,7,7,accent,null);
   path([[-18,-4],[-38,14],[-27,23],[-12,11]],accent);
   break;
 }
 // Articulated legs. Each character is visibly a person/pilot, not a COMBOUND symbol.
 const stride=who==="rider"?9:who==="juggernaut"?17:13;
 path([[-13,14],[-2,15],[-6,32],[-20,35],[-23,30]],dark);
 path([[2,15],[13,14],[22,30],[20,35],[6,32]],dark);
 rect(-25,29,20,8,who==="anvil"?accent:primary,3);
 rect(6,29,21,8,who==="juggernaut"?accent:primary,3);
 // Main humanoid costume/chest.
 const thick=who==="anvil"||who==="juggernaut"?24:who==="sentinel"?20:17;
 path([[-thick,-21],[thick,-21],[thick-2,18],[0,24],[-thick+2,18]],dark);
 path([[-thick+4,-18],[thick-4,-18],[thick-5,12],[0,18],[-thick+5,12]],primary);
 line([[-8,-16],[0,-7],[8,-16]],accent,3);
 if(who==="sentinel"||who==="juggernaut")rect(-10,0,20,12,accent,3);
 if(who==="astral"||who==="drummer")ell(0,0,9,8,accent,dark,2);
 if(who==="ribbon")line([[-14,-10],[9,10],[-7,17]],accent,5);
 if(who==="lancer")rect(-3,-5,6,20,accent,2);
 if(who==="marksman")line([[-15,-10],[16,13]],accent,4);
 if(who==="jester")path([[-10,-10],[4,-17],[13,3],[-3,13]],accent);
 if(who==="grappler")ell(0,1,9,8,accent,dark,3);
 if(who==="glider")path([[-10,0],[0,-12],[10,0],[0,12]],accent);
 if(who==="rider")line([[-12,12],[16,-8]],accent,5);
 // Individual shoulders and arms.
 ctx.shadowBlur=0;
 const arm=who==="anvil"||who==="juggernaut"?11:who==="grappler"?9:7;
 rect(-thick-arm+5,-14,arm+3,22,dark,4);rect(thick-7,-14,arm+3,22,dark,4);
 ell(-thick-1,13,arm*.62,7,accent,dark,2);ell(thick+1,13,arm*.62,7,accent,dark,2);
 // Head and signature headwear. Helmet proportions vary per costume.
 const headSize=who==="juggernaut"?15:who==="anvil"?15:who==="jester"?11:13;
 ell(0,-29,headSize,16,dark,accent,2.8);
 switch(who){
  case "glider":path([[-18,-39],[0,-56],[18,-39],[11,-28],[-11,-28]],primary);break;
  case "anvil":rect(-17,-40,34,9,accent,4);rect(-11,-54,22,9,primary,2);break;
  case "ribbon":line([[-12,-37],[-23,-45],[-31,-35]],primary,5);break;
  case "sentinel":rect(-16,-44,32,12,primary,2);rect(-6,-51,12,8,accent,2);break;
  case "astral":ell(0,-49,22,7,null,accent,4);ell(0,-51,4,4,primary,null);break;
  case "marksman":path([[-18,-32],[-19,-47],[0,-57],[19,-47],[17,-32]],primary);break;
  case "jester":path([[-13,-42],[-19,-56],[-3,-46],[5,-57],[16,-42]],primary);break;
  case "grappler":rect(-18,-43,36,11,accent,4);break;
  case "drummer":ell(0,-43,15,8,primary,dark,2);break;
  case "juggernaut":rect(-20,-41,40,22,primary,5);rect(-16,-52,32,11,dark,4);break;
  case "lancer":path([[-15,-39],[-4,-55],[11,-48],[18,-30]],primary);break;
  case "rider":path([[-18,-44],[20,-44],[27,-33],[8,-29],[-18,-31]],primary);break;
 }
 // Eye visor distinguishes tactical characters and avoids reuse of creature-face shapes.
 rect(-11,-34,22,8,who==="jester"?accent:"#071829",4);
 line([[-9,-30],[8,-30]],accent,2.2);
 if(who==="marksman")ell(10,-30,5,5,accent,dark,2);
 if(who==="lancer")line([[12,-29],[24,-32]],accent,2);
 if(who==="glider")line([[16,-45],[27,-54]],accent,3);
 ctx.restore();
}
const api={draw};
if(typeof module==="object"&&module.exports)module.exports=api;
root.JM_CREWBOUND_321_ART=api;
})(typeof globalThis!=="undefined"?globalThis:this);
