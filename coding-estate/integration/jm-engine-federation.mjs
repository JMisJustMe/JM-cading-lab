// Additive native engine capability bridge for existing JM Build Mesh. Not a second engine.
import {gameChain} from '../sovereign-ten/direct/game-native.mjs';
import {JMVisualGraft,JMVisualRuntime,GlyphForge,GlyphPlay} from '../sovereign-batch-six/direct/game-input-native-a.mjs';
import {planEstateRoute,validateRegistry} from './router-core.mjs';
import {executeSourceAwareCreation} from './source-aware-creation.mjs';
import {GameForgeSpaces} from './gameforge-spaces.mjs';
import {GameForgeEncounter} from './gameforge-encounter.mjs';
import {buildJMSpatialRoom} from './gameforge-spatial-grammar.mjs';
import {installJMActualRenderer} from './jm-actual-renderer-organ.mjs';
import {GAMEFORGE_DONOR_SHA256} from './gameforge-world-carrier.mjs';
export const jmFederatedRendererInstall=installJMActualRenderer;
export const JM_ENGINE_MCP_TOOLS=Object.freeze([
 {name:'jm_engine_inventory',description:'Source-owned JM engine organs and proof boundaries',inputSchema:{type:'object',properties:{}}},
 {name:'jm_engine_plan',description:'Route through the original 100-body estate router; plan only',inputSchema:{type:'object',properties:{goal:{type:'string'},current64:{type:'object'}},required:['goal','current64']}},
 {name:'jm_engine_core_contact',description:'Run original Game-CODING and JM GameCore sources and native dispatch',inputSchema:{type:'object',properties:{gameSource:{type:'string'},coreSource:{type:'string'},initialState:{type:'object'}},required:['gameSource','coreSource']}},
 {name:'jm_engine_visual_contact',description:'Execute source-owned GameCore into visual input/state, VisualGraft, GlyphForge and GlyphPlay, preserving identities',inputSchema:{type:'object',properties:{gameSource:{type:'string'},coreSource:{type:'string'},initialState:{type:'object'},visualGraftSource:{type:'string'},interactionSource:{type:'string'},glyphForgeSource:{type:'string'},glyphPlaySource:{type:'string'},game:{type:'object'},glyph:{type:'string'},input:{type:'object'}},required:['gameSource','coreSource','visualGraftSource','interactionSource','glyphForgeSource','glyphPlaySource','game','glyph','input']}},
 {name:'jm_engine_world_contact',description:'Source-hash checked native world, GameForge state and actual JM 3D geometry; no GPU claim',inputSchema:{type:'object',properties:{source:{type:'object'}},required:['source']}}
]);
const DONORS=[
 {name:'Game-CODING / JM GameCore',path:'coding-estate/sovereign-ten/direct/game-native.mjs',contact:'NATIVE_RUNTIME'},
 {name:'Estate 100-body router',path:'coding-estate/integration/router-core.mjs',contact:'COMPATIBILITY_ROUTE_ONLY'},
 {name:'Native source/world operator',path:'coding-estate/integration/source-aware-creation.mjs',contact:'SHA256_TO_NATIVE_RUNTIME'},
 {name:'GameForge connected spaces',path:'coding-estate/integration/gameforge-spaces.mjs',contact:'SPATIAL_STATE_AND_PLAYER_INTERACTION'},
 {name:'JMVisualGraft / JM Visual Interaction Runtime / GlyphForge / GlyphPlay',path:'coding-estate/sovereign-batch-six/direct/game-input-native-a.mjs',contact:'NATIVE_INPUT_STATE_VISUAL_EXPRESSION_AND_GLYPH_CONTROL'},
 {name:'JM spatial grammar',path:'coding-estate/integration/gameforge-spatial-grammar.mjs',contact:'SOURCE_DEPENDENT_3D_GEOMETRY'},
 {name:'JM Actual Engine renderer',path:'coding-estate/integration/jm-actual-renderer-organ.mjs',contact:'EXACT_WEBGL_RENDERER_FUNCTION_BROWSER_PROOF_SEPARATE'},
 {name:'GameForge v3.16',path:'estate-publication/apps-tools-games/games-engines/source-authorities/gameforge-v3.16/transport/',sha256:GAMEFORGE_DONOR_SHA256,contact:'SOURCE_HASH_GATE'},
 {name:'Gardles',path:null,contact:'HOLD_NATIVE_SOURCE_NOT_MOUNTED_NO_ALIAS'}
];
const need=(truth,code)=>{if(!truth)throw Error(code)};
const validRegistry=registry=>{const r=validateRegistry(registry);need(r.valid,'JM_ENGINE_REGISTRY_HOLD:'+r.failures.join(','));return registry};
const current64Activation=(field,route)=>{
 need(field?.schema==='JM.CodingEstate.Current64/1.0'&&field.counts?.current_coding_identities===64&&
 field.counts?.inherited_role_qualified===61&&field.counts?.post_census_new===3&&
 Array.isArray(field.identities)&&field.identities.length===64,'JM_ENGINE_CURRENT64_AUTHORITY_HOLD');
 const ids=field.identities.map(x=>x.code_id),slugs=field.identities.map(x=>x.slug);
 need(new Set(ids).size===64&&new Set(slugs).size===64,'JM_ENGINE_CURRENT64_DUPLICATE_HOLD');
 const selected=new Set(route.route.map(x=>x.id));
 const active=field.identities.filter(x=>selected.has(x.slug)).map(x=>({code_id:x.code_id,name:x.name,slug:x.slug,state:'SELECTED_FOR_ROUTE_NOT_EXECUTED'}));
 return {schema:'JM.CodingBodyActivation.Candidate/1',authority:'coding-estate/JM_CODING_ESTATE_CURRENT_64.json',
   active,availableCount:64-active.length,total:64,
   boundary:'The 100-body route selects a subset of the current 64 coding identities by slug; other game/renderer organs remain separately governed. Planning does not spawn or execute them.'};
};
const object=(mesh,x,y,z,sx,sy,sz,color,em=0,rotY=0)=>({mesh,x,y,z,sx,sy,sz,color,em,rotY});
const point=(x,y)=>({x:(x-450)/18,z:(y-285)/18});
const hash=async text=>{
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
 return Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
};
async function contactSpatial(world){
 need(world&&['burning','humanimals','tboys'].includes(world.body)&&world.spaces===3&&
 Number.isInteger(world.hazards)&&world.hazards>=0&&world.hazards<=20&&
 typeof world.targetX==='number'&&Number.isFinite(world.targetX)&&world.targetX>=500&&world.targetX<=780,'JM_ENGINE_WORLD_SPEC_HOLD');
 const model=GameForgeSpaces(world,GameForgeEncounter);
 const session=model.create();
 model.validate(session,false);
 const room=model.rooms[0];
 const geometry=buildJMSpatialRoom(room,session,object,point);
 const shape=geometry.models.map(({mesh,x,y,z,sx,sy,sz,rotY})=>[mesh,x,y,z,sx,sy,sz,rotY]);
 const objectiveBefore=model.objective(session).kind;
 const contact=model.interact(session,{x:room.key.x,y:room.key.y});
 need(contact.kind==='collect'&&session.collected.includes(room.key.id),'JM_ENGINE_GAME_CONTACT_HOLD');
 model.validate(session,false);
 return {
  worldBody:world.body,roomIdentities:model.rooms.map(r=>r.body),
  playerConsequence:{kind:contact.kind,key:contact.id,objectiveBefore,objectiveAfter:model.objective(session).kind},
  geometry:{signature:geometry.signature,modelCount:geometry.models.length,features:geometry.features,
    meshFamilies:[...new Set(geometry.models.map(x=>x.mesh))].sort(),nonColourShapeSha256:await hash(JSON.stringify(shape))},
  renderer:{nativeModule:'jm-actual-renderer-organ.mjs',sameOriginalInstall:typeof installJMActualRenderer==='function',gpu:'NOT_TESTED_IN_MCP_HOST'},
  boundary:'Authoritative GameForge state, player interaction and JM 3D geometry are executed; GPU/browser/Android remain separate.'
 };
}
export async function callJMEngineMcpTool(name,args={},registry=null){
 need(JM_ENGINE_MCP_TOOLS.some(t=>t.name===name),'JM_ENGINE_UNKNOWN_TOOL_HOLD');
 need(args&&typeof args==='object'&&!Array.isArray(args),'JM_ENGINE_ARGS_HOLD');
 if(name==='jm_engine_inventory')return {schema:'jm.engine-federation.inventory/1',donors:DONORS,boundary:'Source pointers and contact purposes do not transfer proof'};
 if(name==='jm_engine_plan'){
  need(typeof args.goal==='string'&&args.goal.trim(),'JM_ENGINE_GOAL_HOLD');
  const route=planEstateRoute(args.goal,validRegistry(registry));
  return {schema:'jm.engine-federation.plan/1',route,current64:current64Activation(args.current64,route),state:'PLAN_ONLY_NO_EXECUTION'};
 }
 if(name==='jm_engine_core_contact'){
  need(typeof args.gameSource==='string'&&args.gameSource.trim()&&typeof args.coreSource==='string'&&args.coreSource.trim(),'JM_ENGINE_SOURCE_HOLD');
  const n=gameChain(args.gameSource,args.coreSource,args.initialState??{});
  return {schema:'jm.engine-federation.core/1',core:{identity:n.dispatch.identity,event:n.dispatch.event,executions:n.dispatch.executions,receipt:n.dispatch.receipt},
    game:{state:n.game.state,frame:n.game.frame,receipt:n.game.receipt},boundary:'Real native runtime, not visual/owner-device proof'};
 }
 if(name==='jm_engine_visual_contact'){
  for(const key of ['gameSource','coreSource','visualGraftSource','interactionSource','glyphForgeSource','glyphPlaySource','glyph']){
   need(typeof args[key]==='string'&&args[key].trim(),'JM_ENGINE_VISUAL_SOURCE_HOLD:'+key);
  }
  need(args.game&&typeof args.game==='object'&&args.input&&typeof args.input==='object','JM_ENGINE_VISUAL_ARGUMENTS_HOLD');
  // No synthetic mechanics, renderer or source-free stand-in: each organ executes its own parser/runtime.
  const native=gameChain(args.gameSource,args.coreSource,args.initialState??{});
  const before=structuredClone(native.game.state);
  const input=JMVisualRuntime.execute(args.interactionSource,args.input,native.game.state);
  const graft=JMVisualGraft.execute(args.visualGraftSource,input.state);
  const glyphForge=GlyphForge.execute(args.glyphForgeSource,args.game);
  const glyphPlay=GlyphPlay.execute(args.glyphPlaySource,args.glyph,args.input);
  need(input.result.consequenceReadable&&graft.state.mechanicLinked&&glyphForge.state.controlIdentityPreserved&&glyphPlay.state.sourceRoutePreserved,'JM_ENGINE_VISUAL_CONSEQUENCE_HOLD');
  return {schema:'jm.engine-federation.visual/1',gameCore:{identity:native.dispatch.identity,event:native.dispatch.event,executions:native.dispatch.executions,receipt:native.dispatch.receipt},
   nativeGameState:before,visualInput:{before,after:input.state,result:input.result,receipt:input.receipt},
   visualGraft:{state:graft.state,receipt:graft.receipt},
   glyphForge:{state:glyphForge.state,receipt:glyphForge.receipt},glyphPlay:{state:glyphPlay.state,receipt:glyphPlay.receipt},
   boundary:'Original Game-CODING/GameCore + Visual Interaction Runtime + VisualGraft + GlyphForge/GlyphPlay executed. Visual expression/state contact is NOT a GPU frame or physical-device proof.'};
 }
 validRegistry(registry);
 need(args.source&&typeof args.source==='object','JM_ENGINE_SOURCE_REQUIRED_HOLD');
 const native=await executeSourceAwareCreation(args.source,registry);
 need(native.execution?.state==='WORLD_RECEIVER_EXECUTED_RENDER_PENDING','JM_ENGINE_NATIVE_WORLD_HOLD');
 const spatial=await contactSpatial(native.execution.result?.receiver?.world);
 return {schema:'jm.engine-federation.world/1',source:native.source,nativeState:native.execution.state,
  nativeReceipts:native.execution.result.receiver.receipts,spatial,
  state:'NATIVE_WORLD_AND_JM_SPATIAL_GEOMETRY_CONTACTED_RENDER_PENDING',
  boundary:'Existing source-verified JM game chain and GameForge geometry executed. No 3D pixels, Android or Samsung proof claimed.'};
}
