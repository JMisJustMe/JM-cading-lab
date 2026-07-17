import {Trace,assignments,blocks,digest,listOf,need} from './native-core.mjs';

export const BuilderLads={
 parse(source){const builders=blocks(source,'builder').map(b=>{const d=assignments(b.body);const tests=listOf(d.tests).map(String);need(d.body&&d.purpose&&d.build&&tests.length&&d.export,'BUILDER_CORE',`Builder ${b.name} incomplete.`);return{name:b.name,body:d.body,purpose:d.purpose,build:d.build,tests,exportName:d.export};});need(builders.length,'BUILDER_NONE','Builder Lads requires builder.');return{type:'BuilderLadsProgram',builders};},
 execute(source,services={}){const ast=this.parse(source),b=ast.builders[0];need(typeof services[b.build]==='function','BUILDER_BUILD_MISSING',b.build);const built=services[b.build](b.body,b.purpose);const tests=b.tests.map(name=>({name,passed:typeof services[name]==='function'&&Boolean(services[name](built))}));need(tests.every(t=>t.passed),'BUILDER_TEST_FAILED','Builder Lads test failed.',tests);const state={builder:b.name,body:b.body,purpose:b.purpose,built,tests,export:b.exportName};const trace=new Trace('Builder Lads');trace.emit('body.built',{body:b.body,purpose:b.purpose});trace.emit('body.tested',tests);return{ast,state,trace:trace.events,receipt:trace.receipt('build test and export body for declared purpose',state)};}
};

export const REAPROACH={
 parse(source){const routes=blocks(source,'reapproach').map(b=>{const d=assignments(b.body);need(d.source&&d.protect&&d.reentry&&d.gate&&d.return,'REAPP_CORE',`REAPROACH ${b.name} incomplete.`);return{name:b.name,source:d.source,protect:d.protect,reentry:d.reentry,gate:d.gate,returns:d.return};});need(routes.length,'REAPP_NONE','REAPROACH requires route.');return{type:'REAPROACHProgram',routes};},
 execute(source,input){const ast=this.parse(source),r=ast.routes[0];need(input.source===r.source,'REAPP_SOURCE_MISMATCH','Source mismatch.');need(input.contact?.[r.gate]===true,'REAPP_GATE_FAILED',r.gate);const state={route:r.name,source:r.source,protected:r.protect,reentry:r.reentry,returnType:r.returns,identityPreserved:true};const trace=new Trace('REAPROACH');trace.emit('source.protected',state);trace.emit('reentry.opened',{reentry:r.reentry});return{ast,state,trace:trace.events,receipt:trace.receipt('protect source identity while opening governed re-entry',state)};}
};

export const RouteForm={
 parse(source){const forms=blocks(source,'routeform').map(b=>{const d=assignments(b.body);const branches=listOf(d.branches).map(Number),routes=listOf(d.routes).map(String);need(d.seed!=null&&branches.length&&routes.length===branches.length,'ROUTEFORM_CORE',`RouteForm ${b.name} incomplete.`);return{name:b.name,seed:Number(d.seed),branches,routes};});need(forms.length,'ROUTEFORM_NONE','RouteForm requires form.');return{type:'RouteFormProgram',forms};},
 execute(source){const ast=this.parse(source),f=ast.forms[0],values=[f.seed,...f.branches];need(values.every((v,i)=>i===0||v===values[i-1]*2),'ROUTEFORM_PATTERN','RouteForm requires doubling branch pattern.');const state={form:f.name,values,routes:f.routes,opened:f.routes.length};const trace=new Trace('RouteForm');trace.emit('routes.opened',state);return{ast,state,trace:trace.events,receipt:trace.receipt('open branching pattern into usable route options',state)};}
};

export const ToolKnit={
 parse(source){const knits=blocks(source,'toolknit').map(b=>{const d=assignments(b.body);const thread=listOf(d.thread).map(String);need(thread.length&&d.carry===true&&d.output,'KNIT_CORE',`ToolKnit ${b.name} incomplete.`);return{name:b.name,thread,carry:d.carry,output:d.output};});need(knits.length,'KNIT_NONE','ToolKnit requires knit.');return{type:'ToolKnitProgram',knits};},
 execute(source,proofs={}){const ast=this.parse(source),k=ast.knits[0];const missing=k.thread.filter(item=>!proofs[item]);need(!missing.length,'KNIT_MISSING_THREAD',missing.join(','));const state={knit:k.name,thread:k.thread,carried:k.carry,output:k.output,proofDigest:digest(k.thread.map(item=>proofs[item]))};const trace=new Trace('ToolKnit');trace.emit('proof.thread.knit',state);return{ast,state,trace:trace.events,receipt:trace.receipt('grow useful proof thread while carrying prior stages forward',state)};}
};

export const Goisible={
 parse(source){const fits=blocks(source,'goisible').map(b=>{const d=assignments(b.body);need(d.route&&d.visible===true&&d.understandable===true&&d.movable===true&&d.fit,'GOISIBLE_CORE',`Goisible ${b.name} incomplete.`);return{name:b.name,route:d.route,visible:d.visible,understandable:d.understandable,movable:d.movable,fit:d.fit};});need(fits.length,'GOISIBLE_NONE','Goisible requires fit body.');return{type:'GoisibleProgram',fits};},
 execute(source){const ast=this.parse(source),g=ast.fits[0],state={body:g.name,route:g.route,visible:g.visible,understandable:g.understandable,movable:g.movable,fit:g.fit,usable:true};const trace=new Trace('Goisible');trace.emit('route.fit.proved',state);return{ast,state,trace:trace.events,receipt:trace.receipt('prove route can be seen understood and moved through',state)};}
};

export const TBS={
 parse(source){const bodies=blocks(source,'tbs').map(b=>{const d=assignments(b.body);need(d.source&&d.contact&&d.translation&&d.body&&d.pattern_turn&&d.proof&&d.recovery&&d.cold_ding,'TBS_CORE',`TBS ${b.name} incomplete.`);return{name:b.name,source:d.source,contact:d.contact,translation:d.translation,body:d.body,patternTurn:d.pattern_turn,proof:d.proof,recovery:d.recovery,coldDing:d.cold_ding};});need(bodies.length,'TBS_NONE','TBS requires theory body route.');return{type:'TBSProgram',bodies};},
 execute(source,contacts={}){const ast=this.parse(source),t=ast.bodies[0];for(const key of [t.contact,t.translation,t.patternTurn,t.proof,t.recovery,t.coldDing])need(contacts[key]===true,'TBS_STAGE_MISSING',key);const state={tbs:t.name,source:t.source,body:t.body,stack:['Source','Contact','Translation','Body','Pattern Turn','Proof','Recovery','Cold Ding'],formed:true};const trace=new Trace('TBS / Theory-to-Body System');state.stack.forEach((stage,index)=>trace.emit('stage.completed',{stage,index}));return{ast,state,trace:trace.events,receipt:trace.receipt('turn contacted theory into routed proved recoverable body',state)};}
};
