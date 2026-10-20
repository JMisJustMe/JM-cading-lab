// Fixed recipient adapter on the existing Estate host. No admin token, arbitrary
// URL, customer/payment route, or private Library content enters this relay.
const CLOUD='https://jm-cloud-contact-server-v05.onrender.com';
const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const reply=(status,error)=>new Response(JSON.stringify({ok:false,error}),{status,headers:HEADERS});
export async function onRequest({request}){
  const url=new URL(request.url),route=url.searchParams.get('route')||'';
  const read=request.method==='GET',write=request.method==='POST';
  const allowed=(read&&['/ready','/receipt-key','/mesh/v1/meta','/mesh/v1/dashboard'].includes(route))||
    (write&&['/mesh/v1/auth/register','/mesh/v1/workspaces','/mesh/v1/verify'].includes(route))||
    (read&&/^\/mesh\/v1\/workspaces\/ws_[A-Za-z0-9_-]{8,64}$/.test(route))||
    (write&&/^\/mesh\/v1\/workspaces\/ws_[A-Za-z0-9_-]{8,64}\/save$/.test(route));
  if(!allowed)return reply(400,'ROUTE_NOT_ALLOWED');
  // Browser writes must originate at this Estate door. Nonbrowser bearer clients
  // remain usable; no cookies or ambient owner credentials are forwarded.
  const origin=request.headers.get('origin');
  if(write&&origin&&origin!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
  const auth=request.headers.get('authorization')||'';
  const publicRoute=['/ready','/receipt-key','/mesh/v1/meta','/mesh/v1/auth/register'].includes(route);
  if(!publicRoute&&!/^Bearer [A-Za-z0-9_.-]{20,2048}$/.test(auth))return reply(401,'SCOPED_CREDENTIAL_REQUIRED');
  let body;
  if(write){
    if(!request.headers.get('content-type')?.includes('application/json'))return reply(415,'JSON_REQUIRED');
    body=await request.text();
    if(new TextEncoder().encode(body).length>32768)return reply(413,'CONTACT_TOO_LARGE');
    try{JSON.parse(body)}catch{return reply(400,'INVALID_JSON')}
  }
  let timer;
  try{
    // Use explicit manual redirect rejection and a portable timer. Pages can run
    // with an older compatibility date than the laptop's Web Fetch runtime.
    const upstream=await Promise.race([fetch(CLOUD+route,{method:request.method,redirect:'manual',
      headers:{accept:'application/json',...(write?{'content-type':'application/json'}:{}),...(!publicRoute?{authorization:auth}:{})},
      body}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('TARGET_TIMEOUT')),20000)})]);
    if(upstream.status>=300&&upstream.status<400)return reply(502,'TARGET_REDIRECT_BLOCKED');
    if(!upstream.headers.get('content-type')?.includes('application/json'))return reply(502,'TARGET_NOT_JSON');
    return new Response(await upstream.text(),{status:upstream.status,headers:HEADERS});
  }catch(e){
    // No payload, credential, response body or stack is recorded.
    console.error('JM_CONTACT_TARGET_HOLD',String(e?.name||'Error'),String(e?.message||'').replace(auth,'[redacted]').slice(0,180));
    return reply(502,e?.message==='TARGET_TIMEOUT'?'TARGET_TIMEOUT':'TARGET_UNAVAILABLE');
  }finally{clearTimeout(timer)}
}
