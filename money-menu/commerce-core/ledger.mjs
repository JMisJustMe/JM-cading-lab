// JM Money Menu: portable state machinery, not a card payment processor.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const ZERO='0'.repeat(64), SCHEMA='JM.MoneyMenu.PrivateLedger/1';
const ok=(value,error)=>{if(!value)throw Error(error)};
const valid=s=>typeof s==='string'&&/^[a-zA-Z0-9_-]{5,80}$/.test(s);
const id=s=>{ok(valid(s),'INVALID_REFERENCE');return s};
const entryCore=e=>({seq:e.seq,at:e.at,type:e.type,orderId:e.orderId,data:e.data,prevHash:e.prevHash});
export class CommerceLedger{
 constructor(file,{verifyPayment,verifyRefund,providerAccount}={}){
  this.file=path.resolve(file);this.verifyPayment=verifyPayment;this.verifyRefund=verifyRefund;this.providerAccount=providerAccount||null;
 }
 _load(){
  if(!fs.existsSync(this.file))return {schema:SCHEMA,events:[],head:ZERO};
  const st=fs.lstatSync(this.file);ok(st.isFile()&&!st.isSymbolicLink(),'UNSAFE_LEDGER_FILE');
  const db=JSON.parse(fs.readFileSync(this.file,'utf8'));
  ok(db.schema===SCHEMA&&Array.isArray(db.events),'INVALID_LEDGER_SCHEMA');
  let prior=ZERO;for(let i=0;i<db.events.length;i++){
   const e=db.events[i];ok(e.seq===i+1&&e.prevHash===prior&&e.hash===sha(JSON.stringify(entryCore(e))),'LEDGER_CHAIN_TAMPER');prior=e.hash;
  }
  ok(db.head===prior,'LEDGER_HEAD_TAMPER');return db;
 }
 _order(db,orderId){
  const events=db.events.filter(e=>e.orderId===orderId),create=events.find(e=>e.type==='CREATED');if(!create)return null;
  let status='AWAITING_PAYMENT',payment=null,delivery=null;
  for(const e of events){
   if(e.type==='TEST_PAYMENT_VERIFIED'){status='TEST_PAID';payment=e.data}
   if(e.type==='LIVE_PAYMENT_VERIFIED'){status='LIVE_PAID';payment=e.data}
   if(e.type==='DELIVERY_RECORDED'){status='DELIVERED';delivery=e.data}
   if(e.type==='REFUND_VERIFIED')status='REFUNDED';
  }
  return {id:orderId,offerId:create.data.offerId,amountMinor:create.data.amountMinor,currency:create.data.currency,termsReference:create.data.termsReference,status,payment,delivery};
 }
 _append(db,type,orderId,data){
  const e={seq:db.events.length+1,at:new Date().toISOString(),type,orderId,data,prevHash:db.head};e.hash=sha(JSON.stringify(entryCore(e)));
  db.events.push(e);db.head=e.hash;fs.mkdirSync(path.dirname(this.file),{recursive:true,mode:0o700});
  const temp=this.file+'.tmp-'+crypto.randomBytes(8).toString('hex'),fd=fs.openSync(temp,'wx',0o600);
  try{fs.writeFileSync(fd,JSON.stringify(db,null,2));fs.fsyncSync(fd)}finally{fs.closeSync(fd)}
  fs.renameSync(temp,this.file);return this._order(db,orderId);
 }
 read(orderId){return this._order(this._load(),id(orderId))}
 verifyIntegrity(){const db=this._load();return {ok:true,events:db.events.length,head:db.head}}
 createOrder({id:orderId,offerId,amountMinor,currency='GBP',termsReference}){
  id(orderId);id(offerId);id(termsReference);
  ok(Number.isSafeInteger(amountMinor)&&amountMinor>0&&amountMinor<=100000000,'INVALID_AMOUNT');
  ok(currency==='GBP','CURRENCY_NOT_SUPPORTED_CP01');
  const db=this._load();ok(!this._order(db,orderId),'ORDER_ALREADY_EXISTS');
  return this._append(db,'CREATED',orderId,{offerId,amountMinor,currency,termsReference});
 }
 async reconcilePayment(orderId,providerRef){
  id(orderId);id(providerRef);
  const db=this._load(),order=this._order(db,orderId);ok(order,'ORDER_NOT_FOUND');
  ok(typeof this.verifyPayment==='function','NO_PROVIDER_VERIFIER');
  const result=await this.verifyPayment(providerRef);
  ok(result&&result.status==='paid'&&result.providerRef===providerRef&&result.orderId===orderId,'PAYMENT_NOT_PROVIDER_VERIFIED');
  ok(result.amountMinor===order.amountMinor&&result.currency===order.currency,'PAYMENT_AMOUNT_MISMATCH');
  ok(typeof result.livemode==='boolean','PAYMENT_MODE_UNVERIFIED');
  if(this.providerAccount)ok(result.account===this.providerAccount,'PAYMENT_ACCOUNT_MISMATCH');
  const type=result.livemode?'LIVE_PAYMENT_VERIFIED':'TEST_PAYMENT_VERIFIED';
  const dup=db.events.find(e=>['LIVE_PAYMENT_VERIFIED','TEST_PAYMENT_VERIFIED'].includes(e.type)&&e.data.providerRef===providerRef);
  if(dup){ok(dup.orderId===orderId&&dup.type===type,'PAYMENT_REFERENCE_REPLAY');return this._order(db,orderId)}
  ok(order.status==='AWAITING_PAYMENT','ORDER_NOT_AWAITING_PAYMENT');
  return this._append(db,type,orderId,{providerRef,livemode:result.livemode,account:result.account||null});
 }
 recordDelivery(orderId,receiptRef){
  id(orderId);id(receiptRef);const db=this._load(),order=this._order(db,orderId);ok(order,'ORDER_NOT_FOUND');
  if(order.status==='DELIVERED'){ok(order.delivery.receiptRef===receiptRef,'DELIVERY_ALREADY_RECORDED');return order}
  ok(order.status==='LIVE_PAID','DELIVERY_REQUIRES_LIVE_PAYMENT');
  return this._append(db,'DELIVERY_RECORDED',orderId,{receiptRef});
 }
 async reconcileRefund(orderId,providerRef){
  id(orderId);id(providerRef);const db=this._load(),order=this._order(db,orderId);ok(order?.payment,'ORDER_HAS_NO_PAYMENT');
  if(order.status==='REFUNDED')return order;
  ok(['LIVE_PAID','DELIVERED'].includes(order.status),'REFUND_REQUIRES_LIVE_ORDER');
  ok(typeof this.verifyRefund==='function','NO_REFUND_VERIFIER');
  const result=await this.verifyRefund(providerRef);
  ok(result&&result.status==='refunded'&&result.orderId===orderId&&result.providerRef===order.payment.providerRef&&result.livemode===true,'REFUND_NOT_PROVIDER_VERIFIED');
  ok(result.amountMinor===order.amountMinor&&result.currency===order.currency,'REFUND_AMOUNT_MISMATCH');
  if(this.providerAccount)ok(result.account===this.providerAccount,'REFUND_ACCOUNT_MISMATCH');
  return this._append(db,'REFUND_VERIFIED',orderId,{providerRef});
 }
}
