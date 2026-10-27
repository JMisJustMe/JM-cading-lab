/**
 * JM Network CP03: authenticated loopback contact between processes.
 * Loopback 127.0.0.1 only. No internet, SMTP, owner device proof, or cloud.
 * Uses CP02 durable receipt and CP01's ten native JM donor executions.
 */
import http from 'node:http';
import {URL} from 'node:url';
import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {JMDurableNetwork} from '../cp02/jm-durable-spool.mjs';

export const PROTOCOL='JM.PrivateContact/0.1';
const deny=(code)=>Object.assign(new Error(code),{code});
const sign=(key,body)=>createHmac('sha256',key).update(body).digest('hex');
const secretOK=key=>typeof key==='string'&&Buffer.byteLength(key)>=32;
const idOK=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{3,64}$/.test(id);
const nonceOK=n=>typeof n==='string'&&/^[a-zA-Z0-9_-]{16,64}$/.test(n);
function eqHex(a,b){
  if(typeof a!=='string'||!/^[0-9a-f]{64}$/.test(a))return false;
  return timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));
}
export function createPacket(envelope,options={}){
  if(!idOK(envelope?.id)||!['mail','device','storage'].includes(envelope.channel)||
     typeof envelope.message!=='string'||!envelope.message.trim()||envelope.message.length>2048)
    throw deny('INVALID_PACKET_CONTENT');
  const nonce=options.nonce??randomBytes(16).toString('hex');
  const issuedAt=options.issuedAt??Date.now();
  if(!nonceOK(nonce)||!Number.isSafeInteger(issuedAt))throw deny('INVALID_PACKET_METADATA');
  return {schema:PROTOCOL,id:envelope.id,channel:envelope.channel,message:envelope.message,nonce,issuedAt};
}
export function signPacket(packet,key){
  if(!secretOK(key))throw deny('SECRET_TOO_SHORT');
  return sign(key,JSON.stringify(packet));
}
export function verifyPacket(raw,signature,key,seen,now=Date.now()){
  if(!secretOK(key))throw deny('SECRET_TOO_SHORT');
  if(typeof raw!=='string'||Buffer.byteLength(raw)>8192)throw deny('PACKET_TOO_LARGE');
  if(!eqHex(signature,sign(key,raw)))throw deny('SIGNATURE_INVALID');
  let p;try{p=JSON.parse(raw);}catch{throw deny('PACKET_INVALID_JSON');}
  if(p?.schema!==PROTOCOL||!idOK(p.id)||!nonceOK(p.nonce)||
      !['mail','device','storage'].includes(p.channel)||typeof p.message!=='string'||
      !p.message.trim()||p.message.length>2048||!Number.isSafeInteger(p.issuedAt))
    throw deny('PACKET_INVALID');
  if(Math.abs(now-p.issuedAt)>60000)throw deny('TIMESTAMP_STALE');
  if(seen.has(p.nonce))throw deny('NONCE_REPLAY');
  seen.add(p.nonce);
  return p;
}
export async function startPrivateReceiver({root,key}){
  if(!secretOK(key))throw deny('SECRET_TOO_SHORT');
  const durable=new JMDurableNetwork(root);
  await durable.spool.prepare();
  const seen=new Set();
  const server=http.createServer(async(req,res)=>{
    const respond=(status,body)=>{
      const raw=JSON.stringify(body);
      res.writeHead(status,{'content-type':'application/json','cache-control':'no-store',
        'x-content-type-options':'nosniff','x-jm-response-signature':sign(key,raw)});
      res.end(raw);
    };
    if(req.method!=='POST'||req.url!=='/v1/contact')return respond(404,{result:'denied',reason:'ROUTE_NOT_ALLOWED'});
    if(req.headers.origin||!String(req.headers['content-type']??'').startsWith('application/json'))
      return respond(415,{result:'denied',reason:'INVALID_CONTENT_TYPE'});
    let raw='',size=0;
    try{
      for await(const piece of req){
        size+=piece.length;if(size>8192)throw deny('PACKET_TOO_LARGE');
        raw+=piece.toString('utf8');
      }
      const packet=verifyPacket(raw,req.headers['x-jm-signature'],key,seen);
      // Crucial: role and validation are issued ONLY after key authentication.
      const receipt=await durable.accept({id:packet.id,channel:packet.channel,message:packet.message,role:'owner',validated:true});
      if(receipt.result==='queued'&&receipt.persisted===true)
        return respond(200,{schema:PROTOCOL,id:packet.id,result:'persisted',scope:'LOCAL_LOOPBACK_TO_DISK',sha256:receipt.durable.sha256});
      if(receipt.reason==='DUPLICATE_DURABLE_ID')return respond(409,{schema:PROTOCOL,id:packet.id,result:'denied',reason:'DUPLICATE_DURABLE_ID'});
      return respond(503,{schema:PROTOCOL,id:packet.id,result:'hold',reason:receipt.reason??'PERSISTENCE_UNPROVEN'});
    }catch(e){
      const code=e.code??'PROCESSING_HOLD';
      return respond(['SIGNATURE_INVALID','NONCE_REPLAY','TIMESTAMP_STALE'].includes(code)?401:400,{schema:PROTOCOL,result:'denied',reason:code});
    }
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  return {server,port:server.address().port,seen,durable,close:()=>new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()))};
}
export async function sendPrivateContact(url,key,packet){
  if(!secretOK(key))throw deny('SECRET_TOO_SHORT');
  const target=new URL(url);
  if(target.protocol!=='http:'||target.hostname!=='127.0.0.1'||target.pathname!=='/v1/contact'||
     target.username||target.password||target.search||target.hash)throw deny('TARGET_NOT_LOOPBACK');
  const raw=JSON.stringify(packet);
  if(Buffer.byteLength(raw)>8192)throw deny('PACKET_TOO_LARGE');
  const sig=sign(key,raw);
  return await new Promise((resolve,reject)=>{
    const req=http.request(target,{method:'POST',timeout:5000,headers:{
      'content-type':'application/json','content-length':Buffer.byteLength(raw),'x-jm-signature':sig
    }},res=>{
      const parts=[];let bytes=0;
      res.on('data',chunk=>{bytes+=chunk.length;if(bytes>8192){req.destroy(deny('RESPONSE_TOO_LARGE'));return;}parts.push(chunk);});
      res.on('end',()=>{
        const responseRaw=Buffer.concat(parts).toString('utf8');
        if(!eqHex(res.headers['x-jm-response-signature'],sign(key,responseRaw)))return reject(deny('RESPONSE_SIGNATURE_INVALID'));
        try{resolve({status:res.statusCode,...JSON.parse(responseRaw)});}catch{reject(deny('RESPONSE_INVALID_JSON'));}
      });
    });
    req.on('timeout',()=>req.destroy(deny('CONTACT_TIMEOUT')));
    req.on('error',reject);
    req.end(raw);
  });
}
