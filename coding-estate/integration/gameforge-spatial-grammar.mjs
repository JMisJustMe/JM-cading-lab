// JM GameForge Spatial Grammar v0.1.
// An additive *scene-geometry recipient* for the protected GameForge Spaces state.
// Only recovered JM Actual Engine primitives are used; no new game authority.
// Deliberately pure so the exact same body can be inlined in standalone/APK HTML.
export function buildJMSpatialRoom(room,session,object,point){
  if(!room||!['burning','humanimals','tboys'].includes(room.body)||
     !Array.isArray(room.walls)||!Array.isArray(room.doors)||
     !session||!Array.isArray(session.opened)||!Array.isArray(session.collected)||
     typeof object!=='function'||typeof point!=='function')throw Error('JM_SPATIAL_GRAMMAR_INPUT_HOLD');
  const palettes={
    burning:{ground:'#503b36',tile:'#74433b',line:'#d98655',metal:'#a26b50',light:'#ffae68'},
    humanimals:{ground:'#244b40',tile:'#326f5a',line:'#82d1aa',metal:'#447963',light:'#b7ffd1'},
    tboys:{ground:'#213a57',tile:'#285677',line:'#63b8ff',metal:'#517ca2',light:'#8ddcff'}
  };
  const colors=palettes[room.body],models=[],features={body:room.body,doorCount:room.doors.length,wallCount:room.walls.length,powered:!!session.progress?.powered?.includes(room.id),motifCount:0};
  const add=(...args)=>models.push(object(...args));
  const p=point;
  // Repeated ground geometry is physical depth and orientation, not a flat image cover.
  add('cube',0,-.40,0,25.8,.42,16.6,colors.ground);
  add('cube',0,-.045,0,25.1,.045,16.1,colors.tile);
  for(let x=-4;x<=4;x++)add('cube',x*5.5,.012,0,.034,.020,15.65,colors.line,.09);
  for(let z=-2;z<=2;z++)add('cube',0,.014,z*5.4,24.7,.020,.030,colors.line,.09);
  for(const side of [-1,1])for(let i=-2;i<=1;i++)
    add('cube',i*11+5.5,.036,side*12.4,2.4,.026,.14,colors.light,.20);
  for(const sg of [-1,1]){
    add('cube',sg*25.1,.35,0,.24,.35,16.0,colors.metal);
    add('cube',0,.35,sg*16.1,25.0,.35,.24,colors.metal);
    for(let n=-3;n<=3;n++){
      add('cube',sg*24.9,.89,n*4.1,.17,.18,.17,colors.light,.50);
    }
  }
  // Authoritative walls and traversable door mouths are projected from 2D collision/route state.
  for(const wall of room.walls){
    const q=p(wall.x+wall.w/2,wall.y+wall.h/2);
    add('cube',q.x,1.34,q.z,wall.w/36,1.34,wall.h/36,colors.metal);
    add('cube',q.x,2.72,q.z,wall.w/36+.10,.10,wall.h/36+.10,colors.line,.24);
  }
  for(const door of room.doors){
    const q=p(door.x,door.y),open=session.opened.includes(door.edge);
    const tint=open?'#79ffd0':'#f1bb79';
    for(const side of [-1,1])add('cube',q.x+side*.83,1.58,q.z,.17,1.58,.38,tint,.20);
    add('cube',q.x,3.17,q.z,1.04,.18,.38,tint,.25);
    add('ring',q.x,.07,q.z,1.23,.12,1.23,tint,.28);
    if(open)add('hex',q.x,2.75,q.z,.27,.20,.27,'#9affd7',.9);
  }
  // Relays are the SAME world-state objective in both 2D and perspective.
  const relay=p(650,450);
  add('cube',relay.x,.30,relay.z,1.43,.28,1.43,colors.metal);
  add('ring',relay.x,.67,relay.z,1.12,.09,1.12,features.powered?'#7fffc3':'#b9a36b',features.powered?.86:.26);
  add('hex',relay.x,1.08,relay.z,.66,.55,.66,features.powered?'#64ffd1':'#d29f6a',features.powered?.96:.18);
  // Three different structural grammars: silhouettes, not just colour swaps.
  if(room.body==='burning'){
    // Furnace quads, stacks and illuminated cooling arteries surround the active play lanes.
    for(const [x,z] of [[-20,-12],[19,-12],[-20,11],[19,11]]){
      add('cube',x,.75,z,2.1,.75,1.5,'#693b37');
      add('cylinder',x,2.65,z,.51,1.35,.51,'#b17055');
      add('octa',x,4.28,z,.73,.70,.73,'#ff9854',.80);
      add('cube',x+1.3,.15,z,1.4,.15,.18,'#e17d4d',.37);
      features.motifCount+=4;
    }
    for(let i=0;i<5;i++){const x=-14+i*7;add('cube',x,.035,-10,.11,.045,4.0,'#ff8759',.28);features.motifCount++;}
  }else if(room.body==='humanimals'){
    // Trees, branching shelter and bioluminescent crowns visibly define a living hall.
    for(const [x,z] of [[-20,-11],[19,-11],[-19,11],[19,11]]){
      add('cylinder',x,1.35,z,.38,1.35,.38,'#6b8869');
      add('hex',x,3.15,z,1.80,.95,1.65,'#488e70');
      add('octa',x,4.20,z,1.40,1.45,1.40,'#76d9a7',.12);
      add('sphere',x,5.20,z,.42,.42,.42,'#b0ffd0',.48);
      features.motifCount+=4;
    }
    for(let i=0;i<5;i++){const x=-14+i*7;add('octa',x,.36,-12,.45,.50,.45,'#8dceab',.25);features.motifCount++;}
  }else{
    // Data spires, stacked terminals and suspended energy diamonds, visibly technological.
    for(const [x,z] of [[-20,-11],[19,-11],[-20,11],[19,11]]){
      add('cube',x,1.6,z,1.05,1.6,1.05,'#37547c');
      add('cube',x,3.45,z,1.24,.21,1.24,'#69bdf9',.26);
      add('hex',x,4.30,z,.67,.68,.67,'#8cdbff',.65);
      add('ring',x,5.2,z,1.15,.12,1.15,'#67c9ff',.47);
      features.motifCount+=4;
    }
    for(let i=0;i<5;i++){const x=-14+i*7;add('cube',x,.055,11,.14,.06,4.4,'#5bacf0',.38);features.motifCount++;}
  }
  if(models.length<48||features.motifCount<20)throw Error('JM_SPATIAL_GRAMMAR_EMPTY_HOLD');
  return {models,features,signature:room.body+':'+room.id+':'+Number(features.powered)+':'+session.opened.join('|')};
}
