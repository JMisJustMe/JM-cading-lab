import { digest, stable } from './native-core.mjs';
import { Cading, Quadze, Speakuals } from './structured-core-native.mjs';
import { MarkLevelSyntax, TBSString } from './mark-string-native.mjs';
import { ContactBand, FormulaGate, GlyphBody, PunctBody, RouteFrame, StateField, TokenBody } from './field-primitives-native.mjs';
import { ContactCode, FormulaBornCode, JickMa, MoodDrills, MorseMinus, MorseMinusZeroGrip, MudraCode, NoncodingCode } from './embodied-native.mjs';
import {
  CADING_SOURCE, CONTACT_BAND_SOURCE, CONTACT_CODE_SOURCE, FORMULA_BORN_SOURCE, FORMULA_GATE_SOURCE,
  GLYPH_BODY_SOURCE, INITIAL_STATE, JICKMA_SOURCE, MARK_LEVEL_SOURCE, MOOD_DRILLS_SOURCE,
  MORSE_MINUS_SOURCE, MUDRA_SOURCE, NONCODING_SOURCE, PUNCT_BODY_SOURCE, QUADZE_SOURCE,
  ROUTE_FRAME_SOURCE, SPEAKUALS_SOURCE, STATE_FIELD_SOURCE, TBS_STRING_SOURCE, TOKEN_BODY_SOURCE,
  ZERO_GRIP_SOURCE
} from './native-corpus.mjs';

const checks=[];
function check(name,fn){
  try{const value=fn();checks.push({name,passed:true,digest:digest(value)});}
  catch(error){checks.push({name,passed:false,error:{name:error.name,code:error.code,message:error.message}});}
}
function expect(condition,message){if(!condition)throw new Error(message);}
function rejects(fn,code){
  let caught=null;try{fn();}catch(error){caught=error;}
  expect(caught,`Expected rejection ${code}.`);
  if(code)expect(caught.code===code,`Expected ${code}, got ${caught.code}.`);
  return caught.code;
}

check('01 Cading parses Fullstopped source and landing',()=>{const ast=Cading.parse(CADING_SOURCE);expect(ast.landing==='intent.openDoor'&&ast.variants.length===2,'Cading AST mismatch');return ast;});
check('02 Cading lowers and executes source-to-landing route',()=>{const result=Cading.execute(CADING_SOURCE,structuredClone(INITIAL_STATE));expect(result.state.intent.openDoor===true&&result.ir.type==='CadingRouteGraph','Cading runtime mismatch');return result;});
check('03 Cading rejects Foolstopped source',()=>rejects(()=>Cading.parse('open = intent.openDoor.'),'CAD_FULLSTOP_REQUIRED'));
check('04 Quadze parses bodies routes keepers glyphs and policy',()=>{const ast=Quadze.parse(QUADZE_SOURCE);expect(ast.bodies.length===2&&ast.routes.length===3&&ast.glyphs.length===1,'Quadze AST mismatch');return ast;});
check('05 Quadze executes qua-direction routes and keeper',()=>{const result=Quadze.execute(QUADZE_SOURCE);expect(result.state.quadze.Alpha.localTime===4&&result.state.quadze.Alpha.crossed===1&&result.keeperResults[0].passed,'Quadze execution mismatch');return result;});
check('06 Quadze rejects unknown body route',()=>rejects(()=>Quadze.parse('body A { routes:[Missing] }\nroute X { cost:1 apply:increment_state }\npolicy rejected: ding'),'QUADZE_UNKNOWN_ROUTE'));
check('07 Speakuals lands relation and preserves completion',()=>{const result=Speakuals.execute(SPEAKUALS_SOURCE,{intent:{openDoor:true},door:{requested:false}});expect(result.state.door.requested===true&&result.ast.fullstopped,'Speakuals mismatch');return result;});
check('08 Speakuals rejects relation without Fullstop',()=>rejects(()=>Speakuals.parse('a = b'),'SPK_FULLSTOP_REQUIRED'));
check('09 Mark-Level Syntax builds layered mark graph',()=>{const ast=MarkLevelSyntax.parse(MARK_LEVEL_SOURCE),ir=MarkLevelSyntax.lower(ast);expect(ir.markNodes.length===2&&ir.levelNodes.length===1,'Mark graph mismatch');return {ast,ir};});
check('10 Mark-Level Syntax routes recognised phrase',()=>{const result=MarkLevelSyntax.execute(MARK_LEVEL_SOURCE,'open door');expect(result.state.meaning==='intent.openDoor'&&result.state.nextRoute==='door.open','Mark route mismatch');return result;});
check('11 Mark-Level Syntax rejects unknown phrase word',()=>rejects(()=>MarkLevelSyntax.execute(MARK_LEVEL_SOURCE,'open window'),'MLS_UNRECOGNISED_INPUT'));
check('12 TBS.String segments binds and composes living string',()=>{const result=TBSString.execute(TBS_STRING_SOURCE);expect(result.state.roles.intent==='open:door','TBS.String mismatch');return result;});
check('13 TBS.String rejects incomplete body',()=>rejects(()=>TBSString.parse('string Bad { source = "x" }'),'TBS_INVALID_STRING'));
check('14 TokenBody builds lexical automaton',()=>{const ast=TokenBody.parse(TOKEN_BODY_SOURCE),ir=TokenBody.lower(ast);expect(ir.states.length===3,'Token automaton mismatch');return {ast,ir};});
check('15 TokenBody tokenises source deterministically',()=>{const a=TokenBody.execute(TOKEN_BODY_SOURCE,'open 42'),b=TokenBody.execute(TOKEN_BODY_SOURCE,'open 42');expect(a.tokens.length===2&&a.tokens[1].type==='NUMBER'&&stable(a.tokens)===stable(b.tokens),'Token runtime mismatch');return a;});
check('16 TokenBody rejects unmatched lexeme',()=>rejects(()=>TokenBody.execute(TOKEN_BODY_SOURCE,'open @'),'TOKEN_NO_MATCH'));
check('17 PunctBody turns punctuation into effects',()=>{const result=PunctBody.execute(PUNCT_BODY_SOURCE,'open! .✓');expect(result.completed&&result.events.some(e=>e.effect==='act'),'Punct effect mismatch');return result;});
check('18 PunctBody rejects unknown sequence member',()=>rejects(()=>PunctBody.parse('punct FULL "." effect=complete\nsequence X=[MISSING]'),'PUNCT_UNKNOWN_MEMBER'));
check('19 GlyphBody maps pressure glyph to route',()=>{const result=GlyphBody.execute(GLYPH_BODY_SOURCE,'!');expect(result.state.pressure==='high'&&result.state.nextRoute==='door.open','Glyph mismatch');return result;});
check('20 GlyphBody rejects unknown glyph',()=>rejects(()=>GlyphBody.execute(GLYPH_BODY_SOURCE,'#'),'GLYPH_UNKNOWN'));
check('21 RouteFrame parses explicit entry branch and terminal actions',()=>{const ast=RouteFrame.parse(ROUTE_FRAME_SOURCE),ir=RouteFrame.lower(ast);expect(ir.graphs[0].nodes.length===4,'RouteFrame graph mismatch');return {ast,ir};});
check('22 RouteFrame opens authorised door',()=>{const result=RouteFrame.execute(ROUTE_FRAME_SOURCE,{door:{authorized:true,state:'closed'}});expect(result.state.door.state==='open'&&result.state.ended,'RouteFrame authorised mismatch');return result;});
check('23 RouteFrame takes deny route without authority',()=>{const result=RouteFrame.execute(ROUTE_FRAME_SOURCE,{door:{authorized:false,state:'closed'}});expect(result.state.door.state==='locked','RouteFrame deny mismatch');return result;});
check('24 StateField parses named states and guarded transitions',()=>{const ast=StateField.parse(STATE_FIELD_SOURCE),ir=StateField.lower(ast);expect(ir.graphs[0].edges.length===2,'StateField graph mismatch');return {ast,ir};});
check('25 StateField applies guarded transition',()=>{const result=StateField.execute(STATE_FIELD_SOURCE,'Open',{door:{authorized:true,state:'closed'},fields:{Door:'closed'}});expect(result.state.fields.Door==='open'&&result.state.door.state==='open','StateField runtime mismatch');return result;});
check('26 StateField rejects failed guard',()=>rejects(()=>StateField.execute(STATE_FIELD_SOURCE,'Open',{door:{authorized:false,state:'closed'},fields:{Door:'closed'}}),'STATEFIELD_GUARD_FAILED'));
check('27 ContactBand classifies pressure into route zone',()=>{const result=ContactBand.execute(CONTACT_BAND_SOURCE,5);expect(result.state.zone==='firm'&&result.state.nextRoute==='open','ContactBand mismatch');return result;});
check('28 ContactBand rejects out-of-range pressure',()=>rejects(()=>ContactBand.execute(CONTACT_BAND_SOURCE,12),'BAND_PRESSURE_OUTSIDE'));
check('29 FormulaGate evaluates formula and passes consequence',()=>{const result=FormulaGate.execute(FORMULA_GATE_SOURCE,{force:6,focus:5},{door:{authorized:false}});expect(result.passed&&result.state.door.authorized===true&&result.state.result===11,'FormulaGate pass mismatch');return result;});
check('30 FormulaGate applies hold consequence on fail',()=>{const result=FormulaGate.execute(FORMULA_GATE_SOURCE,{force:2,focus:3},{door:{authorized:true}});expect(!result.passed&&result.state.door.authorized===false,'FormulaGate fail mismatch');return result;});
check('31 FormulaGate rejects missing parameter',()=>rejects(()=>FormulaGate.execute(FORMULA_GATE_SOURCE,{force:6},{door:{}}),'FGATE_ARG_MISSING'));
check('32 Formula-Born Code births command glyph from word body',()=>{const result=FormulaBornCode.execute(FORMULA_BORN_SOURCE);expect(result.state.glyph==='!'&&result.state.nextRoute==='door.open','FormulaBorn mismatch');return result;});
check('33 Formula-Born Code rejects missing source word body',()=>rejects(()=>FormulaBornCode.parse('formula X { from = Missing\nglyph="!"\nroute=door.open }'),'FBC_CORE'));
check('34 Noncoding-Code routes meaning through gesture signal',()=>{const result=NoncodingCode.execute(NONCODING_SOURCE);expect(result.state.form==='gesture'&&result.state.nextRoute==='door.open','Noncoding mismatch');return result;});
check('35 Noncoding-Code rejects actionless signal',()=>rejects(()=>NoncodingCode.parse('signal X { meaning="x"\nform=gesture }'),'NCC_SIGNAL_CORE'));
check('36 ContactCode executes pressure-and-hold command',()=>{const result=ContactCode.execute(CONTACT_CODE_SOURCE,{target:'door',pressure:5,hold:250},{door:{state:'closed'}});expect(result.passed&&result.state.door.state==='open','ContactCode mismatch');return result;});
check('37 ContactCode holds when pressure is insufficient',()=>{const result=ContactCode.execute(CONTACT_CODE_SOURCE,{target:'door',pressure:2,hold:250},{door:{state:'closed'}});expect(!result.passed&&result.state.door.state==='closed','ContactCode hold mismatch');return result;});
check('38 ContactCode rejects wrong contact target',()=>rejects(()=>ContactCode.execute(CONTACT_CODE_SOURCE,{target:'window',pressure:5,hold:250},{door:{}}),'CC_WRONG_TARGET'));
check('39 MorseMinus carries route in reduced signal',()=>{const result=MorseMinus.execute(MORSE_MINUS_SOURCE,'--- pause -');expect(result.state.meaning==='Open'&&result.state.nextRoute==='door.open','MorseMinus mismatch');return result;});
check('40 MorseMinus rejects unknown signal',()=>rejects(()=>MorseMinus.execute(MORSE_MINUS_SOURCE,'-- --'),'MM_UNKNOWN_SIGNAL'));
check('41 ZeroGrip routes soft command at allowed force',()=>{const result=MorseMinusZeroGrip.execute(ZERO_GRIP_SOURCE,{hinge:'0+0',signal:'-',force:1});expect(result.state.grip==='zero'&&result.state.nextRoute==='door.softOpen','ZeroGrip mismatch');return result;});
check('42 ZeroGrip rejects overpressure',()=>rejects(()=>MorseMinusZeroGrip.execute(ZERO_GRIP_SOURCE,{hinge:'0+0',signal:'-',force:2}),'MMZG_OVERPRESSURE'));
check('43 ZeroGrip rejects wrong hinge',()=>rejects(()=>MorseMinusZeroGrip.execute(ZERO_GRIP_SOURCE,{hinge:'1+1',signal:'-',force:1}),'MMZG_BAD_HINGE'));
check('44 Mudra Code routes held hand shape',()=>{const result=MudraCode.execute(MUDRA_SOURCE,{shape:'open',hold:3});expect(result.state.bodyState==='ready'&&result.state.nextRoute==='door.open','Mudra mismatch');return result;});
check('45 Mudra Code rejects short hold',()=>rejects(()=>MudraCode.execute(MUDRA_SOURCE,{shape:'open',hold:1}),'MUDRA_HOLD_SHORT'));
check('46 JickMa reads before/contact into gift and after-state',()=>{const result=JickMa.execute(JICKMA_SOURCE,{before:'door.closed',contact:'press'});expect(result.state.gift==='permission'&&result.state.sideAf==='door.open','JickMa mismatch');return result;});
check('47 JickMa rejects mismatched contact',()=>rejects(()=>JickMa.execute(JICKMA_SOURCE,{before:'door.open',contact:'press'}),'JICKMA_CONTACT_MISMATCH'));
check('48 Mood Drills executes state-training sequence',()=>{const result=MoodDrills.execute(MOOD_DRILLS_SOURCE,{mood:'low',intensity:3});expect(result.state.after==='clear'&&result.state.completed.length===3,'MoodDrills mismatch');return result;});
check('49 Mood Drills rejects weak intensity',()=>rejects(()=>MoodDrills.execute(MOOD_DRILLS_SOURCE,{mood:'low',intensity:1}),'MOOD_INTENSITY_LOW'));
check('50 Continuous twenty-body native route completes',()=>{
  let state=structuredClone(INITIAL_STATE);
  const cading=Cading.execute(CADING_SOURCE,state); state=cading.state;
  const speak=Speakuals.execute(SPEAKUALS_SOURCE,state); state=speak.state;
  const mark=MarkLevelSyntax.execute(MARK_LEVEL_SOURCE,'open door');
  const tbs=TBSString.execute(TBS_STRING_SOURCE);
  const token=TokenBody.execute(TOKEN_BODY_SOURCE,'open door');
  const punct=PunctBody.execute(PUNCT_BODY_SOURCE,'! .✓');
  const born=FormulaBornCode.execute(FORMULA_BORN_SOURCE);
  const glyph=GlyphBody.execute(GLYPH_BODY_SOURCE,born.state.glyph);
  const gate=FormulaGate.execute(FORMULA_GATE_SOURCE,{force:6,focus:5},state); state=gate.state;
  const band=ContactBand.execute(CONTACT_BAND_SOURCE,5);
  const contact=ContactCode.execute(CONTACT_CODE_SOURCE,{target:'door',pressure:5,hold:250},state); state=contact.state;
  const field=StateField.execute(STATE_FIELD_SOURCE,'Open',{...state,fields:{Door:'closed'}}); state=field.state;
  const frame=RouteFrame.execute(ROUTE_FRAME_SOURCE,state); state=frame.state;
  const morse=MorseMinus.execute(MORSE_MINUS_SOURCE,'--- gap -');
  const zero=MorseMinusZeroGrip.execute(ZERO_GRIP_SOURCE,{hinge:'0+0',signal:'-',force:1});
  const mudra=MudraCode.execute(MUDRA_SOURCE,{shape:'open',hold:2});
  const jick=JickMa.execute(JICKMA_SOURCE,{before:'door.closed',contact:'press'});
  const mood=MoodDrills.execute(MOOD_DRILLS_SOURCE,{mood:'low',intensity:3});
  const quadze=Quadze.execute(QUADZE_SOURCE);
  const noncoding=NoncodingCode.execute(NONCODING_SOURCE);
  expect(state.door.state==='open'&&state.door.authorized===true,'Door did not complete.');
  expect(mark.state.nextRoute===glyph.state.nextRoute&&morse.state.nextRoute===noncoding.state.nextRoute,'Route identity diverged.');
  expect(token.tokens.length===2&&punct.completed&&band.state.zone==='firm','Primitive chain failed.');
  expect(zero.state.grip==='zero'&&mudra.state.bodyState==='ready'&&jick.state.gift==='permission'&&mood.state.after==='clear','Embodied chain failed.');
  expect(quadze.keeperResults[0].passed&&tbs.state.roles.intent==='open:door','Quadze/string chain failed.');
  return {cading:cading.receipt.resultDigest,speak:speak.receipt.resultDigest,mark:mark.receipt.resultDigest,tbs:tbs.receipt.resultDigest,token:token.receipt.resultDigest,punct:punct.receipt.resultDigest,born:born.receipt.resultDigest,glyph:glyph.receipt.resultDigest,gate:gate.receipt.resultDigest,band:band.receipt.resultDigest,contact:contact.receipt.resultDigest,field:field.receipt.resultDigest,frame:frame.receipt.resultDigest,morse:morse.receipt.resultDigest,zero:zero.receipt.resultDigest,mudra:mudra.receipt.resultDigest,jick:jick.receipt.resultDigest,mood:mood.receipt.resultDigest,quadze:quadze.receipt.resultDigest,noncoding:noncoding.receipt.resultDigest,finalState:state};
});
check('51 Continuous route is deterministic',()=>{
  const run=()=>{const gate=FormulaGate.execute(FORMULA_GATE_SOURCE,{force:6,focus:5},{door:{authorized:false,state:'closed'}});const contact=ContactCode.execute(CONTACT_CODE_SOURCE,{target:'door',pressure:5,hold:250},gate.state);const frame=RouteFrame.execute(ROUTE_FRAME_SOURCE,contact.state);return {gate:gate.state,contact:contact.state,frame:frame.state};};
  const a=run(),b=run();expect(stable(a)===stable(b),'Continuous route was not deterministic.');return a;
});

const failed=checks.filter(item=>!item.passed);
const receipt={schema:'jm.sovereign-batch-three.conformance/1.0',bodies:['Cading','Quadze','Speakuals','Mark-Level Syntax','TBS.String','TokenBody','PunctBody','GlyphBody','RouteFrame','StateField','ContactBand','FormulaGate','Formula-Born Code','Noncoding-Code','ContactCode','MorseMinus','MorseMinus ZeroGrip','Mudra Code','JickMa / JickMah','Mood Drills'],passed:checks.length-failed.length,failed:failed.length,checks,digest:digest(checks)};
console.log(JSON.stringify(receipt,null,2));
if(failed.length)process.exitCode=1;
