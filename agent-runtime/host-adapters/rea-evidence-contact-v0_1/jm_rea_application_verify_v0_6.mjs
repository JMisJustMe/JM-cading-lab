/* v0.6 independent source grammar + actual JM GameCoding application consequence parity. */
import crypto from 'node:crypto';
import {RouteScript,TraceBoxRuntime} from '../../../coding-estate/sovereign-ten/direct/route-proof-native.mjs';
import {GameCoding,GameCodingRuntime,JMGameCore,JMGameCoreRuntime} from '../../../coding-estate/sovereign-ten/direct/game-native.mjs';
import {GAME_CODING_SOURCE,JM_GAMECORE_SOURCE,INITIAL_FACTS} from '../../../coding-estate/sovereign-ten/direct/native-corpus.mjs';
import {routeCases} from './jm_rea_route_verify_v0_5.mjs';
import {independentRouteRun,normaliseOriginalTrace} from './jm_rea_route_consequence_v0_5.mjs';
import {independentRouteParse,independentRouteLower,independentGameParse,independentGameLower,
 independentCoreParse,independentCoreLower} from './jm_rea_source_parser_v0_6.mjs';
import {IndependentGameRuntime,IndependentGameCore,normaliseNativeGameTrace,
 normaliseNativeCoreTrace} from './jm_rea_game_application_v0_6.mjs';
import {JM32} from '../../../coding-estate/sovereign-ten/direct/language-native.mjs';
const sha=x=>crypto.createHash('sha256').update(JSON.stringify(x)??'undefined').digest('hex');
const equal=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
const slimOutcome=x=>Array.isArray(x)?x.map(slimOutcome):x&&typeof x==='object'&&'applied'in x?
  {name:x.name,applied:x.applied}:x;
const corpus=[
 {name:'GameCoding',source:GAME_CODING_SOURCE,native:GameCoding.parse,own:independentGameParse,
  nativeLower:GameCoding.lower,ownLower:independentGameLower},
 {name:'JMGameCore',source:JM_GAMECORE_SOURCE,native:JMGameCore.parse,own:independentCoreParse,
  nativeLower:JMGameCore.lower,ownLower:independentCoreLower}
];
const policy=['policy ParityGate {',' clause Contact {',' when receipt.executed == true',
 ' oblige verdict.tested = true',' }',' clause PreventCrown {',
 ' when receipt.ownerDevice != true',' sanction verdict.promotable = false',' }','}'].join('\n');

export function verifyFullSourceAndApplication({gameReplica=IndependentGameRuntime}={}){
 const trace=new TraceBoxRuntime();trace.create('JM_REA_APP_V06');
 let routes=0,sourceEqual=0,routeStatesEqual=0;
 const mismatches=[];
 for(const item of routeCases){
  const orig=RouteScript.parse(item.source),replica=independentRouteParse(item.source);
  const origIR=RouteScript.lower(orig).graphs[0],cloneIR=independentRouteLower(replica).graphs[0];
  const astEqual=equal(orig,replica),graphEqual=equal(origIR,cloneIR);
  const servicesA={markStarted:()=>true},servicesB={markStarted:()=>true};
  const baseline=RouteScript.run(origIR,item.state,servicesA);
  const reconstructed=independentRouteRun(cloneIR,item.state,servicesB);
  const consequence=equal(baseline.state,reconstructed.state)
   &&baseline.transitions===reconstructed.transitions
   &&equal(normaliseOriginalTrace(baseline.trace),reconstructed.events);
  routes++;if(astEqual&&graphEqual)sourceEqual++;if(consequence)routeStatesEqual++;
  if(!astEqual||!graphEqual||!consequence)
   mismatches.push({case:item.name,kind:'route',astEqual,graphEqual,consequence});
 }
 const gameNativeAst=GameCoding.parse(GAME_CODING_SOURCE);
 const coreNativeAst=JMGameCore.parse(JM_GAMECORE_SOURCE);
 const gameOwnAst=independentGameParse(GAME_CODING_SOURCE);
 const coreOwnAst=independentCoreParse(JM_GAMECORE_SOURCE);
 const sourceProof=corpus.map(spec=>{
  const n=spec.native(spec.source),o=spec.own(spec.source);
  const ast=equal(n,o);
  const lower=equal(spec.nativeLower(n),spec.ownLower(o));
  if(!ast||!lower)mismatches.push({case:spec.name,kind:'source-parser',ast,lower});
  return {language:spec.name,ast,lower,original_sha256:sha(spec.source)};
 });
 let games=0,steps=0,matchedGames=0,matchingSteps=0;
 let frameUpdates=0,collisionSteps=0,combos=0,dispatches=0;
 const summaries=[];
 for(let i=0;i<96;i++){
  const input=structuredClone(INITIAL_FACTS);
  input.door.authorized=i%3!==0;
  input.door.allowed=i%4!==0;
  input.player.position=i%2?4:2;
  input.door.state=i%6===0?'open':'closed';
  const original=new GameCodingRuntime(gameNativeAst,input);
  const replica=new gameReplica(gameOwnAst,input);
  const coreOriginal=new JMGameCoreRuntime(coreNativeAst,original);
  const coreReplica=new IndependentGameCore(coreOwnAst,replica);
  const frames=[0,1,2,59,60,61,75,120][i%8];
  const actions=[
   {type:'trigger',name:'OpenDoor'},{type:'collision'},
   {type:'combo',name:'UnlockAndOpen'},{type:'dispatch'},
   {type:'frames',count:frames},{type:'trigger',name:'CloseDoor'},
   {type:'collision'}];
  let whole=true;
  for(const action of actions){
   let originalOut,replicaOut;
   if(action.type==='trigger'){
    originalOut=original.trigger(action.name);
    replicaOut=replica.trigger(action.name);
   }else if(action.type==='collision'){
    collisionSteps++;originalOut=original.collide();replicaOut=replica.collide();
   }else if(action.type==='combo'){
    combos++;originalOut=original.combo(action.name);replicaOut=replica.combo(action.name);
   }else if(action.type==='dispatch'){
    dispatches++;
    originalOut=coreOriginal.dispatch('PlayerInteraction','DoorCollision');
    replicaOut=coreReplica.dispatch('PlayerInteraction','DoorCollision');
    originalOut={identity:originalOut.identity,event:originalOut.event,executions:slimOutcome(originalOut.executions)};
    replicaOut={identity:replicaOut.identity,event:replicaOut.event,executions:slimOutcome(replicaOut.executions)};
   }else if(action.type==='frames'){
    for(let f=0;f<action.count;f++){original.simulateFrame();replica.simulateFrame();}
    frameUpdates+=action.count;
    originalOut={frame:original.frame};replicaOut={frame:replica.frame};
   }
   const ok=equal(slimOutcome(originalOut),slimOutcome(replicaOut))
     &&equal(original.state,replica.state)
     &&original.frame===replica.frame
     &&equal(normaliseNativeGameTrace(original.trace.events),replica.trace)
     &&equal(normaliseNativeCoreTrace(coreOriginal.trace.events),coreReplica.trace);
   steps++;
   if(ok)matchingSteps++;else{
    whole=false;
    if(mismatches.length<20)mismatches.push({case:'session-'+i,step:action.type,
      original_sha256:sha({out:originalOut,state:original.state,frame:original.frame}),
      replica_sha256:sha({out:replicaOut,state:replica.state,frame:replica.frame})});
   }
  }
  games++;if(whole)matchedGames++;
  trace.append('JM_REA_APP_V06',{kind:whole?'application.parity':'application.drift',
    session:i,state_sha256:sha(original.state),frames:original.frame,
    game_trace_count:original.trace.events.length,core_trace_count:coreOriginal.trace.events.length});
  if([0,1,10,59,60,95].includes(i))summaries.push({session:i,frames:original.frame,
    final_state_sha256:sha(original.state),matched:whole});
 }
 const proof=JM32.execute(policy,{receipt:{executed:true,ownerDevice:false},
   verdict:{tested:false,promotable:false}}).runtime.state.verdict;
 if(!proof.tested||proof.promotable)throw Error('V06_JM32_GUARD');
 if(trace.query('JM_REA_APP_V06',{kind:'application.parity'}).length!==matchedGames)
   throw Error('V06_TRACEBOX_READBACK');
 return {
  schema:'JM.REA.IndependentSourceApplicationParity/0.6',
  route_source:{cases:routes,ast_and_ir_matches:sourceEqual,consequence_matches:routeStatesEqual},
  application_source:sourceProof,
  game_sessions:{count:games,matched:matchedGames,steps,matching_steps:matchingSteps,
    total_frame_updates:frameUpdates,collision_steps:collisionSteps,combos,gamecore_dispatches:dispatches},
  mismatches:mismatches.slice(0,20),trace_events:trace.replay('JM_REA_APP_V06').length,
  proof:proof,examples:summaries,
  original_jm_bodies:['RouteScript','GameCoding','GameCodingRuntime','JMGameCore',
   'JMGameCoreRuntime','TraceBoxRuntime','JM32'],
  independence:{source_parser:true,graph_lowerer:true,game_runtime:true,
   uses_original_native_parse_to_power_replica:false},
  scope:'SOVEREIGN_TEN_MICRO_APPLICATION_PARITY_ONLY_NOT_PHONE_GAME_OR_FULL_COMPILER'
 };
}
