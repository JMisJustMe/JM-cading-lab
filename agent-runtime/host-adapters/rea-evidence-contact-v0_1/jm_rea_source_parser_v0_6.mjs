/* JM × REA v0.6 independent source grammar, no imports from JM native parser/lowerer.
 * Scope: RouteScript + Game-CODING + JM GameCore supported source subset. */
const error=(code)=>{const e=new Error(code);e.code=code;throw e;};
const requireTrue=(ok,code)=>{if(!ok)error(code);};
const identifier=/^[A-Za-z_][\w.-]*$/;
function literal(raw){
 const v=String(raw).trim();
 if(/^"(?:[^"\\]|\\.)*"$/.test(v))return JSON.parse(v);
 if(/^'(?:[^'\\]|\\.)*'$/.test(v))return v.slice(1,-1);
 if(v==='true')return true;if(v==='false')return false;if(v==='null')return null;
 if(/^-?\d+(?:\.\d+)?$/.test(v))return Number(v);
 if(/^\[(?:[\w., -]*)\]$/.test(v))return v.slice(1,-1).split(',').map(x=>x.trim()).filter(Boolean);
 return v;
}
function blocks(source,kind){
 const result=[],pattern=new RegExp('\\b'+kind+'\\s+([A-Za-z_][\\w.-]*)\\s*\\{','g');
 let found;
 while((found=pattern.exec(source))){
   const start=pattern.lastIndex-1;
   let level=1,quote='',i=start+1;
   for(;i<source.length&&level;i++){
     const c=source[i];
     if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue;}
     if(c==='"'||c==="'"){quote=c;continue;}
     if(c==='{')level++;else if(c==='}')level--;
   }
   requireTrue(level===0,'V06_UNCLOSED_BLOCK');
   result.push({name:found[1],body:source.slice(start+1,i-1)});
   pattern.lastIndex=i;
 }
 return result;
}
function rightValue(raw){
 const text=raw.trim();
 return /^[A-Za-z_][\w.]*$/.test(text)&&!['true','false','null'].includes(text)
   ?{kind:'path',value:text}:{kind:'literal',value:literal(text)};
}
export function independentExpr(raw){
 const text=String(raw).trim().replace(/^\((.*)\)$/s,'$1').trim();
 requireTrue(text.length>0,'V06_EMPTY_EXPRESSION');
 for(const op of ['or','and']){
   const i=text.indexOf(' '+op+' ');
   if(i>=0)return {type:op,left:independentExpr(text.slice(0,i)),
     right:independentExpr(text.slice(i+op.length+2))};
 }
 if(text.startsWith('not '))return {type:'not',value:independentExpr(text.slice(4))};
 const c=text.match(/^(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/s);
 if(c)return {type:'compare',path:c[1].trim(),op:c[2],right:rightValue(c[3])};
 return {type:'truthy',path:text};
}
export function independentAction(raw){
 const line=raw.trim().replace(/;$/,'');
 if(['end','fail','deny','permit'].includes(line))return {type:line};
 for(const kind of ['say','show']){
  const match=line.match(new RegExp('^'+kind+'\\s+(.+)$','s'));
  if(match)return {type:kind,value:literal(match[1])};
 }
 for(const kind of ['goto','emit','route','recover']){
  const match=line.match(new RegExp('^'+kind+'\\s+([A-Za-z_][\\w.-]*)$'));
  if(match)return {type:kind,value:match[1]};
 }
 const assignment=line.match(/^([A-Za-z_][\w.]*)\s*=\s*(.+)$/s);
 if(assignment)return {type:'assign',path:assignment[1],value:literal(assignment[2])};
 const call=line.match(/^(?:call\s+)?([A-Za-z_][\w.]*)\((.*)\)$/s);
 if(call&&call[2].trim()==='')return {type:'call',name:call[1],named:{},positional:[]};
 error('V06_UNSUPPORTED_ACTION');
}
export function independentRouteParse(source){
 const routes=blocks(source,'route').map(r=>{
  const steps=[];let current=null;
  for(const raw of r.body.split(/\r?\n/)){
   const line=raw.trim();if(!line)continue;
   const label=line.match(/^([A-Za-z_][\w.-]*):$/);
   if(label){current={type:'RSRouteStep',label:label[1],statements:[]};steps.push(current);continue;}
   requireTrue(current,'V06_ACTION_WITHOUT_STEP');
   const branch=line.match(/^branch\s+(.+?)\s*->\s*([A-Za-z_][\w.-]*)$/);
   const recovery=line.match(/^onError\s*->\s*([A-Za-z_][\w.-]*)$/);
   current.statements.push(branch?{type:'branch',condition:independentExpr(branch[1]),target:branch[2]}:
     recovery?{type:'recovery',target:recovery[1]}:independentAction(line));
  }
  requireTrue(steps.length>0&&steps.some(s=>s.label==='start'),'V06_MISSING_START');
  const ids=new Set(steps.map(s=>s.label));
  requireTrue(ids.size===steps.length,'V06_DUPLICATE_STEP');
  for(const s of steps)for(const a of s.statements)if(['goto','branch','recovery'].includes(a.type))
   requireTrue(ids.has(a.target??a.value),'V06_UNRESOLVED_TARGET');
  return {type:'RSRoute',name:r.name,steps};
 });
 requireTrue(routes.length>0,'V06_ROUTE_REQUIRED');
 return {type:'RSProgram',routes};
}
export function independentRouteLower(ast){
 requireTrue(ast.type==='RSProgram','V06_ROUTE_AST_REQUIRED');
 return {type:'RSRouteGraphSet',graphs:ast.routes.map(r=>{
  const nodes=r.steps.map(s=>({id:r.name+':'+s.label,label:s.label,
    actions:s.statements.filter(a=>!['branch','goto','recovery'].includes(a.type))}));
  const edges=[];
  r.steps.forEach((s,i)=>{
   for(const a of s.statements){
    if(a.type==='branch')edges.push({from:r.name+':'+s.label,to:r.name+':'+a.target,
      kind:'branch',condition:a.condition});
    if(a.type==='recovery')edges.push({from:r.name+':'+s.label,to:r.name+':'+a.target,kind:'recovery'});
    if(a.type==='goto')edges.push({from:r.name+':'+s.label,to:r.name+':'+a.value,kind:'normal'});
   }
   if(!s.statements.some(a=>['branch','goto','end'].includes(a.type))&&i+1<r.steps.length)
    edges.push({from:r.name+':'+s.label,to:r.name+':'+r.steps[i+1].label,kind:'normal'});
  });
  return {type:'RSRouteGraph',routeName:r.name,entry:r.name+':start',nodes,edges};
 })};
}
function requireLine(text,regex,code){
 const match=text.match(regex);requireTrue(match,code);return match;
}
function commaList(text,name){
 const line=text.match(new RegExp('\\b'+name+'\\s*=\\s*\\[([^\\]]*)\\]'));
 return line?line[1].split(',').map(x=>literal(x.trim())).filter(Boolean):[];
}
export function independentGameParse(source){
 const entities=blocks(source,'entity').map(b=>{
  const fields={};for(const line of b.body.split(/\r?\n/)){
   const m=line.trim().match(/^([A-Za-z_][\w.-]*)\s*=\s*(.+)$/);
   if(m)fields[m[1]]=literal(m[2]);
  }return {type:'GCEntity',name:b.name,fields};
 });
 const mechanics=blocks(source,'mechanic').map(b=>{
  const cond=requireLine(b.body,/\brequires\s+([^\n]+)/,'V06_MECHANIC_REQUIRES');
  const effect=requireLine(b.body,/\beffect\s+([^\n]+)/,'V06_MECHANIC_EFFECT');
  return {type:'GCMechanic',name:b.name,requires:independentExpr(cond[1]),
    effect:independentAction(effect[1])};
 });
 const collisions=blocks(source,'collision').map(b=>{
  const when=requireLine(b.body,/\bwhen\s+([^\n]+)/,'V06_COLLISION_WHEN');
  const trigger=requireLine(b.body,/\bthen\s+trigger\s+([A-Za-z_][\w.-]*)/,'V06_COLLISION_TARGET');
  return {type:'GCCollision',name:b.name,condition:independentExpr(when[1]),trigger:trigger[1]};
 });
 const combos=blocks(source,'combo').map(b=>({type:'GCCombo',name:b.name,steps:commaList(b.body,'steps')}));
 const updates=blocks(source,'update').map(b=>{
  const every=requireLine(b.body,/\bevery\s+(\d+)\s+frames/,'V06_UPDATE_FRAMES');
  const action=requireLine(b.body,/\bdo\s+([^\n]+)/,'V06_UPDATE_ACTION');
  requireTrue(Number(every[1])>0,'V06_BAD_INTERVAL');
  return {type:'GCUpdate',name:b.name,intervalFrames:Number(every[1]),effect:independentAction(action[1])};
 });
 requireTrue(entities.length>0&&mechanics.length>0,'V06_MISSING_GAME_CORE');
 const known=new Set(mechanics.map(x=>x.name));
 for(const x of collisions)requireTrue(known.has(x.trigger),'V06_BAD_COLLISION_REF');
 for(const x of combos)for(const step of x.steps)requireTrue(known.has(step),'V06_BAD_COMBO_REF');
 return {type:'GCProgram',entities,mechanics,collisions,combos,updates};
}
export function independentGameLower(program){
 return {type:'GCMechanicsGraph',
  entityNodes:program.entities.map(x=>({id:'entity:'+x.name,...x})),
  mechanicNodes:program.mechanics.map(x=>({id:'mechanic:'+x.name,...x})),
  collisionNodes:program.collisions.map(x=>({id:'collision:'+x.name,...x})),
  comboNodes:program.combos.map(x=>({id:'combo:'+x.name,...x})),
  updateNodes:program.updates.map(x=>({id:'update:'+x.name,...x})),
  edges:[...program.collisions.map(x=>({from:'collision:'+x.name,to:'mechanic:'+x.trigger,kind:'collision'})),
   ...program.combos.flatMap(x=>x.steps.map(step=>({from:'combo:'+x.name,to:'mechanic:'+step,kind:'combo'})))]};
}
export function independentCoreParse(source){
 const organs=blocks(source,'organ').map(b=>{
  const raw=b.body.match(/\binvariants\s*=\s*\{([\s\S]*?)\}/);
  return {type:'JMGOrgan',name:b.name,handles:commaList(b.body,'handles'),
    rules:commaList(b.body,'rules'),
    invariants:raw?raw[1].split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(independentExpr):[]};
 });
 const systems=blocks(source,'system').map(b=>{
  const m=requireLine(b.body,/\bidentity\s*=\s*(.+)/,'V06_CORE_IDENTITY');
  return {type:'JMGSystem',name:b.name,organs:commaList(b.body,'organs'),
    events:commaList(b.body,'events'),identity:literal(m[1])};
 });
 requireTrue(organs.length>0&&systems.length>0,'V06_MISSING_CORE_SYSTEM');
 const known=new Set(organs.map(x=>x.name));
 for(const s of systems)for(const name of s.organs)requireTrue(known.has(name),'V06_BAD_ORGAN');
 return {type:'JMGProgram',organs,systems};
}
export function independentCoreLower(program){
 return {type:'JMGGameCoreGraph',
  organNodes:program.organs.map(x=>({id:'organ:'+x.name,...x})),
  systemNodes:program.systems.map(x=>({id:'system:'+x.name,...x})),
  edges:program.systems.flatMap(x=>x.organs.map(o=>({from:'system:'+x.name,to:'organ:'+o,kind:'organ'})))};
}
