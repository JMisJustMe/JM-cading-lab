// JM Money Menu: read-only Stripe test-mode adapter. Never enables live payment.
// Does NOT accept client-posted payment status as evidence.
const need=(condition,code)=>{if(!condition)throw Error(code)};
export function makeStripeTestVerifier({secretKey,accountId,request=fetch}={}){
 need(typeof secretKey==='string'&&/^sk_test_[A-Za-z0-9_]{8,}$/.test(secretKey),'TEST_SECRET_KEY_REQUIRED');
 need(typeof accountId==='string'&&/^acct_[A-Za-z0-9]{8,}$/.test(accountId),'EXPECTED_ACCOUNT_REQUIRED');
 need(typeof request==='function','FETCH_REQUIRED');
 const get=async endpoint=>{
  let response;
  try{response=await request('https://api.stripe.com'+endpoint,{method:'GET',redirect:'manual',headers:{Authorization:'Bearer '+secretKey,Accept:'application/json'},signal:AbortSignal.timeout(7500)})}
  catch{throw Error('STRIPE_LOOKUP_UNAVAILABLE')}
  if(response.status!==200||response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json'){await response.body?.cancel();throw Error('STRIPE_LOOKUP_UNVERIFIED')}
  const reader=response.body?.getReader();need(reader,'STRIPE_RESPONSE_INVALID');
  const chunks=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
   if(size>512*1024){await reader.cancel();throw Error('STRIPE_RESPONSE_LIMIT')}chunks.push(Buffer.from(value))}
  }catch(e){if(e.message==='STRIPE_RESPONSE_LIMIT')throw e;throw Error('STRIPE_RESPONSE_UNAVAILABLE')}finally{reader.releaseLock()}
  let value;try{value=JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{throw Error('STRIPE_RESPONSE_INVALID')}
  need(value&&typeof value==='object'&&!Array.isArray(value),'STRIPE_RESPONSE_INVALID');return value;
 };
 async function verifyAccount(){const account=await get('/v1/account');need(account.object==='account'&&account.id===accountId,'STRIPE_ACCOUNT_MISMATCH');return account.id}
 async function verifyPayment(providerRef){
  need(typeof providerRef==='string'&&/^pi_[a-zA-Z0-9]{8,100}$/.test(providerRef),'INVALID_PAYMENT_INTENT');
  const account=await verifyAccount();
  const pi=await get('/v1/payment_intents/'+providerRef);
  need(pi.id===providerRef&&pi.object==='payment_intent'&&pi.livemode===false,'TEST_MODE_OR_INTENT_MISMATCH');
  need(pi.status==='succeeded','PAYMENT_NOT_SUCCEEDED');
  need(Number.isSafeInteger(pi.amount)&&pi.amount>0&&pi.amount_received===pi.amount,'PAYMENT_NOT_FULLY_RECEIVED');
  need(pi.currency==='gbp','UNSUPPORTED_CURRENCY');
  need(typeof pi.metadata?.jm_order_id==='string'&&/^[a-zA-Z0-9_-]{5,80}$/.test(pi.metadata.jm_order_id),'UNLINKED_JM_ORDER');
  return {status:'paid',providerRef,orderId:pi.metadata.jm_order_id,amountMinor:pi.amount_received,currency:'GBP',livemode:false,account};
 }
 return Object.freeze({mode:'stripe-test-only',verifyPayment});
}
