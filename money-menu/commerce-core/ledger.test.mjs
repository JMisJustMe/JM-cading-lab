import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {CommerceLedger} from './ledger.mjs';
const make=()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jm-commerce-cp01-'));return {dir,file:path.join(dir,'private','orders.json')}};
const draft={id:'order_001',offerId:'jm-secrets-of-silence',amountMinor:1499,currency:'GBP',termsReference:'terms_v1'};
test('sandbox paid is never live; no delivery; durable state and chain tampering detected',async()=>{
 const {dir,file}=make();try{
  const ledger=new CommerceLedger(file,{providerAccount:'sandbox_account',verifyPayment:async ref=>({status:'paid',providerRef:ref,orderId:'order_001',amountMinor:1499,currency:'GBP',livemode:false,account:'sandbox_account'})});
  assert.equal(ledger.createOrder(draft).status,'AWAITING_PAYMENT');
  assert.equal((await ledger.reconcilePayment('order_001','sandbox_pi_001')).status,'TEST_PAID');
  assert.equal((await ledger.reconcilePayment('order_001','sandbox_pi_001')).status,'TEST_PAID');
  assert.throws(()=>ledger.recordDelivery('order_001','delivery_001'),/DELIVERY_REQUIRES_LIVE_PAYMENT/);
  assert.equal(new CommerceLedger(file).read('order_001').status,'TEST_PAID');assert.equal(ledger.verifyIntegrity().events,2);
  const db=JSON.parse(fs.readFileSync(file));db.events[0].data.amountMinor=1;fs.writeFileSync(file,JSON.stringify(db));
  assert.throws(()=>ledger.verifyIntegrity(),/LEDGER_CHAIN_TAMPER/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('verified live payment, delivery, refund, idempotence and re-entry',async()=>{
 const {dir,file}=make();try{
  const ledger=new CommerceLedger(file,{providerAccount:'merchant_current',verifyPayment:async ref=>({status:'paid',providerRef:ref,orderId:'order_001',amountMinor:1499,currency:'GBP',livemode:true,account:'merchant_current'}),verifyRefund:async ref=>({status:'refunded',providerRef:ref,orderId:'order_001',amountMinor:1499,currency:'GBP',livemode:true,account:'merchant_current'})});
  ledger.createOrder(draft);
  assert.equal((await ledger.reconcilePayment('order_001','payment_live_001')).status,'LIVE_PAID');
  assert.equal(ledger.recordDelivery('order_001','delivery_001').status,'DELIVERED');
  assert.equal(ledger.recordDelivery('order_001','delivery_001').status,'DELIVERED');
  assert.equal((await ledger.reconcileRefund('order_001','payment_live_001')).status,'REFUNDED');
  assert.equal(new CommerceLedger(file).read('order_001').status,'REFUNDED');
  assert.equal(ledger.verifyIntegrity().events,4);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('provider mismatch, value mismatch, string livemode, unpaid status rejected',async()=>{
 const {dir,file}=make();try{
  let proof={status:'paid',providerRef:'payment_test',orderId:'order_001',amountMinor:1499,currency:'GBP',livemode:true,account:'wrong_account'};
  const ledger=new CommerceLedger(file,{verifyPayment:async()=>proof,providerAccount:'merchant_current'});ledger.createOrder(draft);
  assert.throws(()=>ledger.createOrder(draft),/ORDER_ALREADY_EXISTS/);
  await assert.rejects(ledger.reconcilePayment('order_001','payment_test'),/PAYMENT_ACCOUNT_MISMATCH/);
  proof={...proof,account:'merchant_current',amountMinor:1500};
  await assert.rejects(ledger.reconcilePayment('order_001','payment_test'),/PAYMENT_AMOUNT_MISMATCH/);
  proof={...proof,amountMinor:1499,livemode:'true'};
  await assert.rejects(ledger.reconcilePayment('order_001','payment_test'),/PAYMENT_MODE_UNVERIFIED/);
  proof={...proof,livemode:true,status:'pending'};
  await assert.rejects(ledger.reconcilePayment('order_001','payment_test'),/PAYMENT_NOT_PROVIDER_VERIFIED/);
  assert.throws(()=>ledger.recordDelivery('order_001','delivery_001'),/DELIVERY_REQUIRES_LIVE_PAYMENT/);
  assert.equal(ledger.verifyIntegrity().events,1);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
