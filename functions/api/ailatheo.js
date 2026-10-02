const SCHEMA='JM.AILatheoCustomer/0.1';
const TOKEN_PREFIX='ailacct_';
const ACCOUNT_PREFIX='ailatheo-customers/v0.1';
const EVENT_PREFIX=ACCOUNT_PREFIX+'/stripe-events';
const INDEX_PREFIX=ACCOUNT_PREFIX+'/stripe-index';
const TOKEN_BYTES=32;
const WEBHOOK_TOLERANCE_SECONDS=300;

const headers={
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store, max-age=0',
  'x-content-type-options':'nosniff',
  'referrer-policy':'no-referrer'
};
function json(value,status=200,extra={}){return new Response(JSON.stringify(value,null,2),{status,headers:{...headers,...extra}})}
function now(){return new Date().toISOString()}
function bytesToHex(bytes){return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')}
function bytesToBase64Url(bytes){
  let s=''; for(const b of bytes)s+=String.fromCharCode(b);
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
async function sha256(value){
  const data=new TextEncoder().encode(String(value));
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256',data)));
}
async function hmacHex(secret,value){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return bytesToHex(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value))));
}
function constantTimeEqual(a,b){
  a=String(a||'');b=String(b||''); if(a.length!==b.length)return false;
  let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a.charCodeAt(i)^b.charCodeAt(i);return mismatch===0;
}
async function readJson(bucket,key,fallback=null){
  const object=await bucket.get(key);if(!object)return fallback;
  try{return JSON.parse(await object.text())}catch{return fallback}
}
async function writeJson(bucket,key,value){
  await bucket.put(key,JSON.stringify(value,null,2),{httpMetadata:{contentType:'application/json; charset=utf-8'}});
}
function accountIdKey(id){return ACCOUNT_PREFIX+'/accounts/id/'+id+'.json'}
function tokenKey(hash){return ACCOUNT_PREFIX+'/accounts/token/'+hash+'.json'}
function customerIndexKey(id){return INDEX_PREFIX+'/customer/'+id+'.json'}
function subscriptionIndexKey(id){return INDEX_PREFIX+'/subscription/'+id+'.json'}
async function saveAccount(bucket,account){
  const clean={...account,updated_at:now()};
  await Promise.all([writeJson(bucket,accountIdKey(clean.account_id),clean),writeJson(bucket,tokenKey(clean.token_hash),clean)]);
  if(clean.stripe_customer_id)await writeJson(bucket,customerIndexKey(clean.stripe_customer_id),{account_id:clean.account_id});
  if(clean.stripe_subscription_id)await writeJson(bucket,subscriptionIndexKey(clean.stripe_subscription_id),{account_id:clean.account_id});
  return clean;
}
async function loadAccountById(bucket,id){return id?readJson(bucket,accountIdKey(id),null):null}
async function loadAccountByToken(bucket,token){
  if(!token||!token.startsWith(TOKEN_PREFIX))return null;
  return readJson(bucket,tokenKey(await sha256(token)),null);
}
function bearer(request){
  const raw=request.headers.get('authorization')||'';
  return raw.toLowerCase().startsWith('bearer ')?raw.slice(7).trim():'';
}
async function requireAccount(request,env){
  if(!env.AILATHEO_CUSTOMERS)return {ok:false,response:json({schema:SCHEMA,error:'CUSTOMER_STORAGE_NOT_CONFIGURED'},503)};
  const account=await loadAccountByToken(env.AILATHEO_CUSTOMERS,bearer(request));
  return account?{ok:true,account}:{ok:false,response:json({schema:SCHEMA,error:'CUSTOMER_AUTH_REQUIRED'},401,{'www-authenticate':'Bearer realm="AILatheo Creator"'})};
}
function publicAccount(a){
  return {
    schema:SCHEMA,
    account_id:a.account_id,
    plan:a.plan||'free',
    status:a.status||'free',
    cadence:a.cadence||null,
    current_period_end:a.current_period_end||null,
    cancel_at_period_end:Boolean(a.cancel_at_period_end),
    checkout_state:a.checkout_state||'idle',
    creator_active:['creator-active','creator-grace','cancel-scheduled'].includes(a.status),
    created_at:a.created_at,
    updated_at:a.updated_at
  };
}
function stripeReady(env){return Boolean(env.AILATHEO_STRIPE_MODE==='test'&&String(env.AILATHEO_STRIPE_SECRET_KEY||'').startsWith('sk_test_')&&env.AILATHEO_STRIPE_MONTHLY_PRICE_ID&&env.AILATHEO_STRIPE_ANNUAL_PRICE_ID)}
async function stripePost(env,path,params){
  if(!stripeReady(env))throw new Error('STRIPE_TEST_MODE_NOT_CONFIGURED');
  const body=new URLSearchParams();
  for(const [k,v] of Object.entries(params||{}))if(v!==undefined&&v!==null)body.set(k,String(v));
  const r=await fetch('https://api.stripe.com'+path,{method:'POST',headers:{authorization:'Bearer '+env.AILATHEO_STRIPE_SECRET_KEY,'content-type':'application/x-www-form-urlencoded'},body});
  const payload=await r.json().catch(()=>({}));
  if(!r.ok)throw Object.assign(new Error(payload?.error?.message||'STRIPE_HTTP_'+r.status),{status:r.status,payload});
  return payload;
}
async function stripeGet(env,path){
  if(!stripeReady(env))throw new Error('STRIPE_TEST_MODE_NOT_CONFIGURED');
  const r=await fetch('https://api.stripe.com'+path,{headers:{authorization:'Bearer '+env.AILATHEO_STRIPE_SECRET_KEY}});
  const payload=await r.json().catch(()=>({}));
  if(!r.ok)throw Object.assign(new Error(payload?.error?.message||'STRIPE_HTTP_'+r.status),{status:r.status,payload});
  return payload;
}
function priceFor(env,cadence){return cadence==='annual'?env.AILATHEO_STRIPE_ANNUAL_PRICE_ID:env.AILATHEO_STRIPE_MONTHLY_PRICE_ID}
function canonicalOrigin(request,env){
  const configured=String(env.AILATHEO_PUBLIC_ORIGIN||'').replace(/\/$/,'');
  return configured||new URL(request.url).origin;
}
async function createAccount(env){
  if(!env.AILATHEO_CUSTOMERS)return json({schema:SCHEMA,error:'CUSTOMER_STORAGE_NOT_CONFIGURED'},503);
  const raw=new Uint8Array(TOKEN_BYTES);crypto.getRandomValues(raw);
  const token=TOKEN_PREFIX+bytesToBase64Url(raw),token_hash=await sha256(token),created=now();
  const account=await saveAccount(env.AILATHEO_CUSTOMERS,{
    schema:SCHEMA+'.Record',
    account_id:crypto.randomUUID(),
    token_hash,
    plan:'free',
    status:'free',
    cadence:null,
    current_period_end:null,
    cancel_at_period_end:false,
    checkout_state:'idle',
    stripe_customer_id:null,
    stripe_subscription_id:null,
    created_at:created,
    updated_at:created
  });
  return json({schema:SCHEMA,outcome:'ACCOUNT_CREATED',account:publicAccount(account),recovery_key:token,boundary:'The recovery key is shown once. The server stores only its SHA-256 lookup hash.'},201);
}
async function createCheckout(request,env,account,payload){
  if(!stripeReady(env))return json({schema:SCHEMA,error:'STRIPE_CHECKOUT_NOT_CONFIGURED'},503);
  const cadence=payload?.cadence==='annual'?'annual':'monthly',origin=canonicalOrigin(request,env);
  const params={
    mode:'subscription',
    'line_items[0][price]':priceFor(env,cadence),
    'line_items[0][quantity]':1,
    client_reference_id:account.account_id,
    'metadata[ailatheo_account_id]':account.account_id,
    'metadata[ailatheo_cadence]':cadence,
    'subscription_data[metadata][ailatheo_account_id]':account.account_id,
    'subscription_data[metadata][ailatheo_cadence]':cadence,
    success_url:origin+'/ailatheo/?checkout=success&session_id={CHECKOUT_SESSION_ID}',
    cancel_url:origin+'/ailatheo/?checkout=cancelled',
    locale:'en-GB'
  };
  if(account.stripe_customer_id)params.customer=account.stripe_customer_id;
  const session=await stripePost(env,'/v1/checkout/sessions',params);
  account.checkout_state='checkout-started';account.cadence=cadence;
  await saveAccount(env.AILATHEO_CUSTOMERS,account);
  return json({schema:SCHEMA,outcome:'CHECKOUT_CREATED',url:session.url,session_id:session.id,cadence});
}
async function reconcileCheckout(env,account,payload){
  const id=String(payload?.session_id||'');
  if(!/^cs_/.test(id))return json({schema:SCHEMA,error:'CHECKOUT_SESSION_REQUIRED'},400);
  if(!stripeReady(env))return json({schema:SCHEMA,error:'STRIPE_CHECKOUT_NOT_CONFIGURED'},503);
  const session=await stripeGet(env,'/v1/checkout/sessions/'+encodeURIComponent(id));
  if(session.client_reference_id!==account.account_id)return json({schema:SCHEMA,error:'CHECKOUT_ACCOUNT_MISMATCH'},403);
  account.stripe_customer_id=typeof session.customer==='string'?session.customer:account.stripe_customer_id;
  account.stripe_subscription_id=typeof session.subscription==='string'?session.subscription:account.stripe_subscription_id;
  account.checkout_state='provider-confirmed';
  if(session.payment_status==='paid'||session.payment_status==='no_payment_required'){
    account.plan='creator';account.status='creator-active';
  }
  account=await saveAccount(env.AILATHEO_CUSTOMERS,account);
  return json({schema:SCHEMA,outcome:'CHECKOUT_RECONCILED',account:publicAccount(account)});
}
async function createPortal(request,env,account){
  if(!account.stripe_customer_id)return json({schema:SCHEMA,error:'NO_STRIPE_CUSTOMER'},409);
  if(!stripeReady(env))return json({schema:SCHEMA,error:'STRIPE_TEST_MODE_NOT_CONFIGURED'},503);
  const session=await stripePost(env,'/v1/billing_portal/sessions',{customer:account.stripe_customer_id,return_url:canonicalOrigin(request,env)+'/ailatheo/'});
  return json({schema:SCHEMA,outcome:'PORTAL_CREATED',url:session.url});
}
function subscriptionState(object,type){
  if(type==='customer.subscription.deleted'||object.status==='canceled'||object.status==='incomplete_expired')return {plan:'free',status:'free-downgraded'};
  if(object.cancel_at_period_end)return {plan:'creator',status:'cancel-scheduled'};
  if(['past_due','unpaid'].includes(object.status))return {plan:'creator',status:'creator-grace'};
  if(['active','trialing'].includes(object.status))return {plan:'creator',status:'creator-active'};
  return {plan:'creator',status:'creator-pending-confirmation'};
}
async function findAccountForStripeObject(bucket,object){
  const direct=object?.metadata?.ailatheo_account_id||object?.subscription_details?.metadata?.ailatheo_account_id;
  if(direct)return loadAccountById(bucket,direct);
  const subscription=typeof object?.subscription==='string'?object.subscription:object?.subscription?.id;
  if(subscription){
    const idx=await readJson(bucket,subscriptionIndexKey(subscription),null);
    if(idx?.account_id)return loadAccountById(bucket,idx.account_id);
  }
  const customer=typeof object?.customer==='string'?object.customer:object?.customer?.id;
  if(customer){
    const idx=await readJson(bucket,customerIndexKey(customer),null);
    if(idx?.account_id)return loadAccountById(bucket,idx.account_id);
  }
  return null;
}
async function applyStripeEvent(env,event){
  const bucket=env.AILATHEO_CUSTOMERS,object=event?.data?.object||{};
  let account=null;
  if(event.type==='checkout.session.completed'){
    account=await loadAccountById(bucket,object.client_reference_id||object?.metadata?.ailatheo_account_id);
    if(account){
      account.stripe_customer_id=typeof object.customer==='string'?object.customer:account.stripe_customer_id;
      account.stripe_subscription_id=typeof object.subscription==='string'?object.subscription:account.stripe_subscription_id;
      account.cadence=object?.metadata?.ailatheo_cadence||account.cadence;
      account.checkout_state='provider-confirmed';
      if(object.payment_status==='paid'||object.payment_status==='no_payment_required'){account.plan='creator';account.status='creator-active'}
    }
  }else if(event.type.startsWith('customer.subscription.')){
    account=await findAccountForStripeObject(bucket,object);
    if(account){
      const state=subscriptionState(object,event.type);account.plan=state.plan;account.status=state.status;
      account.stripe_subscription_id=object.id||account.stripe_subscription_id;
      account.stripe_customer_id=typeof object.customer==='string'?object.customer:account.stripe_customer_id;
      account.current_period_end=object.current_period_end?new Date(object.current_period_end*1000).toISOString():account.current_period_end;
      account.cancel_at_period_end=Boolean(object.cancel_at_period_end);
      account.cadence=object?.metadata?.ailatheo_cadence||account.cadence;
    }
  }else if(event.type==='invoice.paid'||event.type==='invoice.payment_failed'){
    account=await findAccountForStripeObject(bucket,object);
    if(account){
      account.plan='creator';
      account.status=event.type==='invoice.paid'?'creator-active':'creator-grace';
      account.checkout_state=event.type==='invoice.paid'?'provider-confirmed':'payment-recovery';
    }
  }
  if(account)await saveAccount(bucket,account);
  return account;
}
async function verifyWebhook(raw,header,secret){
  if(!header||!secret)return false;
  const parts=Object.fromEntries(header.split(',').map(x=>x.split('=',2)));
  const timestamp=Number(parts.t),signature=parts.v1;
  if(!timestamp||!signature)return false;
  if(Math.abs(Math.floor(Date.now()/1000)-timestamp)>WEBHOOK_TOLERANCE_SECONDS)return false;
  return constantTimeEqual(await hmacHex(secret,timestamp+'.'+raw),signature);
}
async function webhook(request,env){
  if(!env.AILATHEO_CUSTOMERS||!env.AILATHEO_STRIPE_WEBHOOK_SECRET)return json({schema:SCHEMA,error:'WEBHOOK_NOT_CONFIGURED'},503);
  const raw=await request.text();
  if(!(await verifyWebhook(raw,request.headers.get('stripe-signature'),env.AILATHEO_STRIPE_WEBHOOK_SECRET)))return json({schema:SCHEMA,error:'INVALID_STRIPE_SIGNATURE'},400);
  let event;try{event=JSON.parse(raw)}catch{return json({schema:SCHEMA,error:'INVALID_JSON'},400)}
  if(!event?.id||!event?.type)return json({schema:SCHEMA,error:'INVALID_STRIPE_EVENT'},400);
  const eventKey=EVENT_PREFIX+'/'+event.id+'.json';
  if(await readJson(env.AILATHEO_CUSTOMERS,eventKey,null))return json({schema:SCHEMA,outcome:'EVENT_ALREADY_PROCESSED',event_id:event.id});
  const account=await applyStripeEvent(env,event);
  await writeJson(env.AILATHEO_CUSTOMERS,eventKey,{id:event.id,type:event.type,processed_at:now(),account_id:account?.account_id||null});
  return json({schema:SCHEMA,outcome:'EVENT_PROCESSED',event_id:event.id,type:event.type,account_id:account?.account_id||null});
}

export async function onRequest(context){
  const {request,env}=context,url=new URL(request.url),queryAction=url.searchParams.get('action');
  if(request.method==='GET'&&queryAction==='status'){
    return json({schema:SCHEMA,service:'AILatheo Creator entitlement',storage_bound:Boolean(env.AILATHEO_CUSTOMERS),stripe_secret_configured:Boolean(env.AILATHEO_STRIPE_SECRET_KEY),webhook_secret_configured:Boolean(env.AILATHEO_STRIPE_WEBHOOK_SECRET),monthly_price_configured:Boolean(env.AILATHEO_STRIPE_MONTHLY_PRICE_ID),annual_price_configured:Boolean(env.AILATHEO_STRIPE_ANNUAL_PRICE_ID),ready:Boolean(env.AILATHEO_CUSTOMERS&&stripeReady(env)&&env.AILATHEO_STRIPE_WEBHOOK_SECRET),mode:env.AILATHEO_STRIPE_MODE||'unset',boundary:'Billing controls capability only. Project ownership and local project bytes are not stored in this service.'});
  }
  if(request.method==='POST'&&queryAction==='stripe-webhook')return webhook(request,env);
  if(request.method==='POST'){
    let payload;try{payload=await request.json()}catch{return json({schema:SCHEMA,error:'INVALID_JSON'},400)}
    if(payload?.action==='account.create')return createAccount(env);
    const auth=await requireAccount(request,env);if(!auth.ok)return auth.response;
    if(payload?.action==='checkout.create')return createCheckout(request,env,auth.account,payload);
    if(payload?.action==='checkout.reconcile')return reconcileCheckout(env,auth.account,payload);
    if(payload?.action==='portal.create')return createPortal(request,env,auth.account);
    return json({schema:SCHEMA,error:'UNKNOWN_ACTION'},400);
  }
  if(request.method==='GET'){
    const auth=await requireAccount(request,env);if(!auth.ok)return auth.response;
    return json({schema:SCHEMA,outcome:'ENTITLEMENT',account:publicAccount(auth.account)});
  }
  return json({schema:SCHEMA,error:'METHOD_NOT_ALLOWED'},405,{allow:'GET, POST'});
}
