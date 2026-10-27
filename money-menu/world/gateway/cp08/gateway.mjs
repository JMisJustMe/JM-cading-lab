/** JM Business World CP08 — security-hardened, sandbox-only commerce gateway.
 * Descendant of CP07; CP07 is preserved. Node 22+, no third-party packages.
 * NOT PUBLIC PRODUCTION / NO LIVE PAYMENTS / NOT LEGAL APPROVAL.
 */
import http from 'node:http';
import {createHmac,timingSafeEqual,randomUUID,createHash,randomBytes} from 'node:crypto';
import {readFile,writeFile,rename,mkdir,open,unlink} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';

export const OFFERS=Object.freeze({'jm-secrets-of-silence':Object.freeze({title:'Secrets of Silence — Digital Edition',priceMinor:1499,currency:'gbp',kind:'digital',status:'SANDBOX_TESTED'})});
export const SCHEMA='JM.BusinessWorld.CP08.SandboxLedger/1';
const consentVersion='JM-DIGITAL-CONSUMER-LEGAL-REVIEW-PENDING';
const nowIso=()=>new Date().toISOString();
const hash=s=>createHash('sha256').update(String(s)).digest('hex');
const equal=(x,y)=>{const a=Buffer.from(String(x));const b=Buffer.from(String(y));return a.length===b.length&&timingSafeEqual(a,b)};
const assert=(test,msg)=>{if(!test)throw new Error(msg)};
export function signedWebhook(raw,header,secret,clock=Math.floor(Date.now()/1000),tolerance=300){
 if(!Buffer.isBuffer(raw)||!header||!secret)return false;
 const pieces=String(header).split(',').map(s=>s.trim());
 const t=pieces.find(s=>/^t=\d+$/.test(s));const sigs=pieces.filter(s=>/^v1=[a-fA-F0-9]{64}$/.test(s));
 if(!t||!sigs.length)return false;
 const ts=Number(t.slice(2));if(!Number.isSafeInteger(ts)||Math.abs(clock-ts)>tolerance)return false;
 const expected=createHmac('sha256',secret).update(`${ts}.`).update(raw).digest('hex');
 return sigs.some(s=>equal(expected,s.slice(3).toLowerCase()));
}
async function saveLedger(file,ledger){
 await mkdir(dirname(file),{recursive:true});const tmp=file+'.'+randomUUID()+'.tmp';
 const handle=await open(tmp,'wx',0o600);
 try{await handle.writeFile(JSON.stringify(ledger,null,2));await handle.sync()}finally{await handle.close()}
 await rename(tmp,file);
 const dir=await open(dirname(file),'r');try{await dir.sync()}finally{await dir.close()}
}
export async function claimProcessLock(file){
 await mkdir(dirname(file),{recursive:true});let handle;
 try{handle=await open(file+'.lock','wx',0o600)}catch(e){if(e.code==='EEXIST')throw Error('Existing ledger lock: inspect and resolve before new instance');throw e}
 await handle.writeFile(JSON.stringify({pid:process.pid,startedAt:nowIso()}));await handle.sync();
 return async()=>{await handle.close();await unlink(file+'.lock')};
}
function cleanEmail(email){assert(typeof email==='string'&&email.length<=254&&/^[^@\s]{1,64}@[^@\s]+\.[^@\s]+$/.test(email),'Valid buyer email required');return email.toLowerCase().trim()}
function readConsent(x){assert(x&&x.version===consentVersion&&x.termsAcknowledged===true&&x.instantSupplyConsent===true&&x.cancellationLossAcknowledged===true,'Explicit separate digital consent and acknowledgement required');return {version:x.version,termsAcknowledged:true,instantSupplyConsent:true,cancellationLossAcknowledged:true,at:nowIso(),jurisdiction:'UK_REVIEW_PENDING'};}
function validRequestKey(x){assert(typeof x==='string'&&/^[a-zA-Z0-9_-]{16,128}$/.test(x),'Client request key must be 16-128 safe characters');return x}
function safePublicOrder(o){return {orderId:o.id,offerId:o.offerId,status:o.status,environment:'test',release:o.release.status};}
export function createGateway({stripeSecret,webhookSecret,ledgerFile,siteOrigin,adminToken,stripeAccount,fetchImpl=fetch}){
 assert(/^sk_test_/.test(stripeSecret||''),'Only a Stripe test secret is accepted');
 assert(/^whsec_/.test(webhookSecret||''),'Stripe webhook signing secret required');
 assert(/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(siteOrigin||''),'Approved HTTPS origin only');
 assert(typeof adminToken==='string'&&adminToken.length>=32&&adminToken.length<=256,'Long admin token required');
 assert(typeof ledgerFile==='string'&&ledgerFile.length>0,'Ledger file required');
 let busy=Promise.resolve(); const serialized=task=>{const p=busy.then(task,task);busy=p.catch(()=>{});return p};
 const read=async()=>{
  try{const db=JSON.parse(await readFile(ledgerFile,'utf8'));assert(db.schema===SCHEMA&&db.environment==='test'&&db.orders&&db.events&&db.requests,'Ledger schema/environment mismatch');return db}
  catch(e){if(e.code==='ENOENT')return {schema:SCHEMA,environment:'test',orders:{},events:{},requests:{}};throw e}
 };
 const transaction=fn=>serialized(async()=>{const db=await read();const result=await fn(db);await saveLedger(ledgerFile,db);return result});
 async function stripeCheckout(params,idempotencyKey){
  const response=await fetchImpl('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{authorization:`Bearer ${stripeSecret}`,'content-type':'application/x-www-form-urlencoded','idempotency-key':idempotencyKey},body:new URLSearchParams(params)});
  assert(response&&typeof response.json==='function','Stripe transport response invalid');const result=await response.json();
  if(!response.ok)throw Error('Stripe checkout rejected: '+String(result?.error?.type||response.status));
  assert(result.id?.startsWith('cs_test_')&&result.livemode===false&&/^https:\/\/checkout\.stripe\.com\//.test(result.url||''),'Stripe sandbox session evidence invalid');
  assert(result.amount_total===1499&&result.currency==='gbp','Stripe response total/currency mismatch');
  return result;
 }
 async function checkout(input){
  assert(input&&typeof input==='object'&&!Array.isArray(input),'Checkout JSON object required');
  assert(Object.prototype.hasOwnProperty.call(OFFERS,input.offerId),'Offer not approved');const offer=OFFERS[input.offerId];
  const email=cleanEmail(input.customerEmail);const key=validRequestKey(input.requestKey);const consent=readConsent(input.consent);
  const requestHash=hash(key), fingerprint=hash(JSON.stringify([input.offerId,email,consent.version,consent.instantSupplyConsent,consent.cancellationLossAcknowledged]));
  return transaction(async db=>{
   let id=db.requests[requestHash];let order=id?db.orders[id]:null;
   if(order){assert(order.fingerprint===fingerprint,'Same request key with different checkout parameters');if(order.status==='CHECKOUT_OPEN')return {orderId:order.id,status:order.status,environment:'test',url:order.checkoutUrl};}
   else{ id=randomUUID();order={id,offerId:input.offerId,amount:offer.priceMinor,currency:offer.currency,status:'CHECKOUT_PENDING',environment:'test',email,consent,fingerprint,stripeSession:null,checkoutUrl:null,release:{status:'HELD',digest:null},createdAt:nowIso(),attempts:0};db.orders[id]=order;db.requests[requestHash]=id;}
   // Persist pending intent BEFORE calling the provider, so ambiguous network failures can retry same provider idempotency key.
   await saveLedger(ledgerFile,db);
   const params={mode:'payment',success_url:siteOrigin+'/?jm_checkout=returned',cancel_url:siteOrigin+'/?jm_checkout=cancelled',client_reference_id:id,customer_email:email,'line_items[0][quantity]':'1','line_items[0][price_data][currency]':offer.currency,'line_items[0][price_data][unit_amount]':String(offer.priceMinor),'line_items[0][price_data][product_data][name]':offer.title,'metadata[jm_order_id]':id,'metadata[jm_offer_id]':input.offerId,'payment_intent_data[metadata][jm_order_id]':id};
   try{const session=await stripeCheckout(params,'jm_cp08_'+id);order.status='CHECKOUT_OPEN';order.stripeSession=session.id;order.checkoutUrl=session.url;order.attempts+=1;return {orderId:id,status:order.status,environment:'test',url:session.url};}
   catch(e){order.status='CHECKOUT_UNCERTAIN';order.attempts+=1;throw Object.assign(new Error('Stripe session unconfirmed; retry the SAME requestKey'),{cause:e});}
   finally{await saveLedger(ledgerFile,db)}
  });
 }
 async function webhook(raw,header){
  assert(signedWebhook(raw,header,webhookSecret),'Bad webhook signature');
  let event;try{event=JSON.parse(raw.toString('utf8'))}catch{throw Error('Malformed event JSON')}
  assert(typeof event.id==='string'&&/^evt_/.test(event.id)&&typeof event.type==='string','Invalid event identity');
  return transaction(async db=>{
   if(db.events[event.id])return {state:'REPLAY_IGNORED'};
   const types=['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','checkout.session.expired'];
   if(!types.includes(event.type)){db.events[event.id]='IGNORED';return {state:'IGNORED'}}
   const s=event.data?.object;
   assert(event.livemode===false&&s?.livemode===false,'Live event forbidden by test gateway');
   if(stripeAccount)assert((event.account||stripeAccount)===stripeAccount,'Account mismatch');
   const o=db.orders[s?.client_reference_id];assert(o,'Unknown order');
   assert(s.id===o.stripeSession&&s.currency===o.currency&&s.amount_total===o.amount,'Provider session/amount mismatch');
   assert(s.metadata?.jm_order_id===o.id&&s.metadata?.jm_offer_id===o.offerId,'Provider original offer mismatch');
   assert(s.mode==='payment','Wrong provider payment mode');
   if(s.payment_status==='paid'&&s.status==='complete'&&(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded')){
    o.status='PAID_TEST_PROVIDER_CONFIRMED';o.paymentEvidence={event:event.id,session:s.id,at:nowIso(),livemode:false};
   }else if(o.status!=='PAID_TEST_PROVIDER_CONFIRMED'&&o.status!=='MANUAL_RELEASE_READY'){
    o.status=event.type==='checkout.session.async_payment_failed'?'PAYMENT_FAILED_TEST':event.type==='checkout.session.expired'?'SESSION_EXPIRED_TEST':'CHECKOUT_UNPAID_TEST';
   }
   db.events[event.id]=event.type;return {state:o.status,orderId:o.id};
  });
 }
 async function ownerOrder(id){const db=await read();return db.orders[id]||null}
 async function publicOrder(id,capability){const o=await ownerOrder(id);if(!o||!equal(capability||'',hash(adminToken+':'+id)))return null;return safePublicOrder(o)}
 function orderCapability(id){return hash(adminToken+':'+id)}
 function authorized(token){return equal(token||'',adminToken)}
 async function release(id,digest){assert(/^[a-f0-9]{64}$/.test(digest||''),'Exact reader package digest required');return transaction(async db=>{
  const o=db.orders[id];assert(o&&o.status==='PAID_TEST_PROVIDER_CONFIRMED','Provider-paid sandbox evidence required');assert(o.release.status==='HELD','Release already prepared');
  o.release={status:'MANUAL_TEST_RELEASE_READY_NOT_DELIVERED',digest,preparedAt:nowIso()};return {orderId:id,status:o.release.status,environment:'test'};
 });}
 return {checkout,webhook,ownerOrder,publicOrder,release,authorized,orderCapability,offers:OFFERS,ledgerFile};
}
export function serve(gateway,{port=8787,host='127.0.0.1',maxBytes=65536}={}){
 assert(['127.0.0.1','::1','localhost'].includes(host),'CP08 public-facing bind disabled');
 const failures=new Map();
 const respond=(res,status,obj,extra={})=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer',...extra});res.end(JSON.stringify(obj))};
 const server=http.createServer(async(req,res)=>{
  try{
   const path=new URL(req.url,'http://localhost').pathname;
   if(req.method==='GET'&&path==='/demo'){const html=await readFile(new URL('./sandbox-demo.html',import.meta.url),'utf8');res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'"});return res.end(html)}
   if(req.method==='GET'&&path==='/health')return respond(res,200,{status:'sandbox-ready',paymentMode:'TEST_ONLY',liveSales:false});
   if(req.method==='GET'&&path.startsWith('/order/')){
    const id=path.slice('/order/'.length);const cap=req.headers['x-jm-order-capability'];return respond(res,200,(await gateway.publicOrder(id,cap))||{status:'NOT_FOUND'});
   }
   if(req.method==='GET'&&path.startsWith('/admin/order/')){
    if(!gateway.authorized(String(req.headers.authorization||'').replace(/^Bearer /i,'')))return respond(res,401,{error:'Forbidden'});
    return respond(res,200,(await gateway.ownerOrder(path.slice('/admin/order/'.length)))||{status:'NOT_FOUND'});
   }
   if(req.method!=='POST'||!['/checkout','/webhook','/admin/release'].includes(path))return respond(res,404,{error:'Not found'});
   if(path==='/admin/release'&&!gateway.authorized(String(req.headers.authorization||'').replace(/^Bearer /i,'')))return respond(res,401,{error:'Forbidden'});
   const ip=req.socket.remoteAddress||'unknown',key=ip+':'+path,now=Date.now();const q=failures.get(key)||[];const recent=q.filter(t=>now-t<60000);recent.push(now);failures.set(key,recent);
   if(path==='/checkout'&&recent.length>12)return respond(res,429,{error:'Local checkout rate limit'});
   let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>maxBytes)return respond(res,413,{error:'Body too large'});chunks.push(chunk)}const raw=Buffer.concat(chunks);
   if(path==='/webhook')return respond(res,200,await gateway.webhook(raw,req.headers['stripe-signature']));
   if(req.headers['content-type']?.split(';')[0]!=='application/json')return respond(res,415,{error:'JSON required'});
   let body;try{body=JSON.parse(raw.toString('utf8'))}catch{return respond(res,400,{error:'Invalid JSON'})}
   if(path==='/checkout'){
    const result=await gateway.checkout(body);return respond(res,200,{...result,capability:gateway.orderCapability(result.orderId)});
   }
   return respond(res,200,await gateway.release(body.orderId,body.sha256));
  }catch(e){return respond(res,400,{error:String(e.message).slice(0,160)})}
 });
 server.listen(port,host);return server;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+resolve(process.argv[1])).href){
 const need=['STRIPE_TEST_SECRET_KEY','STRIPE_TEST_WEBHOOK_SECRET','JM_LEDGER_FILE','JM_SITE_ORIGIN','JM_CP08_ADMIN_TOKEN'];for(const k of need)assert(process.env[k],'Missing '+k);
 const file=process.env.JM_LEDGER_FILE;const releaseLock=await claimProcessLock(file);
 const g=createGateway({stripeSecret:process.env.STRIPE_TEST_SECRET_KEY,webhookSecret:process.env.STRIPE_TEST_WEBHOOK_SECRET,ledgerFile:file,siteOrigin:process.env.JM_SITE_ORIGIN,adminToken:process.env.JM_CP08_ADMIN_TOKEN,stripeAccount:process.env.STRIPE_ACCOUNT_ID});
 const server=serve(g,{port:Number(process.env.PORT)||8787});console.log('JM CP08 TEST ONLY — localhost gateway ready');
 const shutdown=async()=>{server.close();await releaseLock();process.exit(0)};process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
}