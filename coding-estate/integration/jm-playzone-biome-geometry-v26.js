/* JM PlayZone v2.6 — distinct procedural biome geometry organ.
   Source: existing PlayZone world, JM Actual Engine primitive geometry.
   Reusable scene-layer enhancement. No imported meshes, textures or frameworks.
   The callback add() belongs to the engine generator, not a new renderer.
*/
(function(root){'use strict';
const V='2.6.0',palettes={
 forest:{a:'#315c52',b:'#478c6d',c:'#7df2b7',d:'#dffbe8',e:'#a57eaa'},
 desert:{a:'#78513b',b:'#aa7350',c:'#efd298',d:'#ffedba',e:'#ce8f61'},
 ice:{a:'#315475',b:'#5a9cbb',c:'#b7eaff',d:'#e3ffff',e:'#729ad4'},
 void:{a:'#43335a',b:'#8660a7',c:'#e2a7fa',d:'#ffdeef',e:'#ec8fce'}
};
function enrich(add,zone,seed){
 if(typeof add!=='function'||!palettes[zone?.biome])throw Error('JM_PZ26_BIOME_INVALID');
 const p=palettes[zone.biome];let s=(seed^0x5EEDBEEF)>>>0;
 const random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296};
 let count=0;const put=(...args)=>{add(...args);count++};
 const ring=(i,N,r=9.5)=>{const a=i/N*Math.PI*2+(random()-.5)*.12;return{x:Math.sin(a)*r,z:Math.cos(a)*r,ang:a}};
 for(let i=0;i<22;i++){
  const at=ring(i,22,7.8+random()*2.0),x=at.x,z=at.z;
  // Keep routes into central objectives and near the initial pilot navigable.
  if(x>4&&z>4)continue;
  if(zone.biome==='forest'){
    const h=2.0+random()*2.4;
    put('cylinder',x,h*.37,z,.22,h*.43,.22,p.a);
    for(let k=0;k<3;k++){
      const a=k*2.1+i*.37,bx=x+Math.cos(a)*.62,bz=z+Math.sin(a)*.62;
      put('cylinder',bx,h*.73,bz,.12,h*.25,.12,p.a);
      put('octa',bx,h*1.14,bz,.62,.80,.62,k===0?p.c:p.b,.16);
    }
    put('sphere',x,h*1.20,z,.30,.31,.30,p.d,.26);
    if(i%3===0){for(let m=0;m<3;m++){let a=m*2.09;put('cylinder',x+Math.cos(a)*1.8,.18,z+Math.sin(a)*1.8,.36,.15,.36,p.a);put('sphere',x+Math.cos(a)*1.8,.4,z+Math.sin(a)*1.8,.27,.20,.27,p.e,.34)}}
  }else if(zone.biome==='desert'){
    const h=1.0+random()*2.9;
    put('octa',x,h*.55,z,.55+random()*.42,h*.74,.54,p.b,.03,i*.43);
    put('cylinder',x,h+.25,z,.30,.06,.30,p.c,.25);
    if(i%4===0){
     for(const offset of [-.9,.9])put('cube',x+offset,1.4,z,.26,1.4,.27,p.a);
     put('cube',x,2.65,z,1.15,.27,.28,p.e,.04);
     put('ring',x,2.8,z,1.25,.055,1.25,p.d,.36);
    }
    for(let k=0;k<3;k++){const t=k*2.1,ax=x+Math.sin(t)*.9,az=z+Math.cos(t)*.9;
      put('cube',ax,.015,az,.9,.035,.26,k%2?p.e:p.c,.03,(k+i)*.63)}
  }else if(zone.biome==='ice'){
    const h=1.7+random()*3.3;
    put('octa',x,h*.47,z,.45,h*.53,.45,p.c,.18);
    put('octa',x+.75,h*.32,z-.31,.28,h*.33,.28,p.d,.38);
    put('octa',x-.60,h*.28,z+.15,.25,h*.34,.25,p.b,.05);
    put('cylinder',x,.04,z,1.0,.055,1.0,p.a,.04);
    if(i%3===0){put('ring',x,h*.4,z,1.22,.06,1.22,p.d,.60);put('sphere',x,h*1.04,z,.25,.27,.25,p.d,.85)}
  }else if(zone.biome==='void'){
    const h=1.6+random()*4.1;
    put('hex',x,h*.5,z,.46,h*.51,.46,p.a,.25,i*.21);
    put('octa',x,h+1.2,z,.48,.88,.48,p.c,.92);
    put('ring',x,h+.10,z,.91,.06,.91,p.e,.68);
    if(i%2===0)put('ring',x,1.1,z,1.45,.025,1.45,p.c,.63);
    for(let q=0;q<3;q++){const a=q*2.09+i*.12;put('sphere',x+Math.cos(a)*1.0,h+1.1,z+Math.sin(a)*1.0,.11,.11,.11,p.d,1.1)}
  }
 }
 // A distinct destination monument, offset from the central PlayZone landmark.
 const sx=-7,sz=-6;
 if(zone.biome==='forest'){
   for(const [x,z] of [[sx,sz],[sx+2,sz],[sx+1,sz-1.5]])put('cube',x,1.05,z,.35,1.05,.35,p.a);
   put('cube',sx+1,2.3,sz-.4,2.1,.35,.55,p.e,.12);
   put('ring',sx+1,2.8,sz-.4,1.1,.04,1.1,p.c,.45);
 }else if(zone.biome==='desert'){
   for(let t=0;t<4;t++)put('cube',sx,.2+t*.43,sz,2.0-t*.39,.22,2.0-t*.39,t%2?p.b:p.e);
   put('octa',sx,2.2,sz,.55,1.0,.55,p.d,.30);
 }else if(zone.biome==='ice'){
   for(let k=0;k<6;k++){let a=k*Math.PI/3;put('octa',sx+Math.cos(a)*1.8,1.6,sz+Math.sin(a)*1.8,.46,1.72,.46,k%2?p.c:p.b,.37)}
   put('ring',sx,2.9,sz,2.0,.055,2.0,p.d,.75);
 }else{
   for(let k=0;k<5;k++){let a=k*Math.PI*2/5;put('octa',sx+Math.cos(a)*1.5,1.6,sz+Math.sin(a)*1.5,.28,1.2,.28,p.b,.65)}
   put('ring',sx,2.8,sz,2.2,.07,2.2,p.d,.95);
   put('octa',sx,2.6,sz,.9,2.0,.9,p.c,1.0);
 }
 return {schema:'jm.playzone.biome-geometry/2.6',biome:zone.biome,objectsAdded:count,seed,source:'JM PlayZone + JM Actual Engine primitives'};
}
const API=Object.freeze({version:V,enrich,palettes});root.JMPlayZoneBiomeGeometry=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
