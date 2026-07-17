import { Trace, applyAction, assignments, blocks, need, parseAction, splitTop, valueOf } from './native-core.mjs';

export const FormulaBornCode = {
  parse(source){
    const wordbodies=blocks(source,'wordbody').map(block=>{
      const data=assignments(block.body);
      need(data.word&&data.image&&data.state,'FBC_WORD_CORE',`WordBody ${block.name} requires word, image and state.`);
      return {type:'FBCWordBody',name:block.name,word:data.word,image:data.image,state:data.state};
    });
    const formulas=blocks(source,'formula').map(block=>{
      const data=assignments(block.body);
      need(data.from&&data.glyph&&data.route,'FBC_FORMULA_CORE',`Formula ${block.name} requires from, glyph and route.`);
      return {type:'FBCFormula',name:block.name,from:data.from,glyph:data.glyph,route:data.route};
    });
    need(wordbodies.length&&formulas.length,'FBC_CORE','Formula-Born Code requires wordbody and formula.');
    const names=new Set(wordbodies.map(item=>item.name)); formulas.forEach(item=>need(names.has(item.from),'FBC_UNKNOWN_WORD_BODY',item.from));
    return {type:'FBCProgram',wordbodies,formulas};
  },
  lower(ast){return {type:'FBCTransformationGraph',wordNodes:ast.wordbodies.map(w=>({id:`word:${w.name}`,...w})),formulaNodes:ast.formulas.map(f=>({id:`formula:${f.name}`,...f})),edges:ast.formulas.map(f=>({from:`word:${f.from}`,to:`formula:${f.name}`,kind:'formula-born'}))};},
  execute(source,name=null){
    const ast=this.parse(source),ir=this.lower(ast),trace=new Trace('Formula-Born Code');
    const formula=name?ast.formulas.find(item=>item.name===name):ast.formulas[0];need(formula,'FBC_UNKNOWN_FORMULA',name);
    const word=ast.wordbodies.find(item=>item.name===formula.from);
    const command={word:word.word,image:word.image,state:word.state,glyph:formula.glyph,nextRoute:formula.route};
    trace.emit('wordbody.read',word);trace.emit('commandglyph.born',command);
    return {ast,ir,state:command,trace:trace.events,receipt:trace.receipt('turn word-image-state formula into command glyph',command)};
  }
};

export const NoncodingCode = {
  parse(source){
    const signals=blocks(source,'signal').map(block=>{
      const data=assignments(block.body);
      need(data.meaning&&data.form&&data.action,'NCC_SIGNAL_CORE',`Signal ${block.name} requires meaning, form and action.`);
      return {type:'NCCSignal',name:block.name,meaning:data.meaning,form:data.form,action:data.action};
    });
    need(signals.length,'NCC_NONE','Noncoding-Code requires signals.');
    return {type:'NCCProgram',signals};
  },
  lower(ast){return {type:'NCCMeaningSignalGraph',nodes:ast.signals.flatMap(s=>[{id:`meaning:${s.name}`,kind:'meaning',value:s.meaning},{id:`signal:${s.name}`,kind:s.form,value:s.name},{id:`action:${s.name}`,kind:'action',value:s.action}]),edges:ast.signals.flatMap(s=>[{from:`meaning:${s.name}`,to:`signal:${s.name}`,kind:'signal'},{from:`signal:${s.name}`,to:`action:${s.name}`,kind:'action'}])};},
  execute(source,name=null){
    const ast=this.parse(source),ir=this.lower(ast),trace=new Trace('Noncoding-Code');
    const signal=name?ast.signals.find(item=>item.name===name):ast.signals[0];need(signal,'NCC_UNKNOWN_SIGNAL',name);
    const state={meaning:signal.meaning,form:signal.form,signal:signal.name,nextRoute:signal.action};
    trace.emit('meaning.signalled',state);trace.emit('action.routed',{route:signal.action});
    return {ast,ir,state,trace:trace.events,receipt:trace.receipt('carry meaning through non-typed signal into action',state)};
  }
};

export const ContactCode = {
  parse(source){
    const contacts=blocks(source,'contact').map(block=>{
      const data=assignments(block.body);
      const pressure=block.body.match(/\bpressure\s*(>=|<=|>|<|==)\s*(-?\d+(?:\.\d+)?)/);
      const hold=block.body.match(/\bhold\s*(>=|<=|>|<|==)\s*(-?\d+(?:\.\d+)?)/);
      const effect=block.body.match(/\beffect\s+(.+)/);
      need(data.target&&pressure&&hold&&effect,'CC_CORE',`Contact ${block.name} requires target, pressure, hold and effect.`);
      return {type:'CCContact',name:block.name,target:data.target,pressure:{op:pressure[1],value:Number(pressure[2])},hold:{op:hold[1],value:Number(hold[2])},effect:parseAction(effect[1])};
    });
    need(contacts.length,'CC_NONE','ContactCode requires contacts.');
    return {type:'CCProgram',contacts};
  },
  lower(ast){return {type:'CCContactGraph',nodes:ast.contacts.map(c=>({id:`contact:${c.name}`,...c})),edges:ast.contacts.map(c=>({from:`pressure:${c.pressure.op}${c.pressure.value}`,to:`contact:${c.name}`,kind:`hold:${c.hold.op}${c.hold.value}`}))};},
  execute(source,input={},initial={}){
    const ast=this.parse(source),ir=this.lower(ast),contact=ast.contacts[0],trace=new Trace('ContactCode'),state=structuredClone(initial);
    const compare=(left,rule)=>({'==':left===rule.value,'>=':left>=rule.value,'<=':left<=rule.value,'>':left>rule.value,'<':left<rule.value})[rule.op];
    need(input.target===contact.target,'CC_WRONG_TARGET',input.target);
    const passed=compare(Number(input.pressure),contact.pressure)&&compare(Number(input.hold),contact.hold);
    trace.emit('contact.measured',{...input,passed});
    if(passed)applyAction(contact.effect,state,trace);
    return {ast,ir,state,passed,trace:trace.events,receipt:trace.receipt('turn contact pressure and duration into state change',state)};
  }
};

function normalMorse(value){return String(value).trim().replace(/\s+/g,' ').replace(/\bPAUSE\b/gi,'gap');}
export const MorseMinus = {
  parse(source){
    const mappings=[];
    for(const raw of String(source).split(/\r?\n/).map(v=>v.trim()).filter(Boolean)){
      const m=raw.match(/^morse\s+([A-Za-z_][\w.-]*)\s+("(?:\\.|[^"])*"|'(?:\\.|[^'])*')\s+route\s+([A-Za-z_][\w.-]*)$/);
      need(m,'MM_BAD_DECL',`Invalid MorseMinus declaration ${raw}.`);
      mappings.push({name:m[1],pattern:normalMorse(valueOf(m[2])),route:m[3]});
    }
    need(mappings.length,'MM_NONE','MorseMinus requires mappings.');
    need(new Set(mappings.map(item=>item.pattern)).size===mappings.length,'MM_DUPLICATE','MorseMinus patterns must be unique.');
    return {type:'MMProgram',mappings};
  },
  lower(ast){return {type:'MMSignalRouteGraph',nodes:ast.mappings.map(m=>({id:`morse:${m.name}`,...m})),edges:ast.mappings.map(m=>({from:`signal:${m.pattern}`,to:`route:${m.route}`,kind:'minimal'}))};},
  execute(source,signal){
    const ast=this.parse(source),ir=this.lower(ast),trace=new Trace('MorseMinus'),pattern=normalMorse(signal);
    const mapping=ast.mappings.find(item=>item.pattern===pattern);need(mapping,'MM_UNKNOWN_SIGNAL',pattern);
    const state={signal:pattern,meaning:mapping.name,nextRoute:mapping.route};
    trace.emit('minimal.signal.read',state);
    return {ast,ir,state,trace:trace.events,receipt:trace.receipt('carry route meaning through reduced signal',state)};
  }
};

export const MorseMinusZeroGrip = {
  parse(source){
    const routes=blocks(source,'zerogrip').map(block=>{
      const data=assignments(block.body);
      need(data.hinge&&data.signal&&data.max_force!=null&&data.route,'MMZG_CORE',`ZeroGrip ${block.name} requires hinge, signal, max_force and route.`);
      return {type:'MMZGRoute',name:block.name,hinge:data.hinge,signal:normalMorse(data.signal),maxForce:Number(data.max_force),route:data.route};
    });
    need(routes.length,'MMZG_NONE','MorseMinus ZeroGrip requires zerogrip route.');
    return {type:'MMZGProgram',routes};
  },
  lower(ast){return {type:'MMZGSoftRouteGraph',nodes:ast.routes.map(r=>({id:`zerogrip:${r.name}`,...r})),edges:ast.routes.map(r=>({from:`hinge:${r.hinge}`,to:`route:${r.route}`,kind:`max-force:${r.maxForce}`}))};},
  execute(source,input){
    const ast=this.parse(source),ir=this.lower(ast),route=ast.routes[0],trace=new Trace('MorseMinus ZeroGrip');
    need(input.hinge===route.hinge,'MMZG_BAD_HINGE',input.hinge);
    need(normalMorse(input.signal)===route.signal,'MMZG_BAD_SIGNAL',input.signal);
    need(Number(input.force)<=route.maxForce,'MMZG_OVERPRESSURE',input.force);
    const state={hinge:route.hinge,signal:route.signal,force:Number(input.force),grip:'zero',nextRoute:route.route};
    trace.emit('soft.route.accepted',state);
    return {ast,ir,state,trace:trace.events,receipt:trace.receipt('route command without overpressure',state)};
  }
};

export const MudraCode = {
  parse(source){
    const mudras=blocks(source,'mudra').map(block=>{
      const data=assignments(block.body);
      need(data.shape&&data.hold!=null&&data.route&&data.state,'MUDRA_CORE',`Mudra ${block.name} requires shape, hold, route and state.`);
      return {type:'Mudra',name:block.name,shape:data.shape,hold:Number(data.hold),route:data.route,state:data.state};
    });
    need(mudras.length,'MUDRA_NONE','Mudra Code requires mudra.');
    return {type:'MudraProgram',mudras};
  },
  lower(ast){return {type:'MudraGestureGraph',nodes:ast.mudras.map(m=>({id:`mudra:${m.name}`,...m})),edges:ast.mudras.map(m=>({from:`shape:${m.shape}`,to:`route:${m.route}`,kind:`hold:${m.hold}`}))};},
  execute(source,input){
    const ast=this.parse(source),ir=this.lower(ast),mudra=ast.mudras.find(m=>m.shape===input.shape);need(mudra,'MUDRA_UNKNOWN_SHAPE',input.shape);
    need(Number(input.hold)>=mudra.hold,'MUDRA_HOLD_SHORT',input.hold);
    const trace=new Trace('Mudra Code'),state={mudra:mudra.name,shape:mudra.shape,held:Number(input.hold),bodyState:mudra.state,nextRoute:mudra.route};
    trace.emit('gesture.completed',state);
    return {ast,ir,state,trace:trace.events,receipt:trace.receipt('turn held hand shape into routed state command',state)};
  }
};

export const JickMa = {
  parse(source){
    const readers=blocks(source,'jickma').map(block=>{
      const data=assignments(block.body);
      need(data.before&&data.contact&&data.trace&&data.gift&&data.after,'JICKMA_CORE',`JickMa ${block.name} requires before, contact, trace, gift and after.`);
      return {type:'JickMaReader',name:block.name,before:data.before,contact:data.contact,trace:data.trace,gift:data.gift,after:data.after};
    });
    need(readers.length,'JICKMA_NONE','JickMa requires reader.');
    return {type:'JickMaProgram',readers};
  },
  lower(ast){return {type:'JickMaTransformGraph',nodes:ast.readers.flatMap(r=>[{id:`before:${r.name}`,value:r.before},{id:`contact:${r.name}`,value:r.contact},{id:`trace:${r.name}`,value:r.trace},{id:`gift:${r.name}`,value:r.gift},{id:`after:${r.name}`,value:r.after}]),edges:ast.readers.flatMap(r=>[{from:`before:${r.name}`,to:`contact:${r.name}`,kind:'touch'},{from:`contact:${r.name}`,to:`trace:${r.name}`,kind:'reveal'},{from:`trace:${r.name}`,to:`gift:${r.name}`,kind:'transform'},{from:`gift:${r.name}`,to:`after:${r.name}`,kind:'become'}])};},
  execute(source,input){
    const ast=this.parse(source),ir=this.lower(ast),reader=ast.readers[0],trace=new Trace('JickMa / JickMah');
    need(input.before===reader.before&&input.contact===reader.contact,'JICKMA_CONTACT_MISMATCH','JickMa before/contact mismatch.');
    const state={sideBe:reader.before,contact:reader.contact,trace:reader.trace,gift:reader.gift,sideAf:reader.after};
    trace.emit('contact.read',{before:reader.before,contact:reader.contact});trace.emit('gift.formed',{trace:reader.trace,gift:reader.gift,after:reader.after});
    return {ast,ir,state,trace:trace.events,receipt:trace.receipt('read contact and transform trace into gift and after-state',state)};
  }
};

export const MoodDrills = {
  parse(source){
    const drills=blocks(source,'drill').map(block=>{
      const data=assignments(block.body);
      const stepsMatch=block.body.match(/\bsteps\s*=\s*\[([^\]]*)\]/);
      need(data.mood&&data.intensity!=null&&stepsMatch&&data.shift&&data.route,'MOOD_CORE',`Drill ${block.name} requires mood, intensity, steps, shift and route.`);
      return {type:'MoodDrill',name:block.name,mood:data.mood,intensity:Number(data.intensity),steps:splitTop(stepsMatch[1]).map(valueOf).map(String),shift:data.shift,route:data.route};
    });
    need(drills.length,'MOOD_NONE','Mood Drills requires drill.');
    return {type:'MoodProgram',drills};
  },
  lower(ast){return {type:'MoodShiftGraph',nodes:ast.drills.flatMap(d=>[{id:`mood:${d.name}`,value:d.mood},{id:`drill:${d.name}`,steps:d.steps},{id:`shift:${d.name}`,value:d.shift}]),edges:ast.drills.flatMap(d=>[{from:`mood:${d.name}`,to:`drill:${d.name}`,kind:`intensity:${d.intensity}`},{from:`drill:${d.name}`,to:`shift:${d.name}`,kind:'practice'},{from:`shift:${d.name}`,to:`route:${d.route}`,kind:'route'}])};},
  execute(source,input){
    const ast=this.parse(source),ir=this.lower(ast),drill=ast.drills.find(d=>d.mood===input.mood);need(drill,'MOOD_UNKNOWN',input.mood);
    need(Number(input.intensity)>=drill.intensity,'MOOD_INTENSITY_LOW',input.intensity);
    const trace=new Trace('Mood Drills'),completed=[];
    for(const step of drill.steps){completed.push(step);trace.emit('drill.step',{step,index:completed.length-1});}
    const state={before:drill.mood,intensity:Number(input.intensity),completed,after:drill.shift,nextRoute:drill.route};
    trace.emit('mood.shifted',{from:drill.mood,to:drill.shift});
    return {ast,ir,state,trace:trace.events,receipt:trace.receipt('use drill sequence to shift operational mood state',state)};
  }
};
