/* JM ESTATE CROSS-DEVICE CONTACT ADAPTER v1.0 */
(()=>{'use strict';
const te=new TextEncoder(),hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function hmac(secret,text){const k=await crypto.subtle.importKey('raw',te.encode(String(secret)),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',k,te.encode(String(text))))}
const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;
function create({organ,send,secret,identity,remote}={}){if(!organ||typeof send!=='function'||!secret)throw new Error('organ + send + secret required');let stage='pair',challenge=null,seq=0,lastOutbound=null,revoked=false;
 async function startPair(){await organ.ready({crossDevice:true,stage:'pair'});await organ.begin('PAIR',{remote});challenge=uid();send({t:'PAIR_CHALLENGE',challenge,from:identity});return challenge}
 async function exchange(payload){if(stage!=='exchange')throw new Error('pair must be proved before exchange');seq++;const body=JSON.stringify(payload),sig=await hmac(secret,`STATE|${seq}|${body}`);lastOutbound={seq,body,sig};send({t:'STATE',seq,payload,sig});return seq}
 async function recover(){if(revoked)throw new Error('revoked');const stamp=uid();send({t:'RECOVER_HELLO',stamp});return stamp}
 async function revoke(){if(stage!=='revoke')throw new Error('recover must precede revoke');const stamp=uid();send({t:'REVOKE',stamp});return stamp}
 async function blockTest(){if(!revoked)throw new Error('revoke must precede block');const stamp=uid();send({t:'BLOCK_TEST',stamp});return stamp}
 async function onMessage(m){if(!m||typeof m!=='object')return;
  if(m.t==='PAIR_CHALLENGE'){send({t:'PAIR_PROOF',challenge:m.challenge,proof:await hmac(secret,`PAIR|${m.challenge}`),from:identity});return}
  if(m.t==='PAIR_PROOF'&&m.challenge===challenge){const expected=await hmac(secret,`PAIR|${challenge}`);if(m.proof!==expected){await organ.fail('PAIR_PROOF_INVALID',{remote});return}stage='exchange';await organ.ding('DING.PAIR',{observed:true,remote});return}
  if(m.t==='STATE'){const body=JSON.stringify(m.payload),expected=await hmac(secret,`STATE|${m.seq}|${body}`);if(m.sig!==expected){await organ.fail('STATE_SIGNATURE_INVALID',{seq:m.seq});return}const ack=await hmac(secret,`ACK|${m.seq}|${m.sig}`);send({t:'STATE_ACK',seq:m.seq,sig:m.sig,ack});await organ.ding('DING.STATE_RECEIVED',{observed:true,remote,seq:m.seq});stage='recover';return}
  if(m.t==='STATE_ACK'&&lastOutbound&&m.seq===lastOutbound.seq&&m.sig===lastOutbound.sig){const expected=await hmac(secret,`ACK|${m.seq}|${m.sig}`);if(m.ack!==expected){await organ.fail('ACK_SIGNATURE_INVALID',{seq:m.seq});return}await organ.ding('DING.SIGNED_ACK',{observed:true,remote,seq:m.seq});stage='recover';return}
  if(m.t==='RECOVER_HELLO'){send({t:'RECOVER_ACK',stamp:m.stamp});await organ.ding('DING.RECOVER_REMOTE',{observed:true,remote});stage='revoke';return}
  if(m.t==='RECOVER_ACK'){await organ.recover({observed:true,remote});stage='revoke';return}
  if(m.t==='REVOKE'){revoked=true;send({t:'REVOKE_ACK',stamp:m.stamp});await organ.revoke({observed:true,remote,side:'remote'});stage='block';return}
  if(m.t==='REVOKE_ACK'){revoked=true;await organ.revoke({observed:true,remote,side:'initiator'});stage='block';return}
  if(m.t==='BLOCK_TEST'){const blocked=revoked;send({t:'BLOCKED',stamp:m.stamp,reason:blocked?'revoked':'not-revoked'});if(blocked)await organ.block({observed:true,remote,side:'rejector'});return}
  if(m.t==='BLOCKED'&&m.reason==='revoked'){await organ.block({observed:true,remote,side:'sender'});return}
 }
 return Object.freeze({startPair,exchange,recover,revoke,blockTest,onMessage,state:()=>({stage,seq,revoked,remote})})
}
window.JMCrossDeviceContactAdapter=Object.freeze({version:'1.0.0',create});
})();