export function stable(value){
  if(value===null||typeof value!=='object') return JSON.stringify(value);
  if(Array.isArray(value)) return '['+value.map(stable).join(',')+']';
  return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
}

export function hash(value){
  const text=typeof value==='string'?value:stable(value);
  let h=2166136261;
  for(const ch of text){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
  return (h>>>0).toString(16).padStart(8,'0');
}

export const clone=value=>JSON.parse(JSON.stringify(value));

export const ENGINE_PROFILES={
  glyphplay:{id:'glyphplay',name:'GlyphPlay',verbs:['MOVE','ACT'],law:'creator-stage-interaction-playtest'},
  gameforge:{id:'gameforge',name:'GameForge',verbs:['COMPILE','TEST'],law:'game-body-build-graph-cartridge'},
  glyphforge:{id:'glyphforge',name:'GlyphForge',verbs:['PULL','PITCH','FIRE','FLING'],law:'asset-input-action-adapter'},
  playform:{id:'playform',name:'PLAYFORM',verbs:['STEP','REPEAT'],law:'expression-repeatable-play-loop'},
  kading:{id:'kading',name:'Kading Game Estate Engine',verbs:['COMPILE','RUN'],law:'kading-source-game-ir-runtime'}
};

export const BODY_TRIALS={
  cading:['MARK','SIGNAL','ROUTE','STATE','TRACE'],
  quadze:['QUARTER_A','QUARTER_B','QUARTER_C','QUARTER_D','CENTRE'],
  recorp:['SCATTER','RECOGNISE','RECOVER','REGROUP','LOCK'],
  flowtalk:['CONTEXT','CONTACT','RESPONSE','MEANING','NEXT'],
  formeula:['FORMULA','VISIBLE_FORM','MOVEMENT','OUTPUT','REPEAT']
};
