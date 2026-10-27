/** JM Business World CP07 — isolated Stripe-hosted Checkout gateway.
 * No Stripe packages required. Node 22+, built-in HTTPS fetch and crypto.
 * Sandbox enforced by default. Owner-authorised live gateway requires separate approvals.
 */
import http from 'node:http';
import {createHmac,timingSafeEqual,randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';

const money=Object.freeze({
 'jm-secrets-of-silence':{name:'Secrets of Silence — Digital Edition',amount:1499,currency:'gbp',kind:'digital',readiness:'PROVEN_SANDBOX'},
 // All other original offers remain ENQUIRY or RELEASE_RETEST_OPEN, not purchasable.
});
const safeEq=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y)};
export function verifyStripeSignature(raw,header,secret,now=Math.floor(Date.now()/1000),tolerance=300){
 if(!Buffer.isBuffer(raw)||!header||!secret)return false;
 const parts=header.split(','); const ts=parts.find(x=>x.trim().startsWith('t='))?.trim().slice(2);
 const sigs=parts.filter(x=>x.trim().startsWith('v1=')).map(x=>x.trim().slice(3));
 if(!/^\d+$/.test(ts||'')||Math.abs(now-Number(ts))>tolerance||!sigs.length)return false;
 const digest=createHmac('sha256',secret).update(`${ts}.`).update(raw).digest('hex');
 return sigs.some(sig=>/^[a-f0-9]{64}$/.test(sig)&&safeEq(sig,digest));
}
export function createGateway({secret,webhookSecret,ledgerFile,origin,environment='test',stripeAccount,fetchImpl=fetch}){
 if(environment!=='test' && environment!=='live')throw Error('unsupported environment');
 if(!secret?.startsWith(environment==='test'?'sk_test_':'sk_live_'))throw Error('Stripe secret environment mismatch');
 if(!webhookSecret?.startsWith('whsec_'))throw Error('webhook secret required');
 if(!/^https:\/\//.test(origin))throw Error('HTTPS site origin required');
 if(environment==='live' && process.env.JM_LIVE_AUTHORIZED!=='I_APPROVE_LIVE_MERCHANT')throw Error('Owner live authorisation missing');
 let busy=Promise.resolve();
 const lock=fn=>{const p=busy.then(fn,fn);busy=p.catch(()=>{});return p};
 const load=async()=>{try{return JSON.parse(await readFile(ledgerFile,'utf8'))}catch(e){if(e.code==='ENOENT')return {schema:'JM.CP07.Ledger/1',environment,orders:{},events:{}};throw e}};
 const save=async(db)=>{await mkdir(dirname(ledgerFile),{recursive:true});const p=ledgerFile+'.'+randomUUID()+'.tmp';await writeFile(p,JSON.stringify(db,null,2),{mode:0o600});await rename(p,ledgerFile)};
 const stripe=async(path,params)=>{
  const response=await fetchImpl('https://api.stripe.com/v1/'+path,{method:'POST',headers:{authorization:`Bearer ${secret}`,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(params)});
  const data=await response.json();if(!response.ok)throw Error('Stripe request rejected: '+(data.error?.type||response.status));return data;
 };
 const enqueue=fn=>lock(async()=>{const db=await load();if(db.environment!==environment)throw Error('ledger environment mismatch');const result=await fn(db);await save(db);return result});
 async function checkout(input){
  if(!money[input?.offerId])throw Error('Offer not approved for checkout');
  const offer=money[input.offerId];
  if(input?.consent?.termsVersion!=='JM-CONSUMER-DIGITAL-DRAFT-1'||input?.consent?.acknowledged!==true)throw Error('Explicit terms acknowledgement required');
  if(input.consent.immediateDigitalSupply!==true || input.consent.lossOfCancellationRightAcknowledged!==true)throw Error('Digital performance consent/acknowledgement required');
  if(typeof input.customerEmail!=='string'||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.customerEmail)||input.customerEmail.length>254)throw Error('Valid buyer email required');
  return enqueue(async db=>{
   const id=randomUUID();
   const params={mode:'payment',success_url:origin+'/money-menu/world/?checkout=returned',cancel_url:origin+'/money-menu/world/?checkout=cancelled',client_reference_id:id,customer_email:input.customerEmail,'line_items[0][quantity]':'1','line_items[0][price_data][currency]':offer.currency,'line_items[0][price_data][unit_amount]':String(offer.amount),'line_items[0][price_data][product_data][name]':offer.name,'metadata[jm_order_id]':id,'metadata[jm_offer_id]':input.offerId};
   const session=await stripe('checkout/sessions',params);
   if(!session.id?.startsWith('cs_'+(environment==='test'?'test_':'live_'))||!session.url)throw Error('Stripe Checkout response environment mismatch');
   db.orders[id]={id,offerId:input.offerId,priceMinor:offer.amount,currency:offer.currency,termsVersion:input.consent.termsVersion,consent:{acknowledged:true,immediateDigitalSupply:true,lossOfCancellationRightAcknowledged:true,at:new Date().toISOString()},stripeSession:session.id,customerEmail:input.customerEmail,status:'CHECKOUT_OPEN',environment,delivery:{status:'HELD',approvedReaderPackage:null},createdAt:new Date().toISOString()};
   return {orderId:id,url:session.url,environment,status:'CHECKOUT_OPEN'};
  });
 }
 async function webhook(raw,header){
  if(!verifyStripeSignature(raw,header,webhookSecret))throw Error('Invalid signed webhook');
  let event;try{event=JSON.parse(raw.toString('utf8'))}catch{throw Error('Invalid Stripe event JSON')}
  if(typeof event.id!=='string'||typeof event.type!=='string')throw Error('Missing event identity');
  return enqueue(async db=>{
   if(db.events[event.id])return {state:'REPLAY_IGNORED'};
   const e=event.data?.object;
   const relevant=['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','checkout.session.expired'];
   if(!relevant.includes(event.type)){db.events[event.id]='IGNORED';return {state:'IGNORED'}}
   if(event.livemode!==(environment==='live')||e?.livemode!==(environment==='live'))throw Error('Stripe livemode mismatch');
   if(stripeAccount && event.account && event.account!==stripeAccount)throw Error('Stripe account mismatch');
   const order=db.orders[e?.client_reference_id];
   if(!order)throw Error('Unknown order reference');
   if(e.id!==order.stripeSession||e.currency!==order.currency||e.amount_total!==order.priceMinor||e.metadata?.jm_offer_id!==order.offerId||e.metadata?.jm_order_id!==order.id)throw Error('Checkout source/amount mismatch');
   const paid=['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)&&e.payment_status==='paid'&&e.status==='complete';
   if(paid){order.status='PAID_PROVIDER_CONFIRMED';order.paymentEvidence={eventId:event.id,sessionId:e.id,environment,at:new Date().toISOString()};}
   else if(order.status!=='PAID_PROVIDER_CONFIRMED'&&order.status!=='DELIVERED')order.status=event.type==='checkout.session.async_payment_failed'?'PAYMENT_FAILED':'CHECKOUT_UNPAID';
   db.events[event.id]=event.type;
   return {state:order.status,orderId:order.id};
  });
 }
 async function status(id){const db=await load();const o=db.orders[id];return o?{orderId:o.id,offerId:o.offerId,status:o.status,environment:o.environment,deliveryStatus:o.delivery.status}:null}
 async function release(id,approvedPackageHash){
  if(!/^[a-f0-9]{64}$/.test(approvedPackageHash))throw Error('Approved reader package SHA256 required');
  return enqueue(async db=>{const o=db.orders[id];if(!o||o.status!=='PAID_PROVIDER_CONFIRMED')throw Error('Verified provider payment required');if(o.delivery.status!=='HELD')throw Error('Already released');o.delivery={status:'MANUAL_RELEASE_READY',approvedReaderPackage:approvedPackageHash};return {orderId:id,status:o.delivery.status,environment}});
 }
 return {checkout,webhook,status,release,offers:money};
}
export function serve(gateway,port=8787){
 const json=(res,status,obj)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'null','x-content-type-options':'nosniff'});res.end(JSON.stringify(obj))};
 return http.createServer(async(req,res)=>{
  if(req.method==='GET'&&req.url==='/health')return json(res,200,{status:'operational',scope:'gateway-local',salesClaim:false});
  if(req.method==='GET'&&req.url.startsWith('/order/'))return json(res,200,(await gateway.status(req.url.slice(7)))||{status:'NOT_FOUND'});
  if(req.method!=='POST'||!['/checkout','/webhook'].includes(req.url))return json(res,404,{error:'Not found'});
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>65536)return json(res,413,{error:'Too large'});chunks.push(chunk)}const raw=Buffer.concat(chunks);
  try {if(req.url==='/webhook')return json(res,200,await gateway.webhook(raw,req.headers['stripe-signature']));if(req.headers['content-type']?.split(';')[0]!=='application/json')return json(res,415,{error:'JSON required'});return json(res,200,await gateway.checkout(JSON.parse(raw.toString('utf8'))))}
  catch(e){return json(res,400,{error:e.message})}
 }).listen(port,'127.0.0.1');
}
if(process.argv[1]&&import.meta.url===new URL('file://'+resolve(process.argv[1])).href){
 const required=['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','JM_LEDGER_FILE','JM_SITE_ORIGIN'];for(const k of required)if(!process.env[k])throw Error('Missing '+k);
 const gateway=createGateway({secret:process.env.STRIPE_SECRET_KEY,webhookSecret:process.env.STRIPE_WEBHOOK_SECRET,ledgerFile:process.env.JM_LEDGER_FILE,origin:process.env.JM_SITE_ORIGIN,environment:process.env.JM_ENVIRONMENT||'test',stripeAccount:process.env.STRIPE_ACCOUNT_ID});serve(gateway,Number(process.env.PORT)||8787);console.log('JM CP07 Gateway listening on localhost — '+(process.env.JM_ENVIRONMENT||'test'));
}