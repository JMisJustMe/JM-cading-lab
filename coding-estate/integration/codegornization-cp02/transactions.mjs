import {conduct,replayLedger} from './conduct.mjs';
import {digest,stable,need} from './donors/native-core.mjs';

// Journal authority is commit admission/replay, never body ownership or world truth.
// digest is the inherited deterministic fingerprint, NOT cryptographic attestation.
const clone=x=>structuredClone(x);
export function formation(records){
 const pair=records.slice(-2).map(r=>r.pattern.route).sort().join('+');
 return pair==='lance+mend'?'SKYRAY':pair==='mend+nova'?'ROOTWARDEN':pair==='lance+nova'?'PRISMWISP':null;
}
export class Journal {
 constructor({sourceSeal,seed=[]}={}){
  need(typeof sourceSeal==='string'&&/^[a-f0-9]{64}$/.test(sourceSeal),'SOURCE_SEAL_REQUIRED');
  replayLedger(seed);this.sourceSeal=sourceSeal;this.seed=clone(seed);this.entries=[];
 }
 head(){return this.entries.at(-1)?.hash||digest({sourceSeal:this.sourceSeal,seed:this.seed})}
 records(){return [...clone(this.seed),...this.entries.flatMap(e=>clone(e.records))]}
 prepare(request){
  need(request&&/^[A-Za-z0-9_-]{1,60}$/.test(request.id),'BAD_TRANSACTION_ID');
  const prior=this.entries.find(e=>e.request.id===request.id);
  if(prior){need(stable(prior.request)===stable(request),'IDEMPOTENCY_CONFLICT');return {duplicate:true,entry:clone(prior)}}
  need(request.expectedRevision===this.entries.length,'STALE_REVISION');
  need(request.sourceSeal===this.sourceSeal,'SOURCE_SEAL_DRIFT');
  need(request.context&&Number.isFinite(request.context.energy),'BAD_CONTEXT');
  need(Array.isArray(request.inputs)&&request.inputs.length>=1&&request.inputs.length<=4,'BATCH_LIMIT');
  const previous=this.records(),records=[];let before={energy:request.context.energy,revision:previous.length};
  const ids=new Set(previous.map(r=>r.input.id));
  for(const input of request.inputs){need(!ids.has(input.id),'DUPLICATE_RECORD');ids.add(input.id);const r=conduct(input,before);records.push(r);before=r.after;}
  need(previous.length+records.length<=200,'LEDGER_LIMIT');
  const ticket={schema:'jm.cooperation.ticket/2',baseHead:this.head(),request:clone(request),records,formation:formation([...previous,...records])};
  ticket.hash=digest(ticket);return ticket;
 }
 commit(ticket,liveContext){
  need(ticket&&ticket.request||ticket?.duplicate,'BAD_TICKET');
  if(ticket.duplicate){const p=this.prepare(ticket.entry.request);need(p.duplicate,'DUPLICATE_TICKET_INVALID');return {...p,applied:false}}
  const actual=this.prepare(ticket.request);
  if(actual.duplicate)return {...actual,applied:false};
  need(stable(actual)===stable(ticket),'TICKET_TAMPER');
  need(stable(liveContext)===stable(ticket.request.context),'CONTEXT_CHANGED');
  const entry={schema:'jm.cooperation.commit/2',revision:this.entries.length+1,previous:this.head(),request:clone(ticket.request),records:clone(ticket.records),formation:ticket.formation};
  entry.hash=digest(entry);this.entries.push(entry);return {applied:true,duplicate:false,entry:clone(entry)};
 }
 snapshot(){return {schema:'jm.cooperation.journal/2',sourceSeal:this.sourceSeal,seed:clone(this.seed),entries:clone(this.entries),head:this.head()}}
 static recover(data,expectedSeal){
  need(data?.schema==='jm.cooperation.journal/2'&&data.sourceSeal===expectedSeal,'JOURNAL_SOURCE_DRIFT');
  need(Array.isArray(data.entries)&&data.entries.length<=200,'JOURNAL_LIMIT');
  const j=new Journal({sourceSeal:expectedSeal,seed:data.seed});
  for(const e of data.entries){const ticket=j.prepare(e.request);need(!ticket.duplicate,'JOURNAL_DUPLICATE');const got=j.commit(ticket,e.request.context);need(stable(got.entry)===stable(e),'JOURNAL_REPLAY_MISMATCH')}
  need(j.head()===data.head,'JOURNAL_HEAD_MISMATCH');return j;
 }
}
