import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {CommerceLedger} from './ledger.mjs';
const draft={id:'order_001',offerId:'jm-secrets-of-silence',amountMinor:1499,currency:'GBP',termsReference:'terms_v1'};
const proof=ref=>({status:'paid',providerRef:ref,orderId:draft.id,amountMinor:1499,currency:'GBP',livemode:true,account:'merchant_current'});
const fixture=fn=>async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jm-ledger-hardening-'));try{await fn(path.join(dir,'orders.json'),dir)}finally{fs.rmSync(dir,{recursive:true,force:true})}};
test('provider await cannot erase a concurrently created order',fixture(async file=>{
 let release;const ledger=new CommerceLedger(file,{verifyPayment:()=>new Promise(r=>{release=r})});ledger.createOrder(draft);
 const pending=ledger.reconcilePayment(draft.id,'payment_001');
 new CommerceLedger(file).createOrder({...draft,id:'order_002'});release(proof('payment_001'));await pending;
 assert.ok(ledger.read('order_002'));assert.equal(ledger.verifyIntegrity().events,3);
}));
test('competing payment proofs cannot both overwrite the order payment',fixture(async file=>{
 const releases=[];const ledger=new CommerceLedger(file,{verifyPayment:ref=>new Promise(resolve=>releases.push(()=>resolve(proof(ref))))});ledger.createOrder(draft);
 const a=ledger.reconcilePayment(draft.id,'payment_001'),b=ledger.reconcilePayment(draft.id,'payment_002');
 const results=Promise.allSettled([a,b]);releases.forEach(r=>r());const settled=await results;
 assert.equal(settled.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(ledger.verifyIntegrity().events,2);
}));
test('refund preserves intervening delivery and rejects a different replay reference',fixture(async file=>{
 let release;const ledger=new CommerceLedger(file,{verifyPayment:async ref=>proof(ref),verifyRefund:()=>new Promise(r=>{release=r})});ledger.createOrder(draft);await ledger.reconcilePayment(draft.id,'payment_001');
 const pending=ledger.reconcileRefund(draft.id,'payment_001');ledger.recordDelivery(draft.id,'delivery_001');
 release({...proof('payment_001'),status:'refunded'});await pending;
 assert.equal(ledger.read(draft.id).delivery.receiptRef,'delivery_001');assert.equal(ledger.verifyIntegrity().events,4);
 await assert.rejects(ledger.reconcileRefund(draft.id,'payment_002'),/REFUND_REFERENCE_MISMATCH/);
}));
test('independent checkpoint detects valid-chain truncation',fixture(async file=>{
 const ledger=new CommerceLedger(file);ledger.createOrder(draft);const old=fs.readFileSync(file);ledger.createOrder({...draft,id:'order_002'});
 const checkpoint=ledger.verifyIntegrity();fs.writeFileSync(file,old);
 assert.throws(()=>ledger.verifyIntegrity({checkpoint}),/LEDGER_CHECKPOINT_MISMATCH/);
}));
test('local writer lock refuses contention and symlink ledger carriers',fixture(async(file,dir)=>{
 const ledger=new CommerceLedger(file);fs.writeFileSync(file+'.lock','');
 assert.throws(()=>ledger.createOrder(draft),/LEDGER_BUSY/);fs.unlinkSync(file+'.lock');ledger.createOrder(draft);
 const target=path.join(dir,'outside.json');fs.renameSync(file,target);fs.symlinkSync(target,file);
 assert.throws(()=>ledger.read(draft.id),/UNSAFE_LEDGER_PATH/);
}));
test('independent checkpoint remains valid after append but rejects changed prefix',fixture(async file=>{
 const ledger=new CommerceLedger(file);ledger.createOrder(draft);const checkpoint=ledger.verifyIntegrity();ledger.createOrder({...draft,id:'order_002'});
 assert.equal(ledger.verifyIntegrity({checkpoint}).events,2);
 const {createHash}=await import('node:crypto');const db=JSON.parse(fs.readFileSync(file));db.events[0].data.amountMinor=1;let prior='0'.repeat(64);
 for(const e of db.events){e.prevHash=prior;const {seq,at,type,orderId,data,prevHash}=e;e.hash=createHash('sha256').update(JSON.stringify({seq,at,type,orderId,data,prevHash})).digest('hex');prior=e.hash}db.head=prior;fs.writeFileSync(file,JSON.stringify(db));
 assert.equal(ledger.verifyIntegrity().ok,true);assert.throws(()=>ledger.verifyIntegrity({checkpoint}),/LEDGER_CHECKPOINT_MISMATCH/);
}));
test('separate Node writer processes retain every successfully acknowledged order',fixture(async file=>{
 const {spawn}=await import('node:child_process');const moduleURL=new URL('./ledger.mjs',import.meta.url).href;
 const script=`import {CommerceLedger} from ${JSON.stringify(moduleURL)};const ledger=new CommerceLedger(process.argv[1]);for(let n=0;n<8;n++){for(let attempt=0;;attempt++){try{ledger.createOrder({id:'order_'+process.argv[2]+'_'+n,offerId:'offer_001',amountMinor:100,termsReference:'terms_001'});break}catch(e){if(e.message!=='LEDGER_BUSY'||attempt>500)throw e;await new Promise(r=>setTimeout(r,2))}}}`;
 await Promise.all(Array.from({length:4},(_,i)=>new Promise((resolve,reject)=>{let error='';const child=spawn(process.execPath,['--input-type=module','-e',script,file,String(i)]);child.stderr.on('data',b=>{error+=b});child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error(error)))})));
 const ledger=new CommerceLedger(file);assert.equal(ledger.verifyIntegrity().events,32);for(let i=0;i<4;i++)for(let n=0;n<8;n++)assert.ok(ledger.read('order_'+i+'_'+n));
}));
