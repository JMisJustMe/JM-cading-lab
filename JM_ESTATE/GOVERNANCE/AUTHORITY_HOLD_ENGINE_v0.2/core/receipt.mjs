import{assert,canonicalJson,clean,clone}from'./util.mjs';
async function hmacHex(secret,payload){
  const text=new TextEncoder();
  if(globalThis.crypto?.subtle){
    const k=await crypto.subtle.importKey('raw',text.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const sig=await crypto.subtle.sign('HMAC',k,text.encode(payload));
    return[...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  const{createHmac}=await import('node:crypto');return createHmac('sha256',secret).update(payload).digest('hex');
}
export async function signReceipt(receipt,secret,keyId='local-key'){
  assert(clean(secret),'A signing secret is required.');const unsigned=clone(receipt);delete unsigned.signature;
  return{...unsigned,signature:{algorithm:'HMAC-SHA256',keyId,digest:await hmacHex(secret,canonicalJson(unsigned))}};
}
export async function verifyReceipt(receipt,secret){
  if(!receipt?.signature?.digest||receipt.signature.algorithm!=='HMAC-SHA256')return false;
  const unsigned=clone(receipt),expected=unsigned.signature.digest;delete unsigned.signature;
  return await hmacHex(secret,canonicalJson(unsigned))===expected;
}
