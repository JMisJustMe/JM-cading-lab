import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {makeStripeTestVerifier} from './stripe-test-verifier.mjs';
import {CommerceLedger} from './ledger.mjs';
const mock=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
const intent='pi_test123456789',acct='acct_test123456789',key='sk_test_synthetic_not_a_key';
const good={id:intent,object:'payment_intent',livemode:false,status:'succeeded',amount:1499,amount_received:1499,currency:'gbp',metadata:{jm_order_id:'order_001'}};
const setup=change=>{
 const requests=[];let obj={...good,...change};
 const request=async(url,args)=>{requests.push({url,method:args.method,redirect:args.redirect,auth:args.headers.Authorization});
  if(url.endsWith('/v1/account'))return mock({id:acct,object:'account'});
  if(url.endsWith('/v1/payment_intents/'+intent))return mock(obj);
  return mock({error:'wrong route'},404);
 };
 return {adapter:makeStripeTestVerifier({secretKey:key,accountId:acct,request}),requests};
};
test('JM Stripe test adapter: real retrieval shape, account, mode and existing Money Menu ledger',async()=>{
 const {adapter,requests}=setup();const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jm-stripe-test-'));
 try{
  const ledger=new CommerceLedger(path.join(dir,'orders.json'),{providerAccount:acct,verifyPayment:adapter.verifyPayment});
  ledger.createOrder({id:'order_001',offerId:'jm-secrets-of-silence',amountMinor:1499,currency:'GBP',termsReference:'terms_v1'});
  assert.equal((await ledger.reconcilePayment('order_001',intent)).status,'TEST_PAID');
  assert.equal(requests.length,2);assert.equal(requests[0].url,'https://api.stripe.com/v1/account');
  assert.equal(requests[1].url,'https://api.stripe.com/v1/payment_intents/'+intent);
  assert.ok(requests.every(x=>x.method==='GET'&&x.redirect==='manual'&&x.auth==='Bearer '+key));
  assert.throws(()=>ledger.recordDelivery('order_001','delivery_001'),/DELIVERY_REQUIRES_LIVE_PAYMENT/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('JM Stripe test adapter refuses live keys, false live mode, short capture, bad order',async()=>{
 assert.throws(()=>makeStripeTestVerifier({secretKey:'sk_live_synthetic_not_a_key',accountId:acct}),/TEST_SECRET_KEY_REQUIRED/);
 for(const [change,expected] of [
  [{livemode:true},/TEST_MODE_OR_INTENT_MISMATCH/],
  [{status:'processing'},/PAYMENT_NOT_SUCCEEDED/],
  [{amount_received:1000},/PAYMENT_NOT_FULLY_RECEIVED/],
  [{currency:'usd'},/UNSUPPORTED_CURRENCY/],
  [{metadata:{}},/UNLINKED_JM_ORDER/],
  [{id:'pi_another123'},/TEST_MODE_OR_INTENT_MISMATCH/]
 ]){
  const {adapter}=setup(change);await assert.rejects(adapter.verifyPayment(intent),expected);
 }
});
test('JM Stripe test adapter refuses spoofed account and non-200 replies',async()=>{
 const badAccount=makeStripeTestVerifier({secretKey:key,accountId:acct,request:async()=>mock({id:'acct_wrong123',object:'account'})});
 await assert.rejects(badAccount.verifyPayment(intent),/STRIPE_ACCOUNT_MISMATCH/);
 const badResponse=makeStripeTestVerifier({secretKey:key,accountId:acct,request:async()=>mock({error:'denied'},401)});
 await assert.rejects(badResponse.verifyPayment(intent),/STRIPE_LOOKUP_UNVERIFIED/);
});
