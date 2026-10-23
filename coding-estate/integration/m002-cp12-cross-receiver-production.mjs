/**
 * M002 CP12 - governed cross-receiver handoff.
 * Exact CURRENT CP11/CP10 native chain is executed before this envelope exists.
 * Game and comic retain separate identities; digest is corruption/conflict
 * detection, NOT remote author authentication or cloud durability.
 */
import {createHash} from 'node:crypto';
import {executeCP11Recipients} from './m002-cp11-real-recipient-effects.mjs';
const digest=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const own=x=>structuredClone(x);
const gate=x=>x?.status==='ACTUAL_RECIPIENT_MUTATION'&&x.changed&&
  x.receipt?.kind==='CP11_ACTUAL_RECIPIENT_DING'&&x.composition?.oneBody?.receipt?.ok===true;
export const CP12_AUTHORITY=Object.freeze({
 schema:'jm.m002.cp12.source-and-recipient-scope/1',
 original:'CP11 real game/comic native receivers -> CP10 5 independent mechanisms',
 integrity:'sha256 exact JSON bytes; NOT cryptographic author authentication',
 boundary:'Host-native materialized handoff/readback, NOT private FIVE//FLIP browser or Android device, cloud, or finished illustration'
});
export function prepareCP12Exchange({choice,subject,actions,game,comic,stations=3}){
 if(!['protect','explore','amplify'].includes(choice)||!Number.isInteger(stations)||stations<2||stations>4)
  throw Error('CP12_ROUTE_INPUT_HOLD');
 const gameSource=own(game),comicSource=own(comic);
 const common={choice,subject,actions:own(actions),stations};
 const gameReturn=executeCP11Recipients({...common,medium:'game'},game);
 const comicReturn=executeCP11Recipients({...common,medium:'comic'},comic);
 if(JSON.stringify(game)!==JSON.stringify(gameSource)||
  JSON.stringify(comic)!==JSON.stringify(comicSource))throw Error('CP12_ORIGINAL_CHANGED_HOLD');
 if(!gate(gameReturn)||!gate(comicReturn)){
  if(gameReturn.changed||comicReturn.changed)throw Error('CP12_SPLIT_GATE_HOLD');
  return {schema:'jm.m002.cp12.exchange-result/1',status:'HELD_NO_EXPORT',
   contact:gameReturn.composition?.contact?.state,
   recipients:{game:gameSource,comic:comicSource},envelope:null,
   mutationCount:0,authority:CP12_AUTHORITY};
 }
 const g=gameReturn.composition,c=comicReturn.composition;
 if(JSON.stringify(g.contact.state)!==JSON.stringify(c.contact.state)||
    g.choice.state.creative.response!==c.choice.state.creative.response||
    !g.logic.allowed||!c.logic.allowed||g.combibind.state.collapsed||c.combibind.state.collapsed)
   throw Error('CP12_INDEPENDENT_COMPOSITION_MISMATCH_HOLD');
 const body={
  schema:'jm.m002.cp12.cross-receiver-body/1',choice,subject,stations,
  source:{mechanisms:[...g.authorities.bodies],contact:own(g.contact.state),
   choiceReceipt:own(g.choice.receipt),gameWorldLaw:own(g.logic.decisions),
   comicWorldLaw:own(c.logic.decisions),portableDing:g.oneBody.receipt.ok},
  ancestors:{game:gameReturn.beforeSha256,comic:comicReturn.beforeSha256},
  receiving:{game:{schema:gameReturn.recipient.schema,state:own(gameReturn.recipient),
    changes:own(gameReturn.changes),nativeReceipt:gameReturn.receipt.digest},
    comic:{schema:comicReturn.recipient.schema,state:own(comicReturn.recipient),
     changes:own(comicReturn.changes),nativeReceipt:comicReturn.receipt.digest}},
  verifiedEffect:gameReturn.changes[0]?.type,
  account:'Distinct native recipients. Image production occurs at separately tested browser recipient.'
 };
 const raw=JSON.stringify(body);
 const envelope={schema:'jm.m002.cp12.cross-receiver-envelope/1',body:raw,
  sha256:createHash('sha256').update(raw).digest('hex')};
 return {schema:'jm.m002.cp12.exchange-result/1',status:'EXECUTED_TWO_REAL_RECIPIENTS',
  mutationCount:gameReturn.receipt.mutationCount+comicReturn.receipt.mutationCount,
  envelope,gameReceipt:gameReturn.receipt,comicReceipt:comicReturn.receipt,
  authority:CP12_AUTHORITY};
}
export function returnCP12Exchange(envelope,{game,comic,seen=[]}){
 if(envelope?.schema!=='jm.m002.cp12.cross-receiver-envelope/1'||
   typeof envelope.body!=='string'||envelope.body.length>100000||
   !/^[0-9a-f]{64}$/.test(envelope.sha256||'')||
   createHash('sha256').update(envelope.body).digest('hex')!==envelope.sha256)
  throw Error('CP12_EXCHANGE_HASH_HOLD');
 if(seen.includes(envelope.sha256))throw Error('CP12_REPLAY_ALREADY_APPLIED_HOLD');
 let b;try{b=JSON.parse(envelope.body)}catch{throw Error('CP12_BODY_JSON_HOLD')}
 if(b.schema!=='jm.m002.cp12.cross-receiver-body/1'||b.source?.portableDing!==true||
   b.source?.contact?.routeOpen!==true||
   b.source?.contact?.earned?.length!==b.stations||
   !['protect','explore','amplify'].includes(b.choice)||
   b.receiving?.game?.state?.schema!=='jm.m002.cp11.game-host/1'||
   b.receiving?.comic?.state?.schema!=='jm.m002.cp11.comic-host/1'||
   b.receiving?.game?.changes?.length<1||
   b.receiving?.comic?.changes?.length<1||
   b.receiving?.game?.state?.events?.at(-1)?.choice!==b.choice||
   b.receiving?.comic?.state?.pages?.some(p=>p.actor!==b.subject))
  throw Error('CP12_CROSS_SOURCE_CONTRACT_HOLD');
 if(digest(game)!==b.ancestors.game||digest(comic)!==b.ancestors.comic)
  throw Error('CP12_STALE_RECIPIENT_CONFLICT_HOLD');
 return {schema:'jm.m002.cp12.returned-state/1',status:'RECOVERED_BOTH_RECIPIENTS',
  game:own(b.receiving.game.state),comic:own(b.receiving.comic.state),
  trace:{exchangeSha256:envelope.sha256,choice:b.choice,subject:b.subject,
   gameMutations:b.receiving.game.changes.length,comicMutations:b.receiving.comic.changes.length},
  seen:[...seen,envelope.sha256]};
}
