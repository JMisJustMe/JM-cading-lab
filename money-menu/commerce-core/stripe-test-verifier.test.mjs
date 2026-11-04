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
test('malformed, null, array, redirects, wrong content-type and interrupted replies fail closed',async()=>{
 const cases=[
  [()=>mock(null),/STRIPE_RESPONSE_INVALID/],[()=>mock([]),/STRIPE_RESPONSE_INVALID/],
  [()=>new Response('{',{headers:{'content-type':'application/json'}}),/STRIPE_RESPONSE_INVALID/],
  [()=>new Response('{}',{status:302,headers:{location:'https://example.test','content-type':'application/json'}}),/STRIPE_LOOKUP_UNVERIFIED/],
  [()=>new Response('{}',{headers:{'content-type':'text/html'}}),/STRIPE_LOOKUP_UNVERIFIED/],
  [()=>new Response('{}',{headers:{'content-type':'application/jsonp'}}),/STRIPE_LOOKUP_UNVERIFIED/],
  [()=>new Response(new ReadableStream({start(c){c.error(Error('interrupted'))}}),{headers:{'content-type':'application/json'}}),/STRIPE_RESPONSE_UNAVAILABLE/],
  [()=>{throw Error('network unavailable')},/STRIPE_LOOKUP_UNAVAILABLE/]
 ];
 for(const [response,error] of cases){const adapter=makeStripeTestVerifier({secretKey:key,accountId:acct,request:async()=>response()});await assert.rejects(adapter.verifyPayment(intent),error)}
});
test('oversized chunked provider reply is cancelled before full buffering',async()=>{
 let cancelled=false;const body=new ReadableStream({pull(c){c.enqueue(new Uint8Array(65536))},cancel(){cancelled=true}});
 const adapter=makeStripeTestVerifier({secretKey:key,accountId:acct,request:async()=>new Response(body,{headers:{'content-type':'application/json'}})});
 await assert.rejects(adapter.verifyPayment(intent),/STRIPE_RESPONSE_LIMIT/);assert.equal(cancelled,true);
});
