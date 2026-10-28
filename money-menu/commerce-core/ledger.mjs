// JM Money Menu: portable state machinery, not a card payment processor.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const ZERO='0'.repeat(64), SCHEMA='JM.MoneyMenu.PrivateLedger/1';
const ok=(value,error)=>{if(!value)throw Error(error)};
const valid=s=>typeof s==='string'&&/^[a-zA-Z0-9_-]{5,80}$/.test(s);
const id=s=>{ok(valid(s),'INVALID_REFERENCE');return s};
const guard=file=>{let cursor=path.parse(file).root;for(const part of file.slice(cursor.length).split(path.sep)){cursor=path.join(cursor,part);try{ok(!fs.lstatSync(cursor).isSymbolicLink(),'UNSAFE_LEDGER_PATH')}catch(e){if(e.code==='ENOENT')break;throw e}}};
const entryCore=e=>({seq:e.seq,at:e.at,type:e.type,orderId:e.orderId,data:e.data,prevHash:e.prevHash});
export class CommerceLedger{
 constructor(file,{verifyPayment,verifyRefund,providerAccount}={}){
  this.file=path.resolve(file);this.verifyPayment=verifyPayment;this.verifyRefund=verifyRefund;this.providerAccount=providerAccount||null;
 }
 _load(){
  guard(this.file);
  if(!fs.existsSync(this.file))return {schema:SCHEMA,events:[],head:ZERO};
  const st=fs.lstatSync(this.file);ok(st.isFile()&&!st.isSymbolicLink()&&st.size<=16*1024*1024,'UNSAFE_LEDGER_FILE');
  const db=JSON.parse(fs.readFileSync(this.file,'utf8'));
  ok(db&&db.schema===SCHEMA&&Array.isArray(db.events),'INVALID_LEDGER_SCHEMA');
  let prior=ZERO;for(let i=0;i<db.events.length;i++){
   const e=db.events[i];ok(e&&e.seq===i+1&&e.prevHash===prior&&e.hash===sha(JSON.stringify(entryCore(e))),'LEDGER_CHAIN_TAMPER');prior=e.hash;
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
 _transaction(change){
  guard(this.file);fs.mkdirSync(path.dirname(this.file),{recursive:true,mode:0o700});guard(this.file);
  const lock=this.file+'.lock';let fd;
  try{fd=fs.openSync(lock,'wx',0o600)}catch(e){if(e.code==='EEXIST')throw Error('LEDGER_BUSY');throw e}
  // Never hold this local-filesystem lock across provider awaits. A crash leaves
  // a fail-closed lock; an operator must establish writer death before removal.
  try{return change(this._load())}finally{fs.closeSync(fd);fs.unlinkSync(lock)}
 }
 _append(db,type,orderId,data){
  const e={seq:db.events.length+1,at:new Date().toISOString(),type,orderId,data,prevHash:db.head};e.hash=sha(JSON.stringify(entryCore(e)));
  db.events.push(e);db.head=e.hash;fs.mkdirSync(path.dirname(this.file),{recursive:true,mode:0o700});
  const temp=this.file+'.tmp-'+crypto.randomBytes(8).toString('hex'),fd=fs.openSync(temp,'wx',0o600);
  try{
   try{const content=JSON.stringify(db,null,2);ok(Buffer.byteLength(content)<=16*1024*1024,'LEDGER_CAPACITY');fs.writeFileSync(fd,content);fs.fsyncSync(fd)}finally{fs.closeSync(fd)}
   guard(this.file);fs.renameSync(temp,this.file);
   const parent=fs.openSync(path.dirname(this.file),'r');try{fs.fsyncSync(parent)}finally{fs.closeSync(parent)}
  }finally{if(fs.existsSync(temp))fs.unlinkSync(temp)}
  return this._order(db,orderId);
 }
 read(orderId){return this._order(this._load(),id(orderId))}
 verifyIntegrity({checkpoint}={}){const db=this._load();
  if(checkpoint){ok(Number.isSafeInteger(checkpoint.events)&&checkpoint.events>=0&&checkpoint.events<=db.events.length&&
   (checkpoint.events===0?ZERO:db.events[checkpoint.events-1].hash)===checkpoint.head,'LEDGER_CHECKPOINT_MISMATCH')}
  return {ok:true,events:db.events.length,head:db.head}}

 createOrder({id:orderId,offerId,amountMinor,currency='GBP',termsReference}){
  id(orderId);id(offerId);id(termsReference);
  ok(Number.isSafeInteger(amountMinor)&&amountMinor>0&&amountMinor<=100000000,'INVALID_AMOUNT');
  ok(currency==='GBP','CURRENCY_NOT_SUPPORTED_CP01');
  return this._transaction(db=>{ok(!this._order(db,orderId),'ORDER_ALREADY_EXISTS');
   return this._append(db,'CREATED',orderId,{offerId,amountMinor,currency,termsReference});});
 }
 async reconcilePayment(orderId,providerRef){
  id(orderId);id(providerRef);
  ok(this.read(orderId),'ORDER_NOT_FOUND');
  ok(typeof this.verifyPayment==='function','NO_PROVIDER_VERIFIER');
  const result=await this.verifyPayment(providerRef);
  return this._transaction(db=>{const order=this._order(db,orderId);ok(order,'ORDER_NOT_FOUND');
  ok(result&&result.status==='paid'&&result.providerRef===providerRef&&result.orderId===orderId,'PAYMENT_NOT_PROVIDER_VERIFIED');
  ok(result.amountMinor===order.amountMinor&&result.currency===order.currency,'PAYMENT_AMOUNT_MISMATCH');
  ok(typeof result.livemode==='boolean','PAYMENT_MODE_UNVERIFIED');
  if(this.providerAccount)ok(result.account===this.providerAccount,'PAYMENT_ACCOUNT_MISMATCH');
  const type=result.livemode?'LIVE_PAYMENT_VERIFIED':'TEST_PAYMENT_VERIFIED';
  const dup=db.events.find(e=>['LIVE_PAYMENT_VERIFIED','TEST_PAYMENT_VERIFIED'].includes(e.type)&&e.data.providerRef===providerRef);
  if(dup){ok(dup.orderId===orderId&&dup.type===type,'PAYMENT_REFERENCE_REPLAY');return this._order(db,orderId)}
  ok(order.status==='AWAITING_PAYMENT','ORDER_NOT_AWAITING_PAYMENT');
  return this._append(db,type,orderId,{providerRef,livemode:result.livemode,account:result.account||null});});
 }
 recordDelivery(orderId,receiptRef){
  id(orderId);id(receiptRef);return this._transaction(db=>{const order=this._order(db,orderId);ok(order,'ORDER_NOT_FOUND');
  if(order.status==='DELIVERED'){ok(order.delivery.receiptRef===receiptRef,'DELIVERY_ALREADY_RECORDED');return order}
  ok(order.status==='LIVE_PAID','DELIVERY_REQUIRES_LIVE_PAYMENT');
  return this._append(db,'DELIVERY_RECORDED',orderId,{receiptRef});});
 }
 async reconcileRefund(orderId,providerRef){
  id(orderId);id(providerRef);const order=this.read(orderId);ok(order?.payment,'ORDER_HAS_NO_PAYMENT');
  ok(providerRef===order.payment.providerRef,'REFUND_REFERENCE_MISMATCH');
  if(order.status==='REFUNDED')return order;
  ok(['LIVE_PAID','DELIVERED'].includes(order.status),'REFUND_REQUIRES_LIVE_ORDER');
  ok(typeof this.verifyRefund==='function','NO_REFUND_VERIFIER');
  const result=await this.verifyRefund(providerRef);
  return this._transaction(db=>{const order=this._order(db,orderId);
  ok(order?.payment&&order.payment.providerRef===providerRef,'REFUND_REFERENCE_MISMATCH');
  if(order.status==='REFUNDED')return order;
  ok(['LIVE_PAID','DELIVERED'].includes(order.status),'REFUND_REQUIRES_LIVE_ORDER');
  ok(result&&result.status==='refunded'&&result.orderId===orderId&&result.providerRef===order.payment.providerRef&&result.livemode===true,'REFUND_NOT_PROVIDER_VERIFIED');
  ok(result.amountMinor===order.amountMinor&&result.currency===order.currency,'REFUND_AMOUNT_MISMATCH');
  if(this.providerAccount)ok(result.account===this.providerAccount,'REFUND_ACCOUNT_MISMATCH');
  return this._append(db,'REFUND_VERIFIED',orderId,{providerRef});});
 }
}
