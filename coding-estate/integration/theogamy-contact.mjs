/**
 * JM THEOGAMY / Shared Mechanisms — additive operational contact v0.1.
 * Reuses the existing 100-body router and native coding/game/render-contact bodies.
 * Source ancestors are untouched. Gardles-native is a distinct HOLD, not a guard alias.
 */
import {planEstateRoute, validateRegistry} from './router-core.mjs';
import {contactEvent} from './ftr-eight-contact.mjs';
import {runAllAdoptionProofs} from './adoption-proofs.mjs';
import {Parser} from '../sovereign-batch-five/direct/compiler-lab-native.mjs';
import {GameCoding, GameCodingRuntime, JMGameCore, JMGameCoreRuntime} from '../sovereign-ten/direct/game-native.mjs';
import {JMVisualGraft, JMVisualRuntime} from '../sovereign-batch-six/direct/game-input-native-a.mjs';
const COPY = value => JSON.parse(JSON.stringify(value));
const need = (ok,why) => {if(!ok)throw new Error(why)};
export const THEOGAMY_AUTHORITY=Object.freeze({
 schema:'jm.theogamy.shared-contact/0.1',
 source:'JM Shared Mechanisms v1.2 — All-Game Exchange Lab',
 registry:'JM Sovereign Estate Integration v1 — 100-body router',
 gardles:'HOLD_NATIVE_SOURCE_NOT_MOUNTED',
 scope:'repo-host executable adaptation; NOT complete Estate installation, Gardles-native execution or Android/GPU proof'
});
/**
 * CP03: Existing MEETPOINT/Shared Mechanisms consumes a JM FTR KicPlay contact.
 * Deliberately keeps the original world rules and the standalone FTR contract.
 * A Wake is a real in-world reentry; other actions do not silently trigger it.
 * Physical Ama-Pro / gloves / Gamepad execution remains a separate owner proof.
 */
export function wakeMEETPOINTFromFTR({world,contact,playerIndex=0}){
  need(contact?.schema==='jm.ftr.contact-event/1','FTR_INPUT_SCHEMA');
  // Re-validate at the receiving body: never trust an unproven adapter label.
  let canonical;
  try {
    canonical=contactEvent({
      source:contact.source,gesture:contact.gesture,pressure:contact.pressure,
      sequence:contact.sequence,capabilities:contact.capabilities
    });
  } catch(error) {
    throw Object.assign(new Error('FTR_INPUT_REJECTED'),{cause:error});
  }
  need(JSON.stringify(canonical)===JSON.stringify(contact),'FTR_INPUT_NOT_CANONICAL');
  need(canonical.kicPlay==='Wake','FTR_CONTACT_NOT_WAKE');
  need(Number.isSafeInteger(playerIndex)&&playerIndex>=0,'PLAYER_INDEX');
  const actor=world?.players?.[playerIndex];
  need(!!actor,'PLAYER_MISSING');
  const from={island:actor.island,x:actor.x,y:actor.y,goal:actor.goal===undefined?null:COPY(actor.goal)};
  const before=JSON.stringify(world);
  const result=sharedReentry(world,playerIndex);
  need(before===JSON.stringify(world),'WORLD_SOURCE_MUTATED');
  need(JSON.stringify(result.state.islands)===JSON.stringify(world.islands),'WORLD_PROGRESS_LOST');
  need(result.state.mode===world.mode,'WORLD_MODE_CHANGED');
  return {
    schema:'jm.meetpoint.ftr-wake-return/0.1',
    originalIdentity:world.schema, inputSource:canonical.source, inputSequence:canonical.sequence,
    route:canonical.kicPlay, player:actor.id, from,
    to:{island:result.state.players[playerIndex].island,
      x:result.state.players[playerIndex].x,y:result.state.players[playerIndex].y,
      goal:result.state.players[playerIndex].goal},
    result, trace:{stateMutated:true, originalPreserved:true, earnedIslandsPreserved:true},
    proof:'NODE_HOST_EXISTING_MEETPOINT_RULES_ONLY',
    physicalDevice:'NOT_TESTED',gardles:'HOLD_NATIVE_SOURCE_NOT_MOUNTED'
  };
}

/** Source-derived adaptation of Shared Mechanisms v1.2 safeReentry(world). */
export function sharedReentry(original,playerIndex=0){
 need(original && original.schema==='jm.meetpoint.world/0.1','WORLD_SCHEMA');
 need(original.players && original.players[playerIndex],'PLAYER_MISSING');
 const state=COPY(original),actor=state.players[playerIndex];
 const spawn={A:{x:-495,y:36},B:{x:495,y:36},C:{x:0,y:66}}[actor.island];
 need(spawn,'ISLAND_UNKNOWN');
 actor.x=spawn.x;actor.y=spawn.y;actor.goal=null;
 state.events=Array.isArray(state.events)?state.events:[];
 state.events.unshift({event:'THEOGAMY_REENTRY',description:'Safe return; earned structures and resources preserved',t:Math.round(Number(state.age)||0)});
 state.events=state.events.slice(0,75);
 return {state,receipt:{status:'EXECUTED_ADAPTATION',source:THEOGAMY_AUTHORITY.source,player:actor.id,mode:state.mode}};
}
export function executeNativeContacts(){
 const grammar='grammar ContactWord {\n token OPEN /open/\n skip WS /\\s+/\n rule Command = [OPEN] meaning=contact.open\n}';
 const parsed=Parser.execute(grammar,'open');
 const game='entity Island {\n established = false\n}\nmechanic Establish {\n requires island.established == false\n effect island.established = true\n}';
 const core='organ IslandOrgan {\n handles = [Island]\n rules = [Establish]\n invariants = {\n island.established == true\n }\n}\nsystem IslandSystem {\n organs = [IslandOrgan]\n events = [Advance]\n identity = "JM.MEETPOINT.World.v0.1"\n}';
 const gameAST=GameCoding.parse(game),gameRuntime=new GameCodingRuntime(gameAST,{},{});
 const coreAST=JMGameCore.parse(core),coreRuntime=new JMGameCoreRuntime(coreAST,gameRuntime);
 const dispatch=coreRuntime.dispatch('IslandSystem','Advance');
 const graft='visualgraft IslandFeedback {\n mechanic: establish\n state_path: island.state\n expression: "island-{state}"\n asset: island_marker\n contact: tap\n}';
 const interaction='interaction IslandTouch {\n field: island\n inputs: ["tap","drag","hold"]\n state_path: input.last\n feedback: pulse\n render: immediate\n}';
 const visual=JMVisualGraft.execute(graft,{island:{state:'established'}});
 const touch=JMVisualRuntime.execute(interaction,{type:'tap',value:'establish'},{});
 need(dispatch.state.island.established===true,'GAME_CORE_NO_EFFECT');
 need(visual.state.mechanicLinked && touch.result.consequenceReadable,'VISUAL_CONTACT_NO_EFFECT');
 return {parser:{meaning:parsed.tree.meaning,receipt:parsed.receipt.resultDigest},
  game:{identity:dispatch.identity,changed:dispatch.state.island.established,receipt:dispatch.receipt.resultDigest},
  rendererContact:{mechanicLinked:visual.state.mechanicLinked,consequenceReadable:touch.result.consequenceReadable,
    receipts:[visual.receipt.resultDigest,touch.receipt.resultDigest],gpu3D:'NOT_TESTED'},
  source:'JM-native Parser / Game-CODING / JM GameCore / JMVisualGraft / JMVisualRuntime'};
}
export function executeTheogamyContact({registry,objective,world}){
 need(registry && validateRegistry(registry).valid,'INTEGRATION_REGISTRY_INVALID');
 const route=planEstateRoute(objective,registry,{includeDelivery:true});
 const adoption=runAllAdoptionProofs(); // EXISTING game, parser/compiler/tool and OS-native pipelines
 need(adoption.passed,'EXISTING_ADOPTION_PROOFS_FAILED');
 const contact=executeNativeContacts(),reentry=sharedReentry(world);
 need(JSON.stringify(world.islands)===JSON.stringify(reentry.state.islands),'WORLD_PROGRESS_LOST');
 return {schema:THEOGAMY_AUTHORITY.schema,route,adoption,contact,reentry,
  gardles:{body:'Gardles',native:'HOLD_SOURCE_NOT_MOUNTED',substituted:false},
  proof:'HOST_EXECUTION_ONLY',originalsMutated:false};
}
