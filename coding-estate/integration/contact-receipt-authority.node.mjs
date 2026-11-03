/** JM CP38 session-local authenticated receipt authority (Node host only).
 * Capture MUST be called by the trusted host immediately after an original
 * Contact Lab action. An attacker controlling the capture process/key is out
 * of scope; this is not durable/remote proof or physical-device attestation.
 */
import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { validateContactReceipt } from './contact-gamecore-bridge.mjs';

const fail=code=>{const e=new Error(code);e.code=code;throw e;};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function createContactReceiptAuthority() {
  const key=randomBytes(32), sessionId=randomBytes(16).toString('hex');
  const pinned=new Map();
  let lastCapturedTick=0;
  const sign=(id,payload)=>createHmac('sha256',key)
    .update('jm.contact.proof.v1\n'+sessionId+'\n'+id+'\n'+payload)
    .digest('hex');
  function capture(world,receipt) {
    validateContactReceipt(receipt);
    if (!world || !Array.isArray(world.ledger) || world.lastEvent!==receipt ||
        world.ledger.at(-1)!==receipt || world.sequence!==receipt.tick ||
        world.ledger.filter(x=>x.eventId===receipt.eventId).length!==1)
      fail('CONTACT_CAPTURE_NOT_ORIGINAL');
    if(receipt.tick<=lastCapturedTick || pinned.has(receipt.eventId)) fail('CONTACT_CAPTURE_REPLAY');
    const payload=JSON.stringify(receipt);
    const tag=sign(receipt.eventId,payload);
    pinned.set(receipt.eventId,{payload,tag});
    lastCapturedTick=receipt.tick;
    return Object.freeze({schema:'jm.contact.host-hmac/1.0',sessionId,eventId:receipt.eventId,tag});
  }
  function authenticate(receipt,proof) {
    if(!proof || proof.schema!=='jm.contact.host-hmac/1.0' ||
       proof.sessionId!==sessionId || proof.eventId!==receipt?.eventId ||
       typeof proof.tag!=='string' || !/^[0-9a-f]{64}$/.test(proof.tag)) return false;
    const entry=pinned.get(receipt.eventId);
    if(!entry || !same(entry.payload,JSON.stringify(receipt)))return false;
    const supplied=Buffer.from(proof.tag,'hex');
    const expected=Buffer.from(sign(receipt.eventId,entry.payload),'hex');
    return timingSafeEqual(supplied,expected) && timingSafeEqual(supplied,Buffer.from(entry.tag,'hex'));
  }
  return Object.freeze({capture,authenticate});
}
