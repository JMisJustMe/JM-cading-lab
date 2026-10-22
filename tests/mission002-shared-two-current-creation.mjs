import assert from 'node:assert/strict';
import fs from 'node:fs';
import {executePortable} from '../coding-estate/everybody/compiler-core.mjs';
import {executeSharedTwoCurrentCreation,ORIGINAL_SHARED_EXCHANGE} from '../coding-estate/integration/shared-two-current-creation.mjs';
import {gaugeCreativeContact,THEOPLUS_GAUGER_SOURCE} from '../coding-estate/integration/theoplus-source-gauger-contact.mjs';
let checks=0;
const test=(value,name)=>{assert.ok(value,name);checks++};
const mustThrow=(fn,re)=>{assert.throws(fn,re);checks++};
const bridge=['right','reach','right','right','reach','free',...Array(10).fill('right'),...Array(10).fill('right')];
const input=JSON.parse(JSON.stringify(bridge));
const game=executeSharedTwoCurrentCreation({medium:'game',kind:'bridge',actions:input});
test(JSON.stringify(input)===JSON.stringify(bridge),'IMMUTABLE_INPUT');
test(game.original.sha256==='63794bab0bdf612d1af5c6c3c0e2141bbf80a8ff33dbe64f4a416bb4290f85d3','ORIGINAL_SOURCE_AUTHORITY');
test(game.state.schema==='jm.m002.game-contact/1','RECIPIENT_IDENTITY');
test(game.state.world.earned.every(Boolean),'BOTH_CONNECTIONS');
test(game.state.world.reentries===2,'FREE_AND_HAZARD_RECOVERY');
test(game.state.world.hazardEncountered===true,'ACTUAL_HAZARD_EXECUTED');
test(game.state.world.completed===true,'BRIDGE_COMPLETION_BY_MOVEMENT');
test(game.state.world.position.x===10,'BRIDGE_GATE_REACHED');
test(game.state.events.length===input.length,'EXECUTED_EVENTS');
test(game.trace.filter(t=>t.phase==='EARN').length===2,'EARNED_LINK_TRACE');
test(game.trace.filter(t=>t.phase==='REENTER').length===2,'RECOVERY_TRACE');
test(game.trace.some(t=>t.phase==='COMPLETE'),'COMPLETION_TRACE');
test(game.oneBody.receipt.ok===true,'ONEBODY_RUNTIME');
test(game.oneBody.receipt.state.earned_connections===2,'ONEBODY_EARNED');
test(game.oneBody.receipt.state.reentries===2,'ONEBODY_RECOVERIES');
test(game.oneBody.receipt.state.completed===true,'ONEBODY_COMPLETED');
test(game.oneBody.portable.contracts.targetAuthority===false,'NO_UNEARNED_TARGET_AUTHORITY');
test(executePortable(JSON.parse(JSON.stringify(game.oneBody.portable))).state.output_units===input.length,'PORTABLE_REEXECUTION');
const attempted=executeSharedTwoCurrentCreation({medium:'game',kind:'bridge',actions:['right','reach',...Array(12).fill('right')]});
test(attempted.state.world.earned[0]===true&&!attempted.state.world.earned[1],'INCOMPLETE_NO_AUTOCREDIT');
test(!attempted.state.world.completed,'INCOMPLETE_GATE_BLOCKED');
test(attempted.trace.some(x=>x.phase==='GATE_HOLD'),'CAUSAL_GATE_HOLD');
test(attempted.state.world.position.x===4,'NO_UNEARNED_CROSSING');
const arena=['right','right','up','reach','free','up',...Array(4).fill('right'),'down','down','reach','free',
 ...Array(3).fill('right'),'up',...Array(6).fill('right'),'down'];
const comic=executeSharedTwoCurrentCreation({medium:'comic',kind:'arena',actions:arena});
test(comic.state.schema==='jm.m002.comic-sequence/1','COMIC_RECIPIENT_IDENTITY');
test(comic.state.panels.length===arena.length,'REAL_PANELS_FROM_ACTION');
test(comic.state.panels.filter(p=>p.shot==='close-up').length===2,'EARNED_PANEL_CAUSAL');
test(comic.state.panels.filter(p=>p.shot==='wide-return').length===3,'RECOVERED_PANEL_CAUSAL');
test(comic.state.panels.some(p=>p.shot==='resolution'&&p.continuity.completed),'RESOLUTION_PANEL');
test(comic.state.world.completed&&comic.state.world.earned.every(Boolean),'ARENA_REAL_CONSEQUENCE');
test(comic.state.world.reentries===3,'ARENA_REENTRY');
test(comic.state.productionState==='STORYBOARD_JSON_NOT_ILLUSTRATED_PAGE','NO_FAKE_ARTWORK_PROOF');
test(comic.oneBody.receipt.ok&&comic.oneBody.receipt.state.output_units===arena.length,'ONEBODY_COMIC_PORTABLE');
test(executePortable(JSON.parse(JSON.stringify(comic.oneBody.portable))).state.completed===true,'COMIC_PORTABLE_REEXECUTION');
test(JSON.stringify(game.state)!==JSON.stringify(comic.state),'DISTINCT_MEDIA_RECEIVERS');
test(game.state.identity!==comic.state.identity,'DISTINCT_AUTHORIAL_RECIPIENT_IDENTITIES');
mustThrow(()=>executeSharedTwoCurrentCreation({medium:'movie',kind:'bridge',actions:['right']}),/MEDIUM_HOLD/);
mustThrow(()=>executeSharedTwoCurrentCreation({medium:'comic',kind:'unknown',actions:['right']}),/SELECTION_HOLD/);
mustThrow(()=>executeSharedTwoCurrentCreation({medium:'comic',kind:'arena',actions:['delete']}),/SELECTION_HOLD/);
mustThrow(()=>executeSharedTwoCurrentCreation({medium:'game',kind:'bridge',actions:[]}),/SELECTION_HOLD/);
mustThrow(()=>executeSharedTwoCurrentCreation({medium:'game',kind:'bridge',actions:Array(81).fill('right')}),/SELECTION_HOLD/);
const gameBefore=JSON.stringify(game.state),comicBefore=JSON.stringify(comic.state);
const measuredGame=gaugeCreativeContact(game,'executed-event-state');
const measuredComic=gaugeCreativeContact(comic,'comic-storyboard');
const untestedGame=gaugeCreativeContact(game,'rendered-playable-game');
const untestedComic=gaugeCreativeContact(comic,'illustrated-comic');
test(measuredGame.status==='EXECUTED_SCOPE_GAUGED'&&measuredComic.status==='EXECUTED_SCOPE_GAUGED','THEOPLUS_ACTUAL_PROVEN_SCOPE');
test(measuredGame.record.record.possibility_states[0]==='POSSIBLE_NOW','THEOPLUS_PROVEN_STATE');
test(measuredComic.logic.verified===true,'JMLOGIC_REAL_EXECUTION');
test(untestedGame.status==='UNTESTED_SCOPE_HELD'&&untestedComic.status==='UNTESTED_SCOPE_HELD','NO_FAKE_RENDER_PROOF');
test(untestedGame.record.record.possibility_states[0]==='NOT_YET_TESTED','NOT_IMPOSSIBLE');
test(untestedComic.record.record.limit.location==='ILLUSTRATED_PAGE_RENDERING','PRECISE_PROOF_LIMIT');
test(untestedGame.record.record.limit.cause_status==='UNKNOWN','NO_INVENTED_CAUSE');
test(THEOPLUS_GAUGER_SOURCE.sha256==='02fe3fea097df6ee9485051e9611eec5d0d57bc1f013456703d3975c9a804a13','GAUGER_EXACT_SOURCE_HASH');
test(JSON.stringify(game.state)===gameBefore&&JSON.stringify(comic.state)===comicBefore,'GAUGER_READONLY_RECIPIENT');
mustThrow(()=>gaugeCreativeContact(game,'fully-shipped-apk'),/CLAIM_BOUNDARY_HOLD/);
fs.mkdirSync('qa/m002-foundations',{recursive:true});
fs.writeFileSync('qa/m002-foundations/THEOPLUS_GAUGER_GAME.json',JSON.stringify(measuredGame,null,2)+'\n');
fs.writeFileSync('qa/m002-foundations/THEOPLUS_GAUGER_COMIC.json',JSON.stringify(measuredComic,null,2)+'\n');
fs.writeFileSync('qa/m002-foundations/THEOPLUS_GAUGER_HOLDS.json',JSON.stringify({game:untestedGame,comic:untestedComic},null,2)+'\n');
const out={schema:'jm.m002.workstream4.original-shared-mechanism/1',status:'PASS',checks,
  original:{sha256:ORIGINAL_SHARED_EXCHANGE.sha256,file:ORIGINAL_SHARED_EXCHANGE.file},
  actualRecipients:[{media:'game',schema:game.state.schema,earned:game.state.world.earned,
    reentries:game.state.world.reentries,completed:game.state.world.completed,units:game.state.events.length},
   {media:'comic',schema:comic.state.schema,earned:comic.state.world.earned,reentries:comic.state.world.reentries,
    completed:comic.state.world.completed,units:comic.state.panels.length}],
  proof:'HOST_ACTUAL_EXECUTION_AND_PORTABLE_REEXECUTION',
  theoplus:{gaugerSchema:measuredGame.record.$schema,sourceSha256:THEOPLUS_GAUGER_SOURCE.sha256,
    logicExecuted:measuredComic.logic.verified,gameClaim:measuredGame.status,comicClaim:measuredComic.status,
    renderedGame:untestedGame.status,illustratedComic:untestedComic.status},
  holds:['exact original JS not run in CI (independently executed from Library locally)','THEOGRAPHY native original','complete TheoPlus engine (bounded Gauger adapted)','rendered comic','physical Android owner acceptance']};
fs.mkdirSync('qa/m002-foundations',{recursive:true});
fs.writeFileSync('qa/m002-foundations/CONTACT_RECEIPT.json',JSON.stringify(out,null,2)+'\n');
fs.writeFileSync('qa/m002-foundations/GAME_EXECUTED.json',JSON.stringify(game.state,null,2)+'\n');
fs.writeFileSync('qa/m002-foundations/COMIC_STORYBOARD.json',JSON.stringify(comic.state,null,2)+'\n');
fs.writeFileSync('qa/m002-foundations/ONEBODY_GAME_PORTABLE.json',JSON.stringify(game.oneBody.portable,null,2)+'\n');
fs.writeFileSync('qa/m002-foundations/ONEBODY_COMIC_PORTABLE.json',JSON.stringify(comic.oneBody.portable,null,2)+'\n');
console.log(JSON.stringify(out));
