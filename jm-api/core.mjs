/**
 * JM API v1.1 — sovereign public-safe API contact layer.
 * A route is not an owner; a service listing is not a health assertion.
 * Only a fixed existing public readiness endpoint is contacted on request.
 * All private/authenticated methods stay with the original services.
 */
export const JM_API_BASE = '/api/jm/v1';
export const JM_API_SCHEMA = 'JM.API/1.1';
const OWNER = 'JMisJustMe/JM-cading-lab';
const CLOUD_READY = 'https://jm-cloud-contact-server-v05.onrender.com/ready';

const SERVICES = Object.freeze([
  {
    id:'build-mesh', name:'JM ECOSTATE Build Mesh', protocol:'MCP',
    endpoint:'https://jm-ecostate-build-mesh-mcp.onrender.com/mcp', access:'PUBLIC_SAFE_MCP',
    role:'discovery-provenance-capability-routing', source:'CONNECTED_MCP_TOOL',
    capabilities:['search_builds','recover_build','proof_state','build_capability_mesh'],
    boundary:'Authority read only; source contact and live invocation remain independent.'
  },
  {
    id:'workshop', name:'JM MCP Workshop', protocol:'MCP',
    endpoint:'https://jm-mcp-workshop.onrender.com/mcp', access:'WORKSHOP_CONTROLLED',
    role:'create-and-test-mcp-tools', source:'CONNECTED_MCP_TOOL',
    capabilities:['workshop_define','workshop_compose','workshop_test','workshop_publish'],
    boundary:'Recipe validation, packages and fixture tests do not deploy a service.'
  },
  {
    id:'live-experience', name:'JM Live Experience CP07', protocol:'MCP',
    endpoint:'https://jm-live-experience-intake-mcp.onrender.com/mcp', access:'ADMISSION_GOVERNED',
    role:'governed-game-admission', source:'CONNECTED_MCP_TOOL',
    capabilities:['governed-admission'],
    boundary:'Gameplay admission requires its own source and owner authorization.'
  },
  {
    id:'navigator-public', name:'JM3232 Navigator public-safe MCP', protocol:'MCP',
    endpoint:'https://navigator-plugin-public.jm-inline-contact-probe.pages.dev/mcp',
    access:'PUBLIC_READ_ONLY', role:'public-search-lineage-contact', source:'EXISTING_ESTATE_PUBLIC_INTEGRATION',
    capabilities:['public-search','public-lineage','public-bridge-status'],
    boundary:'Public descendant only; not owner/live Navigator, raw private source, or owner-write authority.'
  },
  {
    id:'unique-bodies-cp08', name:'JM Unique Bodies CP08', protocol:'MCP',
    endpoint:'https://jm-unique-bodies-cp08-contact.onrender.com/mcp',
    access:'OWNER_BEARER_REQUIRED', role:'owner-authorized-atomic-body-contact', source:'EXISTING_MCP_FEDERATION_REGISTER',
    capabilities:['owner-authorized-atomic-contact','atlas-history'],
    boundary:'No anonymous tools or proxy. Owner bearer admission, remote write and durable Atlas proof remain separate.'
  },
  {
    id:'app-commons-cp06', name:'JM APP//COMMONS CP06', protocol:'MCP',
    endpoint:'https://jm-app-commons-cp06-mcp.onrender.com/mcp',
    access:'OWNER_BEARER_REQUIRED', role:'protected-source-inspection-comparison-and-capsules', source:'EXISTING_MCP_FEDERATION_REGISTER',
    capabilities:['owner-authorized-source-inspection','comparison','capsules'],
    boundary:'Original independently hosted MCP. No source disclosure or credential forwarding through JM API.'
  },
  {
    id:'federation-receipt-cp02', name:'JM Federation Receipt CP02', protocol:'MCP',
    endpoint:'https://jm-federation-receipt-cp02-mcp.onrender.com/mcp',
    access:'OWNER_BEARER_REQUIRED', role:'owner-authorized-federation-receipt-issuance', source:'EXISTING_MCP_FEDERATION_REGISTER',
    capabilities:['owner-authorized-receipt-issuance'],
    boundary:'Issuance and signing remain with original owner-controlled host; JM API can only route a plan.'
  },
  {
    id:'cloud-contact', name:'JM Cloud Contact Server', protocol:'REST',
    endpoint:'/api/estate-contact', access:'SCOPED_BEARER',
    role:'existing-cloud-workspaces-and-verified-receipts', source:'RECOVERED_GITHUB_SOURCE',
    capabilities:['workspace','receipt-verification'],
    boundary:'Credentials, workspaces and signatures belong to Cloud Contact. This API never proxies private operations.'
  },
  {
    id:'owner-vault', name:'JM Owner Vault', protocol:'REST',
    endpoint:'/api/owner/vault', access:'OWNER_SESSION_KEY',
    role:'private-html-state-and-version-custody', source:'RECOVERED_GITHUB_SOURCE',
    capabilities:['owner-status','private-body-versioning','snapshot'],
    boundary:'R2 and X-JM-Owner-Key remain behind original owner-gated API. No credentials or bytes cross this entrance.'
  },
  {
    id:'ailatheo', name:'JM AILatheo Creator API', protocol:'REST',
    endpoint:'/api/ailatheo', access:'CUSTOMER_SCOPED',
    role:'creator-entitlement-and-billing', source:'RECOVERED_GITHUB_SOURCE',
    capabilities:['entitlement-status','scoped-account','verified-billing-webhook'],
    boundary:'Payment/entitlement source has separate authority; no checkout, account or billing action is proxied.'
  },
  {
    id:'phone-commander', name:'JM Phone Commander', protocol:'LOCAL_HTTP',
    endpoint:null, access:'OWNER_DEVICE_LOOPBACK_ONLY',
    role:'Termux-device-host-adapter', source:'RECOVERED_GITHUB_SOURCE',
    capabilities:['status','route','read-file','edit-file'],
    boundary:'Binds 127.0.0.1 on the owner phone only. Port, token, state and execution are never exposed by the web API.'
  }
].map(s=>Object.freeze({...s, observedNowByThisApi:false})));

const HISTORICAL = Object.freeze([
  { id:'jm-studios-api', title:'JM Studios API', firstReported:'2026-06-07', state:'HISTORICAL_REPORTED_CURRENT_SOURCE_UNVERIFIED', publicRoute:null },
  { id:'shims-reading-backend', title:'SHIMS Reading Backend', firstReported:'2026-07-27', state:'HISTORICAL_REPORTED_CURRENT_SOURCE_UNVERIFIED', publicRoute:null },
  { id:'sovereign-agent-gateway', title:'JM Sovereign Agent Gateway', firstReported:'2026-10', state:'HISTORICAL_REPORTED_CURRENT_SOURCE_UNVERIFIED', publicRoute:null }
].map(s=>Object.freeze(s)));

const ROUTES = Object.freeze({
  discover:{service:'build-mesh',tool:'search_builds',scope:'public-discovery',gate:'Resolve the present authoritative head; search is not recipient proof.'},
  recover:{service:'build-mesh',tool:'recover_build',scope:'source-recovery',gate:'Verify original source/role, current authority and independent recovery.'},
  compose:{service:'workshop',tool:'workshop_compose',scope:'recipe-construction',gate:'Validate recipe and compare candidate against ancestor; then independently test.'},
  test:{service:'workshop',tool:'workshop_test',scope:'fixture-only',gate:'A fixture test is not real-host or owner-device execution.'},
  admit:{service:'live-experience',tool:null,scope:'admission-governed',gate:'Consult service admission rules, owner and game-specific proof.'},
  navigate:{service:'navigator-public',tool:'public_search',scope:'public-navigation',gate:'Use read-only Navigator tools; owner/live content and authenticated source remain separate.'},
  uniqueBodies:{service:'unique-bodies-cp08',tool:null,scope:'owner-authenticated',gate:'Obtain authorised bearer admission through the original CP08 client; no tokens through JM API.'},
  commons:{service:'app-commons-cp06',tool:null,scope:'owner-authenticated',gate:'Use original APP//COMMONS protected client for inspection and capsules; no private payload through public router.'},
  receipt:{service:'federation-receipt-cp02',tool:null,scope:'owner-authenticated',gate:'Use the original receipt signer with separately verified credentials and provenance; JM API issues nothing.'},
  workspace:{service:'cloud-contact',tool:null,scope:'scoped-private',gate:'Use original bearer auth and independently check signed receipt and persisted state.'},
  vault:{service:'owner-vault',tool:null,scope:'owner-private',gate:'Use original owner session key; no copied credentials, bytes or authorities.'},
  entitlement:{service:'ailatheo',tool:null,scope:'customer-auth',gate:'Billing and identity checks stay on the original AILatheo API.'},
  phone:{service:'phone-commander',tool:null,scope:'device-local',gate:'Use original owner-authorised localhost/Termux path. Never publish a device listener.'}
});

const HEADERS = Object.freeze({
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store, max-age=0',
  'x-content-type-options':'nosniff',
  'referrer-policy':'no-referrer',
  'x-jm-api-schema': JM_API_SCHEMA
});
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...HEADERS,...extra}});
const fail=(status,reason,extra={})=>json({ok:false,schema:JM_API_SCHEMA,error:reason},status,extra);
const publicLinks = Object.freeze({
  health:JM_API_BASE+'/health',meta:JM_API_BASE+'/meta',
  services:JM_API_BASE+'/services',capabilities:JM_API_BASE+'/capabilities',
  lineage:JM_API_BASE+'/lineage',plan:JM_API_BASE+'/plan',
  contact:JM_API_BASE+'/contact/cloud-contact/ready',openapi:JM_API_BASE+'/openapi.json'
});

export function jmOpenApi(origin='https://jmisjustme-estate.pages.dev') {
  const response={'200':{description:'JSON reply',content:{'application/json':{schema:{type:'object'}}}}};
  const get=(summary)=>({get:{summary,responses:response}});
  const paths={};
  for(const [name,route] of Object.entries(publicLinks))if(name!=='plan')paths[route]=get(name==='contact'?'Fixed public Cloud Contact readiness check (no credentials)':'JM '+name);
  paths[JM_API_BASE]=get('JM API entrance');
  paths[publicLinks.plan]={post:{summary:'Return non-executing plan for a JM service',requestBody:{required:true,content:{'application/json':{schema:{
    type:'object',additionalProperties:false,required:['operation'],properties:{
      operation:{type:'string',enum:Object.keys(ROUTES)},subject:{type:'string',maxLength:160}
    }
  }}}},responses:{...response,'400':{description:'Invalid JSON'},'413':{description:'Body too large'},'415':{description:'JSON required'},'422':{description:'Invalid operation'}}}};
  return {openapi:'3.1.0',info:{title:'JM ECOSTATE API — sovereign contact entrance',version:'1.1.0',
    description:'Public-safe discovery, provenance-separated routing and one fixed public readiness check. No private proxy, admin token or remote command execution.'},
    servers:[{url:origin}],paths,'x-jm-authority':{sourceRepo:OWNER,
      upstreamMutation:false,privateCredentialForwarding:false,
      fixedPublicProbeOnly:true, originalBodiesIndependent:true,realDeviceProof:false}};
}

function availableOperations() {return Object.entries(ROUTES).map(([operation,route])=>({operation,
  service:route.service,scope:route.scope,tool:route.tool,action:'PLAN_ONLY'}));}

/** Upstream fetch is injectable to test the real fixed-network boundary. */
export async function handleJMApi(request, {fetchImpl=fetch}={}) {
  let url;
  try{url=new URL(request.url)}catch{return fail(400,'INVALID_URL')}
  const p=url.pathname.replace(/\/$/,'')||'/';
  if(p!==JM_API_BASE&&!p.startsWith(JM_API_BASE+'/'))return fail(404,'JM_ROUTE_NOT_FOUND');
  if(request.method==='GET'){
    if(p===JM_API_BASE)return json({ok:true,schema:JM_API_SCHEMA,name:'JM API',version:'1.1.0',
      mode:'PUBLIC_SAFE_CONTACT_AND_PLAN',description:'One entrance; separate original service authority.',links:publicLinks});
    if(p===publicLinks.health)return json({ok:true,schema:JM_API_SCHEMA,state:'HANDLER_RESPONDING',upstreams:'NOT_CHECKED',
      boundary:'This is the API process health, not a remote or device proof.'});
    if(p===publicLinks.meta)return json({ok:true,schema:JM_API_SCHEMA,owner:'JM',sourceRepo:OWNER,
      version:'1.1.0',relationship:'CONTACT_NOT_MERGE',privateProxy:false,upstreamMutation:false,
      credentialForwarding:false,physicalDeviceVerified:false,proofRule:'NO_DING_NO_CLAIM'});
    if(p===publicLinks.services)return json({ok:true,schema:JM_API_SCHEMA,services:SERVICES,
      note:'Source and route evidence only. None of these entries is a live health check.'});
    if(p===publicLinks.lineage)return json({ok:true,schema:JM_API_SCHEMA,historical:HISTORICAL,
      note:'Reported antecedents are not claimed as currently deployed, connected or identical to the present API.'});
    if(p===publicLinks.capabilities)return json({ok:true,schema:JM_API_SCHEMA,operations:availableOperations()});
    if(p===publicLinks.openapi)return json(jmOpenApi(url.origin));
    if(p===publicLinks.contact){
      // Explicitly disallow caller-controlled URLs, redirects, auth headers, cookies,
      // request bodies and arbitrary service IDs. The response exposes only a status.
      let res;
      try{
        res=await fetchImpl(CLOUD_READY,{method:'GET',redirect:'manual',headers:{accept:'application/json'},signal:AbortSignal.timeout(8000)});
      }catch{return json({ok:false,schema:'JM.API.Contact/1',service:'cloud-contact',
        state:'CONTACT_UNAVAILABLE',credentialsForwarded:false,authority:'REMOTE_READINESS_ONLY'},502)}
      const good=res.status>=200&&res.status<300;
      const state=res.status>=300&&res.status<400?'REDIRECT_REJECTED':good?'READY_HTTP_RESPONSE':'UPSTREAM_HTTP_HOLD';
      return json({ok:good,schema:'JM.API.Contact/1',service:'cloud-contact',state,
        upstreamHttpStatus:res.status,credentialsForwarded:false,authority:'REMOTE_READINESS_ONLY',
        boundary:'Does not prove authenticated workspace writes, receipt signatures, durability or owner-device execution.'},good?200:502);
    }
    return fail(404,'JM_ROUTE_NOT_FOUND');
  }
  if(request.method==='POST'){
    if(p!==publicLinks.plan)return fail(403,'MUTATION_OR_PROXY_NOT_AUTHORIZED');
    if(!/^application\/json(?:\s*;|\s*$)/i.test(request.headers.get('content-type')||''))return fail(415,'JSON_CONTENT_TYPE_REQUIRED');
    if(Number(request.headers.get('content-length'))>2048)return fail(413,'JM_PLAN_TOO_LARGE');
    let text;
    try{text=await request.text()}catch{return fail(400,'INVALID_BODY')}
    if(new TextEncoder().encode(text).length>2048)return fail(413,'JM_PLAN_TOO_LARGE');
    let body;
    try{body=JSON.parse(text)}catch{return fail(400,'INVALID_JSON')}
    if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['operation','subject'].includes(k)))return fail(422,'INVALID_PLAN_SCHEMA');
    if(typeof body.operation!=='string'||!Object.hasOwn(ROUTES,body.operation))return fail(422,'UNKNOWN_OPERATION');
    if(body.subject!=null&&(typeof body.subject!=='string'||body.subject.length>160))return fail(422,'INVALID_SUBJECT');
    const route=ROUTES[body.operation],service=SERVICES.find(s=>s.id===route.service);
    return json({ok:true,schema:'JM.API.RoutePlan/1.1',state:'PLAN_ONLY',
      request:{operation:body.operation,...(body.subject?{subject:body.subject}:{})},
      contact:{id:service.id,name:service.name,protocol:service.protocol,endpoint:service.endpoint,
        access:service.access,...(route.tool?{suggestedTool:route.tool}:{}),scope:route.scope},
      nextGate:route.gate,proof:{remoteToolExecuted:false,mutationPerformed:false,
        ownerCredentialForwarded:false,recipientProofTransferred:false}});
  }
  return fail(405,'METHOD_NOT_ALLOWED',{allow:'GET, POST'});
}
