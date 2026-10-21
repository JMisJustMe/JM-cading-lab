/**
 * THEOGAMY private-donor port. Additive to the existing 100-body router.
 * Source code and mechanism tables remain in their original/private house.
 * This module accepts the owner's explicit donor object; it does not fetch,
 * index, publish, deserialize or execute uploaded source automatically.
 */
import assert from 'node:assert/strict';
const requireTrue=(v,why)=>{if(!v)throw new Error(why)};
const clone=x=>structuredClone(x);
export function executeExternalMechanism({donor,recipient,selection}){
  requireTrue(donor?.contract==='jm.theogamy.donor-port/1.0','DONOR_CONTRACT');
  requireTrue(typeof donor.name==='string'&&donor.name.trim(),'DONOR_IDENTITY');
  requireTrue(/^[a-f0-9]{64}$/.test(donor.sourceSha256??''),'DONOR_SOURCE_HASH');
  requireTrue(typeof donor.compose==='function'&&typeof donor.apply==='function','DONOR_EXECUTION_MISSING');
  requireTrue(recipient?.schema&&typeof recipient.schema==='string','RECIPIENT_SCHEMA');
  const before=JSON.stringify(recipient);
  const composition=donor.compose({selection:clone(selection??{})});
  requireTrue(composition&&typeof composition==='object','COMPOSITION_EMPTY');
  const applied=donor.apply(clone(recipient),composition);
  requireTrue(applied?.receipt?.status==='HOST_CONTACT_EXECUTED','CONTACT_RECEIPT_MISSING');
  requireTrue(applied?.state?.schema===recipient.schema,'RECIPIENT_IDENTITY_CHANGED');
  requireTrue(JSON.stringify(recipient)===before,'RECIPIENT_INPUT_MUTATED');
  requireTrue(JSON.stringify(applied.state)!==before,'NO_STATE_CHANGE');
  return {
    schema:'jm.theogamy.donor-port-receipt/1.0',
    donor:donor.name,sourceSha256:donor.sourceSha256,
    recipientSchema:recipient.schema,selection:clone(selection??{}),
    state:applied.state,trace:applied.trace??[],
    scope:'EXECUTED_HOST_CONTACT_NOT_PUBLICATION_OR_DEVICE_PROOF'
  };
}
export function portSelftest(){
  const original={schema:'jm.demo.world/1.0',world:{A:1,B:2},score:10};
  const donor={contract:'jm.theogamy.donor-port/1.0',name:'JM Private Source Test',
    sourceSha256:'a'.repeat(64),
    compose:({selection})=>({gain:selection.gain??1}),
    apply:(state,composition)=>({state:{...state,score:state.score+composition.gain},
      receipt:{status:'HOST_CONTACT_EXECUTED'}})};
  const outcome=executeExternalMechanism({donor,recipient:original,selection:{gain:5}});
  assert.equal(outcome.state.score,15);assert.equal(original.score,10);
  assert.equal(outcome.state.world.B,2);
  assert.equal(outcome.scope,'EXECUTED_HOST_CONTACT_NOT_PUBLICATION_OR_DEVICE_PROOF');
  assert.throws(()=>executeExternalMechanism({donor:{...donor,sourceSha256:'invalid'},recipient:original}),/DONOR_SOURCE_HASH/);
  assert.throws(()=>executeExternalMechanism({donor:{...donor,apply:()=>({state:original})},recipient:original}),/CONTACT_RECEIPT_MISSING/);
  assert.throws(()=>executeExternalMechanism({donor,recipient:{}}),/RECIPIENT_SCHEMA/);
  return {result:'PASS',proof:'HOST_INTERFACE_ONLY',checks:7,mutation:false};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  console.log(JSON.stringify(portSelftest()));
}
