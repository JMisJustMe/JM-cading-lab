// JM CP04 private device contact: inherit CP03 signing, CP02 custody and CP01 native bodies.
// Candidate only; no physical owner contact / Internet / SMTP / mail delivery claimed.
import https from 'node:https';
import tls from 'node:tls';
import net from 'node:net';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,createHmac,timingSafeEqual,X509Certificate} from 'node:crypto';
import {JMDurableNetwork} from '../cp02/jm-durable-spool.mjs';
import {createPacket,signPacket,verifyPacket} from '../cp03/jm-private-contact.mjs';
export {createPacket};
export const PROTOCOL='JM.DeviceContact/0.1';
const err=code=>Object.assign(new Error(code),{code});
const hash=s=>createHash('sha256').update(s).digest('hex');
const sign=(key,raw)=>createHmac('sha256',key).update(raw).digest('hex');
const eq=(a,b)=>typeof a==='string'&&typeof b==='string'&&/^[a-f0-9]{64}$/i.test(a)&&/^[a-f0-9]{64}$/i.test(b)&&timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));
export function pairToken(key){if(typeof key!=='string'||!/^[a-f0-9]{64}$/i.test(key))throw err('PAIR_TOKEN_REQUIRED_32_BYTES_HEX');return key.toLowerCase();}
export function privateIPv4(host){
  if(typeof host!=='string'||net.isIP(host)!==4)return false;
  const [a,b,c,d]=host.split('.').map(Number);
  return a===10||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===127&&b===0&&c===0&&d===1);
}
function requireHost(host){if(!privateIPv4(host))throw err('NUMERIC_PRIVATE_IPV4_REQUIRED');return host;}
function portOK(p,zero=false){if(!Number.isInteger(p)||p<(zero?0:1)||p>65535)throw err('INVALID_PORT');}
export function fingerprint(pem){try{return new X509Certificate(pem).fingerprint256.replaceAll(':','').toLowerCase();}catch{throw err('CERTIFICATE_REQUIRED');}}
export function normalizePin(pin){
  if(typeof pin!=='string'||!(/^[0-9a-fA-F]{64}$/.test(pin)||/^([0-9a-fA-F]{2}:){31}[0-9a-fA-F]{2}$/.test(pin)))throw err('CERTIFICATE_PIN_REQUIRED');
  return pin.replaceAll(':','').toLowerCase();
}
async function nonceDir(root){
  const dir=path.join(root,'.cp04-nonces');
  await fs.mkdir(dir,{mode:0o700}).catch(e=>{if(e.code!=='EEXIST')throw e;});
  const st=await fs.lstat(dir);
  if(!st.isDirectory()||st.isSymbolicLink()||(st.mode&0o077)!==0)throw err('NONCE_DIRECTORY_UNSAFE');
  return dir;
}
async function claimNonce(root,nonce,issuedAt){
  const dir=await nonceDir(root),file=path.join(dir,hash('JM_CP04_NONCE:'+nonce)+'.seen');
  let handle;
  try{
    handle=await fs.open(file,'wx',0o600);
    await handle.writeFile(String(issuedAt));
    await handle.sync();await handle.close();handle=null;
    const d=await fs.open(dir,'r');try{await d.sync();}finally{await d.close();}
  }catch(e){if(e.code==='EEXIST')throw err('NONCE_REPLAY');throw err('NONCE_CUSTODY_HOLD');}
  finally{if(handle)await handle.close();}
}
export async function startDeviceReceiver({root,token,certPem,keyPem,bind,port}){
  const key=pairToken(token);requireHost(bind);portOK(port,true);
  if(typeof keyPem!=='string'||!keyPem.includes('PRIVATE KEY'))throw err('PRIVATE_KEY_REQUIRED');
  const pin=fingerprint(certPem),durable=new JMDurableNetwork(root);
  await durable.spool.prepare();await nonceDir(durable.spool.root);
  const respond=(res,status,body)=>{
    const raw=JSON.stringify(body);
    res.writeHead(status,{'content-type':'application/json','cache-control':'no-store',
      'x-content-type-options':'nosniff','x-jm-response-signature':sign(key,raw)});
    res.end(raw);
  };
  const server=https.createServer({cert:certPem,key:keyPem,minVersion:'TLSv1.3',maxVersion:'TLSv1.3'},async(req,res)=>{
    if(req.socket.getProtocol()!=='TLSv1.3'||!privateIPv4(req.socket.remoteAddress))return respond(res,403,{schema:PROTOCOL,result:'denied',reason:'PEER_DENIED'});
    if(req.method!=='POST'||req.url!=='/v1/contact')return respond(res,404,{schema:PROTOCOL,result:'denied',reason:'ROUTE_DENIED'});
    if(req.headers.origin||req.headers['content-type']!=='application/json')return respond(res,415,{schema:PROTOCOL,result:'denied',reason:'CONTENT_TYPE_DENIED'});
    if(Number(req.headers['content-length']||0)>8192)return respond(res,413,{schema:PROTOCOL,result:'denied',reason:'PACKET_TOO_LARGE'});
    let raw='',n=0;
    try{
      for await(const chunk of req){n+=chunk.length;if(n>8192)throw err('PACKET_TOO_LARGE');raw+=chunk.toString('utf8');}
      const p=verifyPacket(raw,req.headers['x-jm-signature'],key,new Set());
      await claimNonce(durable.spool.root,p.nonce,p.issuedAt);
      const r=await durable.accept({id:p.id,channel:p.channel,message:p.message,role:'owner',validated:true});
      if(r.result==='queued'&&r.persisted===true)return respond(res,200,{schema:PROTOCOL,id:p.id,result:'persisted',scope:'PRIVATE_TLS13_TO_LOCAL_DISK',sha256:r.durable.sha256});
      if(r.reason==='DUPLICATE_DURABLE_ID')return respond(res,409,{schema:PROTOCOL,id:p.id,result:'denied',reason:r.reason});
      return respond(res,503,{schema:PROTOCOL,id:p.id,result:'hold',reason:r.reason||'CUSTODY_UNPROVEN'});
    }catch(e){
      const reason=e.code||'PROCESSING_HOLD';
      return respond(res,['SIGNATURE_INVALID','TIMESTAMP_STALE','NONCE_REPLAY'].includes(reason)?401:reason==='PACKET_TOO_LARGE'?413:400,{schema:PROTOCOL,result:'denied',reason});
    }
  });
  server.headersTimeout=7000;server.requestTimeout=10000;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,bind,resolve);});
  return {server,port:server.address().port,bind,fingerprint:pin,durable,close:()=>new Promise((ok,no)=>server.close(e=>e?no(e):ok()))};
}
export async function sendDeviceContact({host,port,token,certPem,pin,packet}){
  requireHost(host);portOK(port);const key=pairToken(token),pinned=normalizePin(pin);
  if(!eq(fingerprint(certPem),pinned))throw err('CERTIFICATE_PIN_MISMATCH');
  if(!packet||typeof packet!=='object')throw err('PACKET_REQUIRED');
  const raw=JSON.stringify(packet);if(Buffer.byteLength(raw)>8192)throw err('PACKET_TOO_LARGE');
  return await new Promise((resolve,reject)=>{
    const req=https.request({hostname:host,port,method:'POST',path:'/v1/contact',ca:certPem,
      rejectUnauthorized:true,minVersion:'TLSv1.3',maxVersion:'TLSv1.3',
      checkServerIdentity:(name,cert)=>{
        const invalid=tls.checkServerIdentity(name,cert);if(invalid)return invalid;
        if(!eq(cert.raw?hash(cert.raw):'',pinned))return err('CERTIFICATE_PIN_MISMATCH');
      },timeout:7000,headers:{'content-type':'application/json','content-length':Buffer.byteLength(raw),'x-jm-signature':signPacket(packet,key)}},res=>{
      let n=0;const data=[];
      res.on('data',part=>{n+=part.length;if(n>8192)return req.destroy(err('RESPONSE_TOO_LARGE'));data.push(part);});
      res.on('end',()=>{
        const answer=Buffer.concat(data).toString('utf8');
        if(!eq(res.headers['x-jm-response-signature'],sign(key,answer)))return reject(err('RESPONSE_SIGNATURE_INVALID'));
        let parsed;try{parsed=JSON.parse(answer);}catch{return reject(err('RESPONSE_INVALID_JSON'));}
        if(parsed?.schema!==PROTOCOL||(parsed.result==='persisted'&&(parsed.id!==packet.id||!/^[a-f0-9]{64}$/.test(parsed.sha256||''))))return reject(err('RESPONSE_SCHEMA_INVALID'));
        resolve({status:res.statusCode,...parsed});
      });
    });
    req.on('socket',socket=>socket.on('secureConnect',()=>{if(!socket.authorized||socket.getProtocol()!=='TLSv1.3')req.destroy(err('TLS13_REQUIRED'));}));
    req.on('timeout',()=>req.destroy(err('CONTACT_TIMEOUT')));req.on('error',reject);req.end(raw);
  });
}
