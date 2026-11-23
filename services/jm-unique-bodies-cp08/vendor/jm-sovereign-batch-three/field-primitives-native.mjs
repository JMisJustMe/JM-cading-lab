import { Trace, applyAction, blocks, evalCondition, evalFormula, need, parseAction, setPath, splitTop, valueOf } from './native-core.mjs';

function regexFrom(raw) {
  const match = String(raw).match(/^\/([\s\S]*)\/([gimsuy]*)$/);
  need(match, 'TOKEN_BAD_REGEX', `Expected /pattern/flags, got ${raw}.`);
  const flags = match[2].replace('g','');
  return new RegExp(`^(?:${match[1]})`, flags);
}

export const TokenBody = {
  parse(source) {
    const defs = [];
    for (const raw of String(source).split(/\r?\n/).map(line=>line.trim()).filter(Boolean)) {
      let match = raw.match(/^token\s+([A-Za-z_][\w.-]*)\s+(\/.*\/[gimsuy]*)$/);
      if (match) { defs.push({type:'token',name:match[1],pattern:match[2],regex:regexFrom(match[2])}); continue; }
      match = raw.match(/^skip\s+([A-Za-z_][\w.-]*)\s+(\/.*\/[gimsuy]*)$/);
      if (match) { defs.push({type:'skip',name:match[1],pattern:match[2],regex:regexFrom(match[2])}); continue; }
      throw Object.assign(new Error(`Invalid TokenBody declaration ${raw}`),{code:'TOKEN_BAD_DECL'});
    }
    need(defs.some(def=>def.type==='token'),'TOKEN_NO_TOKENS','TokenBody requires token declarations.');
    return {type:'TokenBodyProgram',defs};
  },
  lower(ast) {
    return {type:'TokenAutomaton',states:ast.defs.map((def,index)=>({id:index,kind:def.type,name:def.name,pattern:def.pattern})),priority:ast.defs.map(def=>def.name)};
  },
  execute(source, input) {
    const ast=this.parse(source), ir=this.lower(ast), trace=new Trace('TokenBody'), tokens=[];
    let rest=String(input), offset=0;
    while(rest.length){
      let matched=null;
      for(const def of ast.defs){
        const found=rest.match(def.regex);
        if(found && found[0].length){ matched={def,text:found[0]}; break; }
      }
      need(matched,'TOKEN_NO_MATCH',`No token matched at offset ${offset}.`,{rest});
      trace.emit('lexeme.matched',{name:matched.def.name,type:matched.def.type,text:matched.text,offset});
      if(matched.def.type==='token') tokens.push({type:matched.def.name,value:matched.text,offset});
      offset+=matched.text.length; rest=rest.slice(matched.text.length);
    }
    return {ast,ir,tokens,trace:trace.events,receipt:trace.receipt('tokenise source with body-defined lexical priority',tokens)};
  }
};

export const PunctBody = {
  parse(source) {
    const puncts=[], sequences=[];
    for(const raw of String(source).split(/\r?\n/).map(line=>line.trim()).filter(Boolean)){
      let match=raw.match(/^punct\s+([A-Za-z_][\w.-]*)\s+("(?:\\.|[^"])*"|'(?:\\.|[^'])*')\s+effect=([A-Za-z_][\w.-]*)$/);
      if(match){ puncts.push({name:match[1],symbol:valueOf(match[2]),effect:match[3]}); continue; }
      match=raw.match(/^sequence\s+([A-Za-z_][\w.-]*)\s*=\s*\[([^\]]*)\]$/);
      if(match){ sequences.push({name:match[1],members:splitTop(match[2]).map(valueOf).map(String)}); continue; }
      throw Object.assign(new Error(`Invalid PunctBody declaration ${raw}`),{code:'PUNCT_BAD_DECL'});
    }
    need(puncts.length,'PUNCT_NONE','PunctBody requires punctuation declarations.');
    const names=new Set(puncts.map(p=>p.name));
    sequences.forEach(seq=>seq.members.forEach(member=>need(names.has(member),'PUNCT_UNKNOWN_MEMBER',`${seq.name} uses ${member}.`)));
    return {type:'PunctBodyProgram',puncts,sequences};
  },
  lower(ast){
    return {type:'PunctEffectGraph',nodes:ast.puncts.map(p=>({id:`punct:${p.name}`,...p})).concat(ast.sequences.map(s=>({id:`sequence:${s.name}`,...s}))),edges:ast.sequences.flatMap(s=>s.members.map(m=>({from:`punct:${m}`,to:`sequence:${s.name}`,kind:'member'})))};
  },
  execute(source,input){
    const ast=this.parse(source),ir=this.lower(ast),trace=new Trace('PunctBody'),events=[];
    const defs=[...ast.puncts].sort((a,b)=>String(b.symbol).length-String(a.symbol).length);
    let index=0,text=String(input);
    while(index<text.length){
      const def=defs.find(item=>text.startsWith(String(item.symbol),index));
      if(def){ const event={index,name:def.name,symbol:def.symbol,effect:def.effect};events.push(event);trace.emit('punct.applied',event);index+=String(def.symbol).length; }
      else index+=1;
    }
    return {ast,ir,events,completed:events.some(event=>event.effect==='complete'),trace:trace.events,receipt:trace.receipt('turn punctuation into operational effects',events)};
  }
};

export const GlyphBody = {
  parse(source){
    const glyphs=[];
    for(const raw of String(source).split(/\r?\n/).map(line=>line.trim()).filter(Boolean)){
      const match=raw.match(/^glyph\s+([A-Za-z_][\w.-]*)\s+("(?:\\.|[^"])*"|'(?:\\.|[^'])*')\s+pressure=([A-Za-z_][\w.-]*)\s+route=([A-Za-z_][\w.-]*)$/);
      need(match,'GLYPH_BAD_DECL',`Invalid GlyphBody declaration ${raw}.`);
      glyphs.push({name:match[1],symbol:valueOf(match[2]),pressure:match[3],route:match[4]});
    }
    need(glyphs.length,'GLYPH_NONE','GlyphBody requires glyphs.');
    need(new Set(glyphs.map(g=>g.symbol)).size===glyphs.length,'GLYPH_DUPLICATE_SYMBOL','Glyph symbols must be unique.');
    return {type:'GlyphBodyProgram',glyphs};
  },
  lower(ast){return {type:'GlyphPressureGraph',nodes:ast.glyphs.map(g=>({id:`glyph:${g.name}`,...g})),edges:ast.glyphs.map(g=>({from:`glyph:${g.name}`,to:`route:${g.route}`,kind:g.pressure}))};},
  execute(source,symbol){
    const ast=this.parse(source),ir=this.lower(ast),trace=new Trace('GlyphBody');
    const glyph=ast.glyphs.find(candidate=>candidate.symbol===symbol);
    need(glyph,'GLYPH_UNKNOWN',`Unknown glyph ${symbol}.`);
    const state={glyph:glyph.name,symbol:glyph.symbol,pressure:glyph.pressure,nextRoute:glyph.route};
    trace.emit('glyph.read',state);
    return {ast,ir,state,trace:trace.events,receipt:trace.receipt('read glyph pressure into route action',state)};
  }
};

export const RouteFrame = {
  parse(source){
    const frames=blocks(source,'frame').map(block=>{
      let entry=null;const steps=[];
      for(const line of String(block.body).split(/\r?\n/).map(v=>v.trim()).filter(Boolean)){
        let m=line.match(/^entry\s+([A-Za-z_][\w.-]*)$/); if(m){entry=m[1];continue;}
        m=line.match(/^step\s+([A-Za-z_][\w.-]*)\s+goto\s+([A-Za-z_][\w.-]*)$/);
        if(m){steps.push({name:m[1],kind:'goto',target:m[2]});continue;}
        m=line.match(/^step\s+([A-Za-z_][\w.-]*)\s+when\s+(.+?)\s+goto\s+([A-Za-z_][\w.-]*)\s+else\s+([A-Za-z_][\w.-]*)$/);
        if(m){steps.push({name:m[1],kind:'branch',condition:m[2],target:m[3],otherwise:m[4]});continue;}
        m=line.match(/^step\s+([A-Za-z_][\w.-]*)\s+do\s+(.+?)(?:\s+end)?$/);
        if(m){steps.push({name:m[1],kind:'action',action:parseAction(m[2]),end:/\s+end$/.test(line)});continue;}
        throw Object.assign(new Error(`Invalid RouteFrame line ${line}`),{code:'FRAME_BAD_STEP'});
      }
      need(entry && steps.length,'FRAME_CORE_REQUIRED',`Frame ${block.name} requires entry and steps.`);
      const names=new Set(steps.map(step=>step.name));
      need(names.has(entry),'FRAME_ENTRY_UNKNOWN',`Unknown entry ${entry}.`);
      steps.forEach(step=>{if(step.target)need(names.has(step.target),'FRAME_TARGET_UNKNOWN',`${step.name} targets ${step.target}.`);if(step.otherwise)need(names.has(step.otherwise),'FRAME_TARGET_UNKNOWN',`${step.name} targets ${step.otherwise}.`);});
      return {type:'RouteFrame',name:block.name,entry,steps};
    });
    need(frames.length,'FRAME_NONE','RouteFrame requires frame.');
    return {type:'RouteFrameProgram',frames};
  },
  lower(ast){return {type:'RouteFrameGraphSet',graphs:ast.frames.map(frame=>({name:frame.name,entry:`${frame.name}:${frame.entry}`,nodes:frame.steps.map(step=>({id:`${frame.name}:${step.name}`,...step})),edges:frame.steps.flatMap(step=>step.kind==='goto'?[{from:`${frame.name}:${step.name}`,to:`${frame.name}:${step.target}`,kind:'goto'}]:step.kind==='branch'?[{from:`${frame.name}:${step.name}`,to:`${frame.name}:${step.target}`,kind:'true',condition:step.condition},{from:`${frame.name}:${step.name}`,to:`${frame.name}:${step.otherwise}`,kind:'false',condition:step.condition}]:[])}))};},
  execute(source,initial={}){
    const ast=this.parse(source),ir=this.lower(ast),frame=ast.frames[0],trace=new Trace('RouteFrame'),state=structuredClone(initial);
    let current=frame.entry,count=0;
    while(current&&!state.ended){
      need(count++<128,'FRAME_LOOP','RouteFrame exceeded transition limit.');
      const step=frame.steps.find(item=>item.name===current); need(step,'FRAME_MISSING_STEP',current);
      trace.emit('step.enter',{frame:frame.name,step:current});
      if(step.kind==='goto')current=step.target;
      else if(step.kind==='branch'){const pass=evalCondition(step.condition,state);trace.emit('branch.checked',{condition:step.condition,pass});current=pass?step.target:step.otherwise;}
      else{applyAction(step.action,state,trace);if(step.end)state.ended=true;current=null;}
    }
    const result={frame:frame.name,state,transitions:count};
    return {ast,ir,...result,trace:trace.events,receipt:trace.receipt('execute framed route with visible entry and branches',result)};
  }
};

export const StateField = {
  parse(source){
    const fields=blocks(source,'field').map(block=>{
      const states=[];const transitions=[];
      for(const line of String(block.body).split(/\r?\n/).map(v=>v.trim()).filter(Boolean)){
        let m=line.match(/^state\s+([A-Za-z_][\w.-]*)$/); if(m){states.push(m[1]);continue;}
        m=line.match(/^transition\s+([A-Za-z_][\w.-]*)\s+([A-Za-z_][\w.-]*)\s*->\s*([A-Za-z_][\w.-]*)(?:\s+when\s+(.+))?$/);
        if(m){transitions.push({name:m[1],from:m[2],to:m[3],condition:m[4]??null});continue;}
        throw Object.assign(new Error(`Invalid StateField line ${line}`),{code:'STATEFIELD_BAD_LINE'});
      }
      need(states.length>=2&&transitions.length,'STATEFIELD_CORE',`Field ${block.name} requires states and transitions.`);
      const set=new Set(states);transitions.forEach(t=>{need(set.has(t.from)&&set.has(t.to),'STATEFIELD_UNKNOWN_STATE',`${t.name} has unknown state.`);});
      return {type:'StateField',name:block.name,states,transitions};
    });
    need(fields.length,'STATEFIELD_NONE','StateField requires field.');
    return {type:'StateFieldProgram',fields};
  },
  lower(ast){return {type:'StateTransitionGraphSet',graphs:ast.fields.map(field=>({name:field.name,nodes:field.states.map(state=>({id:`${field.name}:${state}`,state})),edges:field.transitions.map(t=>({from:`${field.name}:${t.from}`,to:`${field.name}:${t.to}`,name:t.name,condition:t.condition}))}))};},
  execute(source,transitionName,initial={}){
    const ast=this.parse(source),ir=this.lower(ast),field=ast.fields[0],trace=new Trace('StateField'),state=structuredClone(initial);
    state.fields??={};state.fields[field.name]??=field.states[0];
    const transition=field.transitions.find(t=>t.name===transitionName);need(transition,'STATEFIELD_UNKNOWN_TRANSITION',transitionName);
    need(state.fields[field.name]===transition.from,'STATEFIELD_WRONG_FROM',`Expected ${transition.from}.`);
    if(transition.condition)need(evalCondition(transition.condition,state),'STATEFIELD_GUARD_FAILED',transition.condition);
    state.fields[field.name]=transition.to;setPath(state,`${field.name[0].toLowerCase()+field.name.slice(1)}.state`,transition.to);
    trace.emit('transition.applied',{field:field.name,...transition});
    return {ast,ir,state,trace:trace.events,receipt:trace.receipt('apply guarded state-field transition',state)};
  }
};

export const ContactBand = {
  parse(source){
    const bands=blocks(source,'band').map(block=>{
      const range=block.body.match(/\brange\s+(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)/);
      need(range,'BAND_RANGE_REQUIRED',`Band ${block.name} requires range.`);
      const zones=[...block.body.matchAll(/\bzone\s+([A-Za-z_][\w.-]*)\s+(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)\s+route\s+([A-Za-z_][\w.-]*)/g)].map(m=>({name:m[1],min:Number(m[2]),max:Number(m[3]),route:m[4]}));
      need(zones.length,'BAND_ZONES_REQUIRED',`Band ${block.name} requires zones.`);
      const min=Number(range[1]),max=Number(range[2]);
      zones.forEach(zone=>need(zone.min>=min&&zone.max<=max&&zone.min<=zone.max,'BAND_ZONE_RANGE',zone.name));
      return {type:'ContactBand',name:block.name,min,max,zones};
    });
    need(bands.length,'BAND_NONE','ContactBand requires band.');
    return {type:'ContactBandProgram',bands};
  },
  lower(ast){return {type:'ContactBandGraphSet',graphs:ast.bands.map(b=>({name:b.name,range:[b.min,b.max],nodes:b.zones.map(z=>({id:`zone:${z.name}`,...z})),edges:b.zones.map(z=>({from:`pressure:${z.min}-${z.max}`,to:`route:${z.route}`,kind:z.name}))}))};},
  execute(source,pressure){
    const ast=this.parse(source),ir=this.lower(ast),band=ast.bands[0],trace=new Trace('ContactBand');
    need(Number(pressure)>=band.min&&Number(pressure)<=band.max,'BAND_PRESSURE_OUTSIDE',pressure);
    const zone=band.zones.find(z=>Number(pressure)>=z.min&&Number(pressure)<=z.max);need(zone,'BAND_GAP',`No zone for ${pressure}.`);
    const state={band:band.name,pressure:Number(pressure),zone:zone.name,nextRoute:zone.route};
    trace.emit('pressure.classified',state);
    return {ast,ir,state,trace:trace.events,receipt:trace.receipt('classify contact pressure into route band',state)};
  }
};

export const FormulaGate = {
  parse(source){
    const gates=blocks(source,'gate').map(block=>{
      const params=splitTop(block.params).map(v=>v.trim()).filter(Boolean);
      const formula=block.body.match(/\bformula\s+(.+)/);
      const pass=block.body.match(/\bpass\s+when\s+(.+)/);
      const onpass=block.body.match(/\bonpass\s+(.+)/);
      const onfail=block.body.match(/\bonfail\s+(.+)/);
      need(params.length&&formula&&pass&&onpass&&onfail,'FGATE_CORE',`Gate ${block.name} requires params, formula, pass, onpass and onfail.`);
      return {type:'FormulaGate',name:block.name,params,formula:formula[1].trim(),condition:pass[1].trim(),onpass:parseAction(onpass[1]),onfail:parseAction(onfail[1])};
    });
    need(gates.length,'FGATE_NONE','FormulaGate requires gate.');
    return {type:'FormulaGateProgram',gates};
  },
  lower(ast){return {type:'FormulaGateGraphSet',graphs:ast.gates.map(g=>({name:g.name,nodes:[{id:'formula',formula:g.formula},{id:'condition',condition:g.condition},{id:'pass',action:g.onpass},{id:'fail',action:g.onfail}],edges:[{from:'formula',to:'condition',kind:'result'},{from:'condition',to:'pass',kind:'true'},{from:'condition',to:'fail',kind:'false'}]}))};},
  execute(source,args={},initial={}){
    const ast=this.parse(source),ir=this.lower(ast),gate=ast.gates[0],trace=new Trace('FormulaGate'),state=structuredClone(initial);
    gate.params.forEach(param=>need(Object.hasOwn(args,param),'FGATE_ARG_MISSING',param));
    const result=evalFormula(gate.formula,args);state.result=result;
    const passed=evalCondition(gate.condition,state);applyAction(passed?gate.onpass:gate.onfail,state,trace);
    trace.emit('gate.decided',{gate:gate.name,result,condition:gate.condition,passed});
    return {ast,ir,state,passed,trace:trace.events,receipt:trace.receipt('evaluate formula then gate consequence',state)};
  }
};
