import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {JM_ENGINE_MCP_TOOLS,jmFederatedRendererInstall,callJMEngineMcpTool} from '../coding-estate/integration/jm-engine-federation.mjs';
import {GAME_CODING_SOURCE,JM_GAMECORE_SOURCE,INITIAL_FACTS} from '../coding-estate/sovereign-ten/direct/native-corpus.mjs';
import {VISUAL_GRAFT_SOURCE,VISUAL_RUNTIME_SOURCE,GLYPHFORGE_SOURCE,GLYPHPLAY_SOURCE} from '../coding-estate/sovereign-batch-six/direct/native-corpus.mjs';
import {NATIVE_CONNECTED_WORLD_EXAMPLE} from '../navigator/estate-integration/execution-lanes.mjs';

const root=JSON.parse(fs.readFileSync('coding-estate/integration/REGISTRY.json'));
const registry={...root,bodies:root.parts.flatMap(p=>JSON.parse(fs.readFileSync('coding-estate/integration/'+p)).bodies)};
const current64=JSON.parse(fs.readFileSync('coding-estate/JM_CODING_ESTATE_CURRENT_64.json'));
const bind=content=>({identity:'JM existing connected world original native source',content,sha256:createHash('sha256').update(content).digest('hex')});

const inventory=await callJMEngineMcpTool('jm_engine_inventory');
assert.equal(inventory.donors.find(x=>x.name==='Gardles').contact,'HOLD_NATIVE_SOURCE_NOT_MOUNTED_NO_ALIAS');
assert.equal(typeof jmFederatedRendererInstall,'function');
assert.deepEqual(JM_ENGINE_MCP_TOOLS.map(x=>x.name),['jm_engine_inventory','jm_engine_plan','jm_engine_core_contact','jm_engine_visual_contact','jm_engine_world_contact']);
const plan=await callJMEngineMcpTool('jm_engine_plan',{goal:'build a touch arena game with visual feedback and proof',current64},registry);
assert.equal(plan.state,'PLAN_ONLY_NO_EXECUTION');
assert.equal(plan.current64.total,64);
assert.equal(plan.current64.active.length+plan.current64.availableCount,64);
assert.ok(plan.current64.active.some(x=>x.slug==='game-coding'||x.slug==='gameforge'));
assert.ok(plan.current64.active.every(x=>x.state==='SELECTED_FOR_ROUTE_NOT_EXECUTED'));
assert.ok(plan.route.route.some(x=>x.id==='game-coding'||x.id==='jm-gamecore'));

const authorised={...structuredClone(INITIAL_FACTS),door:{...INITIAL_FACTS.door,authorized:true}};
const before=structuredClone(authorised);
const native=await callJMEngineMcpTool('jm_engine_core_contact',{gameSource:GAME_CODING_SOURCE,coreSource:JM_GAMECORE_SOURCE,initialState:authorised});
assert.equal(native.core.identity,'PlayerInteraction.v1');
assert.equal(native.game.state.door.state,'open');
assert.equal(native.core.executions[0].applied,true);
assert.deepEqual(authorised,before);
const denied=await callJMEngineMcpTool('jm_engine_core_contact',{gameSource:GAME_CODING_SOURCE,coreSource:JM_GAMECORE_SOURCE,initialState:INITIAL_FACTS});
assert.equal(denied.game.state.door.state,'closed');
assert.equal(denied.core.executions[0].applied,false);

const visualArgs={gameSource:GAME_CODING_SOURCE,coreSource:JM_GAMECORE_SOURCE,
 visualGraftSource:VISUAL_GRAFT_SOURCE,interactionSource:VISUAL_RUNTIME_SOURCE,
 glyphForgeSource:GLYPHFORGE_SOURCE,glyphPlaySource:GLYPHPLAY_SOURCE,
 game:{name:'DoorGame',identity:'DoorGame.v1',capabilities:['tap','drag','save']},
 glyph:'OPEN',input:{type:'tap',value:'opened'},
 initialState:authorised};
const visual=await callJMEngineMcpTool('jm_engine_visual_contact',visualArgs);
assert.equal(visual.gameCore.identity,'PlayerInteraction.v1');
assert.equal(visual.nativeGameState.door.state,'open');
assert.equal(visual.visualInput.after.door.input,'opened');
assert.equal(visual.visualGraft.state.expression,'door:open');
assert.equal(visual.glyphForge.state.controlIdentityPreserved,true);
assert.equal(visual.glyphPlay.state.sourceRoutePreserved,true);
const visualDenied=await callJMEngineMcpTool('jm_engine_visual_contact',{...visualArgs,initialState:INITIAL_FACTS});
assert.equal(visualDenied.visualGraft.state.expression,'door:closed');
assert.notEqual(visual.visualGraft.state.expression,visualDenied.visualGraft.state.expression);
await assert.rejects(()=>callJMEngineMcpTool('jm_engine_visual_contact',{...visualArgs,input:{type:'swipe',value:1}}),{code:'VRT_INPUT_UNKNOWN'});
await assert.rejects(()=>callJMEngineMcpTool('jm_engine_visual_contact',{...visualArgs,game:{...visualArgs.game,capabilities:['tap']}}),{code:'GLYPHFORGE_CAPABILITY_MISSING'});
await assert.rejects(()=>callJMEngineMcpTool('jm_engine_visual_contact',{...visualArgs,glyph:'UNKNOWN'}),{code:'GLYPHPLAY_GLYPH_UNKNOWN'});
assert.deepEqual(authorised,before);
const source=bind(NATIVE_CONNECTED_WORLD_EXAMPLE),frozen=structuredClone(source);
const burning=await callJMEngineMcpTool('jm_engine_world_contact',{source},registry);
assert.deepEqual(source,frozen);
assert.equal(burning.nativeState,'WORLD_RECEIVER_EXECUTED_RENDER_PENDING');
assert.equal(burning.spatial.playerConsequence.kind,'collect');
assert.equal(burning.spatial.geometry.features.body,'burning');
assert.ok(burning.spatial.geometry.modelCount>=48);
assert.equal(burning.spatial.renderer.sameOriginalInstall,true);
assert.equal(burning.spatial.renderer.gpu,'NOT_TESTED_IN_MCP_HOST');
const living=await callJMEngineMcpTool('jm_engine_world_contact',{source:bind(NATIVE_CONNECTED_WORLD_EXAMPLE.replaceAll('burning','humanimals'))},registry);
assert.equal(living.spatial.worldBody,'humanimals');
assert.notEqual(burning.source.sha256,living.source.sha256);
assert.notEqual(burning.spatial.geometry.signature,living.spatial.geometry.signature);
assert.notEqual(burning.spatial.geometry.nonColourShapeSha256,living.spatial.geometry.nonColourShapeSha256,'DISTINCTION_MUST_BE_MORE_THAN_COLOUR');

await assert.rejects(()=>callJMEngineMcpTool('jm_engine_world_contact',{source:{...source,content:source.content+' '}},registry),/SOURCE_HASH_HOLD/);
await assert.rejects(()=>callJMEngineMcpTool('jm_engine_world_contact',{source:{...source,sha256:'x'}},registry),/CONTRACT_HOLD/);
await assert.rejects(()=>callJMEngineMcpTool('jm_engine_plan',{goal:'game',current64},null),/REGISTRY|Cannot read/);
await assert.rejects(()=>callJMEngineMcpTool('jm_engine_plan',{goal:'game',current64:{schema:'x'}},registry),/CURRENT64_AUTHORITY_HOLD/);
await assert.rejects(()=>callJMEngineMcpTool('jm_engine_gardles',{},registry),/UNKNOWN_TOOL_HOLD/);
await assert.rejects(()=>callJMEngineMcpTool('jm_engine_world_contact',{},registry),/SOURCE_REQUIRED_HOLD/);
console.log(JSON.stringify({state:'PASS',nativeGameCoding:true,nativeGameCore:true,nativeSourceToWorld:true,
 nativeGameForgeContact:true,nativeVisualContact:true,glyphControlIdentity:true,jmRendererImported:true,nonColourGeometryDistinct:true,
 negativeHolds:true,gardles:'HOLD_NATIVE_SOURCE',webgl:'SEPARATE_GATE',android:'SEPARATE_GATE',ownerDevice:'SEPARATE_GATE'}));
