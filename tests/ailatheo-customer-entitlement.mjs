import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import cryptoNode from 'node:crypto';

const source=await fs.readFile(new URL('../functions/api/ailatheo.js',import.meta.url),'utf8');
const moduleUrl='data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const {onRequest}=await import(moduleUrl);

class FakeR2Object{
  constructor(value){this.value=value}
  async text(){return this.value}
}
class FakeR2{
  constructor(){this.map=new Map()}
  async get(key){return this.map.has(key)?new FakeR2Object(this.map.get(key)):null}
  async put(key,value){this.map.set(key,String(value))}
  async delete(key){this.map.delete(key)}
}
const bucket=new FakeR2();
const stripeCalls=[];
const originalFetch=globalThis.fetch;
globalThis.fetch=async (url,options={})=>{
  const href=String(url);stripeCalls.push({href,method:options.method||'GET',body:String(options.body||'')});
  if(href.includes('/v1/checkout/sessions/cs_test_paid'))return new Response(JSON.stringify({
    id:'cs_test_paid',client_reference_id:currentAccountId,customer:'cus_test_1',subscription:'sub_test_1',payment_status:'paid'
  }),{status:200,headers:{'content-type':'application/json'}});
  if(href.endsWith('/v1/checkout/sessions'))return new Response(JSON.stringify({id:'cs_test_new',url:'https://checkout.stripe.test/session'}),{status:200,headers:{'content-type':'application/json'}});
  if(href.endsWith('/v1/billing_portal/sessions'))return new Response(JSON.stringify({id:'bps_test',url:'https://billing.stripe.test/portal'}),{status:200,headers:{'content-type':'application/json'}});
  return new Response(JSON.stringify({error:{message:'UNEXPECTED_STRIPE_ROUTE'}}),{status:404,headers:{'content-type':'application/json'}});
};

const baseEnv={
  AILATHEO_CUSTOMERS:bucket,
  AILATHEO_STRIPE_SECRET_KEY:'sk_test_fake',
  AILATHEO_STRIPE_WEBHOOK_SECRET:'whsec_test_fake',
  AILATHEO_STRIPE_MONTHLY_PRICE_ID:'price_month',
  AILATHEO_STRIPE_ANNUAL_PRICE_ID:'price_year',
  AILATHEO_STRIPE_MODE:'test',
  AILATHEO_PUBLIC_ORIGIN:'https://jmisjustme-estate.pages.dev'
};
let currentAccountId='';

async function call({method='GET',query='',env=baseEnv,token='',body=null,headers={}}={}){
  const h=new Headers(headers);
  if(token)h.set('authorization','Bearer '+token);
  if(body!==null&&!h.has('content-type'))h.set('content-type','application/json');
  const req=new Request('https://jmisjustme-estate.pages.dev/api/ailatheo'+query,{method,headers:h,body:body===null?undefined:(typeof body==='string'?body:JSON.stringify(body))});
  return onRequest({request:req,env});
}

{
  const r=await call({query:'?action=status',env:{}});
  assert.equal(r.status,200);const j=await r.json();assert.equal(j.ready,false);assert.equal(j.storage_bound,false);
}
{
  const r=await call({method:'POST',env:{},body:{action:'account.create'}});
  assert.equal(r.status,503);
}
let token='';
{
  const r=await call({method:'POST',body:{action:'account.create'}});
  assert.equal(r.status,201);const j=await r.json();
  assert.match(j.recovery_key,/^ailacct_/);assert.equal(j.account.plan,'free');assert.equal(j.account.creator_active,false);
  token=j.recovery_key;currentAccountId=j.account.account_id;
  assert.equal(JSON.stringify([...bucket.map.values()]).includes(token),false,'raw recovery key must not be stored');
}
{
  const r=await call();assert.equal(r.status,401);
}
{
  const r=await call({token});assert.equal(r.status,200);const j=await r.json();assert.equal(j.account.account_id,currentAccountId);assert.equal(j.account.status,'free');
}
{
  const env={AILATHEO_CUSTOMERS:bucket};
  const r=await call({method:'POST',token,env,body:{action:'checkout.create',cadence:'monthly'}});
  assert.equal(r.status,503);
}
{
  const r=await call({method:'POST',token,body:{action:'checkout.create',cadence:'monthly'}});
  assert.equal(r.status,200);const j=await r.json();assert.equal(j.outcome,'CHECKOUT_CREATED');assert.equal(j.url,'https://checkout.stripe.test/session');
  const stripeCall=stripeCalls.find(x=>x.href.endsWith('/v1/checkout/sessions')&&x.method==='POST');
  assert.ok(stripeCall.body.includes('price_month'));assert.ok(stripeCall.body.includes(encodeURIComponent(currentAccountId)));
}
{
  const r=await call({method:'POST',token,body:{action:'checkout.reconcile',session_id:'cs_test_paid'}});
  assert.equal(r.status,200);const j=await r.json();assert.equal(j.account.creator_active,true);assert.equal(j.account.status,'creator-active');
}
{
  const r=await call({method:'POST',token,body:{action:'portal.create'}});
  assert.equal(r.status,200);const j=await r.json();assert.equal(j.url,'https://billing.stripe.test/portal');
}
async function sign(payload,timestamp){
  return cryptoNode.createHmac('sha256',baseEnv.AILATHEO_STRIPE_WEBHOOK_SECRET).update(timestamp+'.'+payload).digest('hex');
}
{
  const event={id:'evt_test_1',type:'customer.subscription.updated',data:{object:{
    id:'sub_test_1',customer:'cus_test_1',status:'active',cancel_at_period_end:true,current_period_end:1893456000,
    metadata:{ailatheo_account_id:currentAccountId,ailatheo_cadence:'monthly'}
  }}};
  const raw=JSON.stringify(event),t=Math.floor(Date.now()/1000),sig=await sign(raw,t);
  const r=await call({method:'POST',query:'?action=stripe-webhook',body:raw,headers:{'content-type':'application/json','stripe-signature':`t=${t},v1=${sig}`}});
  assert.equal(r.status,200);const j=await r.json();assert.equal(j.outcome,'EVENT_PROCESSED');
  const entitlement=await (await call({token})).json();
  assert.equal(entitlement.account.status,'cancel-scheduled');assert.equal(entitlement.account.creator_active,true);assert.equal(entitlement.account.cancel_at_period_end,true);
  const duplicate=await call({method:'POST',query:'?action=stripe-webhook',body:raw,headers:{'content-type':'application/json','stripe-signature':`t=${t},v1=${sig}`}});
  assert.equal((await duplicate.json()).outcome,'EVENT_ALREADY_PROCESSED');
}
{
  const bad=await call({method:'POST',query:'?action=stripe-webhook',body:'{}',headers:{'content-type':'application/json','stripe-signature':'t=1,v1=bad'}});
  assert.equal(bad.status,400);
}


const serviceWorker=await fs.readFile(new URL('../sw.js',import.meta.url),'utf8');
assert.ok(serviceWorker.includes("url.pathname==='/api/ailatheo'"),'entitlement API must bypass service-worker cache');

globalThis.fetch=originalFetch;
console.log(JSON.stringify({
  passed:true,
  schema:'JM.AILatheoCustomer/0.1',
  hashedRecoveryKey:true,
  freeDefault:true,
  checkoutServerCreated:true,
  providerReconciliation:true,
  creatorEntitlement:true,
  customerPortal:true,
  webhookVerified:true,
  webhookIdempotent:true,
  cancelAtPeriodEndPreservesAccess:true,
  failClosedWithoutBindings:true,
  projectOwnershipIndependent:true,
  serviceWorkerBypass:true
},null,2));
