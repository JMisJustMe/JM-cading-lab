const APP_VERSION = "0.1.0-live.1";
const WIDGET_URI = "ui://jm3232-navigator/stringdoor-v0.1.html";
const SUPPORTED_PROTOCOLS = new Set(["2025-06-18", "2025-03-26"]);
const DEFAULT_PROTOCOL = "2025-06-18";
const STATE_KEY = "runtime_state";
const encoder = new TextEncoder();

const TOOL_ALIASES = {
  "navigator.search_estate": "search",
  "navigator.fetch_source": "fetch",
  "navigator.open_stringdoor": "navigator_open_stringdoor",
  "navigator.resolve_rootword": "navigator_resolve_rootword",
  "navigator.return_lineage": "navigator_return_lineage",
  "navigator.create_stringmark": "navigator_create_stringmark",
  "navigator.register_body": "navigator_register_body",
  "navigator.create_stringreceipt": "navigator_create_stringreceipt",
  "navigator.export_savepack": "navigator_export_savepack",
  "navigator.bridge_status": "navigator_bridge_status",
};

const toolMeta = (widget = false) => ({
  "openai/toolInvocation/invoking": "Routing through JM3232 Navigator…",
  "openai/toolInvocation/invoked": "Stringreceipt returned",
  ...(widget ? { "ui.resourceUri": WIDGET_URI, "openai/outputTemplate": WIDGET_URI } : {}),
});

const ro = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const rw = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };

const TOOLS = [
  { name:"search", title:"Search the JM Estate", description:"Use this when the user wants to find JM Estate bodies, Navigator routes, Radius Lexicon terms, receipts, public doors, or source records. Returns stable IDs for fetch.", inputSchema:{type:"object",properties:{query:{type:"string",minLength:1},limit:{type:"integer",minimum:1,maximum:25,default:8},sources:{type:"array",items:{type:"string"}}},required:["query"],additionalProperties:false}, annotations:ro, _meta:toolMeta(true) },
  { name:"fetch", title:"Fetch an Estate source", description:"Use this when a prior search returned a stable ID and the user needs the full source record, route, relationships, flags, and preserved metadata.", inputSchema:{type:"object",properties:{id:{type:"string",minLength:1}},required:["id"],additionalProperties:false}, annotations:ro, _meta:toolMeta(true) },
  { name:"navigator_open_stringdoor", title:"Open a Stringdoor", description:"Resolve a JM body or route into a user-approved external navigation plan. Navigator governs identity and receipt; the host browser performs navigation.", inputSchema:{type:"object",properties:{target:{type:"string",minLength:1},create_receipt:{type:"boolean",default:true}},required:["target"],additionalProperties:false}, annotations:{...rw,openWorldHint:false}, _meta:toolMeta(true) },
  { name:"navigator_resolve_rootword", title:"Resolve a RootWord", description:"Return Radius Lexicon meaning, good stretches, misuse edges, source boundaries, Visualang route, and wordplay face for a JM term.", inputSchema:{type:"object",properties:{term:{type:"string",minLength:1}},required:["term"],additionalProperties:false}, annotations:ro, _meta:toolMeta(true) },
  { name:"navigator_return_lineage", title:"Return source lineage", description:"Return preserved source, authority, lineage, connections, and claim boundary for a known Estate or Radius record.", inputSchema:{type:"object",properties:{id:{type:"string",minLength:1}},required:["id"],additionalProperties:false}, annotations:ro, _meta:toolMeta(false) },
  { name:"navigator_create_stringmark", title:"Create a Stringmark", description:"Bookmark or mark a resolved Estate body or Stringdoor inside the Navigator bridge.", inputSchema:{type:"object",properties:{target_id:{type:"string",minLength:1},label:{type:"string",default:""},note:{type:"string",default:""}},required:["target_id"],additionalProperties:false}, annotations:{...rw,idempotentHint:true}, _meta:toolMeta(true) },
  { name:"navigator_register_body", title:"Register a sovereign body", description:"Register a new or external body with identity, route, source, lineage, capabilities, and claim boundary. Registration is not proof.", inputSchema:{type:"object",properties:{body:{type:"object",properties:{id:{type:"string"},name:{type:"string",minLength:1},version:{type:"string"},kind:{type:"string"},route:{type:"string"},source:{type:"string"},lineage:{type:"array",items:{}},capabilities:{type:"array",items:{type:"string"}},claim_boundary:{type:"string"}},required:["name"],additionalProperties:false}},required:["body"],additionalProperties:false}, annotations:rw, _meta:toolMeta(false) },
  { name:"navigator_create_stringreceipt", title:"Create a Stringreceipt", description:"Append an action, result, and evidence to Navigator's durable hash-chained receipt log.", inputSchema:{type:"object",properties:{action:{type:"string",minLength:1},target_id:{type:"string",minLength:1},outcome:{type:"string",minLength:1},evidence:{type:"object",default:{}}},required:["action","target_id","outcome"],additionalProperties:false}, annotations:rw, _meta:toolMeta(false) },
  { name:"navigator_export_savepack", title:"Export a Navigator SavePack", description:"Preserve current Stringmarks, registered bodies, and receipts as a portable JSON SavePack.", inputSchema:{type:"object",properties:{name:{type:"string",default:"JM3232_NAVIGATOR_SAVEPACK"},include_receipts:{type:"boolean",default:true}},additionalProperties:false}, annotations:rw, _meta:toolMeta(false) },
  { name:"navigator_bridge_status", title:"Inspect bridge status", description:"Inspect mounted source bodies, runtime counts, receipt-chain state, and live deployment/contact boundary.", inputSchema:{type:"object",properties:{},additionalProperties:false}, annotations:ro, _meta:toolMeta(false) },
];

function json(data, status=200, extra={}) {
  return new Response(JSON.stringify(data), { status, headers:{"content-type":"application/json; charset=utf-8","access-control-allow-origin":"*","access-control-expose-headers":"Mcp-Session-Id",...extra} });
}
function rpcResult(id,result){ return {jsonrpc:"2.0",id,result}; }
function rpcError(id,code,message,data){ return {jsonrpc:"2.0",id,error:{code,message,...(data===undefined?{}:{data})}}; }
function utcNow(){ return new Date().toISOString(); }
function cleanName(v){ return String(v||"").replace(/[^A-Za-z0-9._-]+/g,"_").replace(/^[._]+|[._]+$/g,"") || "JM3232_NAVIGATOR_SAVEPACK"; }
function canonicalize(value){ if(Array.isArray(value)) return value.map(canonicalize); if(value && typeof value==="object") return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonicalize(value[k])])); return value; }
function canonicalJson(value){ return JSON.stringify(canonicalize(value)); }
async function sha256Text(value){ const b=await crypto.subtle.digest("SHA-256",encoder.encode(value)); return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join(""); }
function defaultState(){ const now=utcNow(); return {schema:"jm.navigator.bridge.state/v0.1-live",created_at:now,updated_at:now,stringmarks:[],registered_bodies:[],receipts:[],receipt_chain_head:"GENESIS"}; }
async function loadState(env){ const value=await env.NAV_RUNTIME.get(STATE_KEY,"json"); return value || defaultState(); }
async function saveState(env,state){ state.updated_at=utcNow(); await env.NAV_RUNTIME.put(STATE_KEY,JSON.stringify(state)); }
async function assetJson(env,request,path){ const u=new URL(path,request.url); const r=await env.ASSETS.fetch(new Request(u)); if(!r.ok) throw new Error(`asset ${path} returned ${r.status}`); return r.json(); }
async function assetText(env,request,path){ const u=new URL(path,request.url); const r=await env.ASSETS.fetch(new Request(u)); if(!r.ok) throw new Error(`asset ${path} returned ${r.status}`); return r.text(); }
function tokenize(text){ return String(text||"").toLowerCase().match(/[\p{L}\p{N}_’'\-]+/gu)||[]; }
function score(query,doc){ const q=String(query).trim().toLowerCase(); if(!q)return 0; const title=String(doc.title||"").toLowerCase(), text=String(doc.text||"").toLowerCase(), aliases=(doc.aliases||[]).join(" ").toLowerCase(), searchable=String(doc.searchable||"").toLowerCase(); let s=0; if(q===title)s+=100; if(title.includes(q))s+=45; if(aliases.includes(q))s+=30; if(text.includes(q))s+=15; const tokens=tokenize(q), tt=new Set(tokenize(title)), at=new Set(tokenize(aliases)), st=new Set(tokenize(searchable)); for(const t of tokens){ if(tt.has(t))s+=12; else if(at.has(t))s+=9; else if(st.has(t))s+=3; else if(t.length>=4 && [...tt].some(w=>w.startsWith(t)))s+=4; } const covered=tokens.filter(t=>st.has(t)).length/Math.max(1,tokens.length); s+=covered*20; if(doc.url)s+=0.5; if(["navigator_body","estate_bodies","public_bodies"].includes(doc.source_kind))s+=0.25; return s; }
async function index(env,request){ return assetJson(env,request,"/data/search_index.json"); }
async function sourceManifest(env,request){ return assetJson(env,request,"/data/SOURCE_MANIFEST.json"); }
async function buildMeta(env,request){ return assetJson(env,request,"/data/build_meta.json"); }
async function byId(env,request,id){ const docs=await index(env,request); let doc=docs.find(x=>x.id===id); if(!doc){ const c=docs.filter(x=>String(x.id).split("~",1)[0]===id); if(c.length===1)doc=c[0]; } if(!doc)throw new Error(`No Estate/Stringline body found for id: ${id}`); return doc; }
async function search(env,request,args){ const query=String(args.query||""); if(!query.trim())throw new Error("query must not be blank"); const limit=Math.min(Math.max(Number(args.limit||8),1),25), allowed=new Set(args.sources||[]), docs=await index(env,request); const ranked=[]; for(const doc of docs){ if(allowed.size && !allowed.has(doc.source_kind))continue; const s=score(query,doc); if(s>0)ranked.push([s,doc]); } ranked.sort((a,b)=>b[0]-a[0]||String(a[1].title||"").localeCompare(String(b[1].title||""))); const results=ranked.slice(0,limit).map(([s,d])=>({id:d.id,title:d.title,text:String(d.text||"").slice(0,900),url:d.url||"",source_kind:d.source_kind,source_file:d.source_file,score:Math.round(s*1000)/1000,flags:d.flags||[],relationships:(d.relationships||[]).slice(0,12)})); return {query,count:results.length,results,route:"QUERY → MEANING-FIRST SCORE → STRINGDOOR CANDIDATES",boundary:"Search ranks restored Estate and Radius sources; it does not silently merge source bodies."}; }
async function fetchRecord(env,request,id){ const d=await byId(env,request,id); return {id:d.id,title:d.title,text:d.text,url:d.url||"",metadata:{source_kind:d.source_kind,source_file:d.source_file,aliases:d.aliases||[],relationships:d.relationships||[],tags:d.tags||[],flags:d.flags||[]},record:structuredClone(d.record||{})}; }
async function resolve(env,request,target){ try{return await fetchRecord(env,request,target);}catch{} const found=await search(env,request,{query:target,limit:1}); if(!found.results.length)throw new Error(`No Stringdoor candidate found for: ${target}`); return fetchRecord(env,request,found.results[0].id); }
function validExternalUrl(value){ try{const u=new URL(value); return ["http:","https:"].includes(u.protocol)&&!!u.host;}catch{return false;} }
async function appendReceipt(env,action,targetId,outcome,evidence={}){ const state=await loadState(env); const receipt={id:`STRINGRECEIPT-${String(state.receipts.length+1).padStart(6,"0")}`,time:utcNow(),action,target_id:targetId,outcome,evidence:evidence||{},previous_hash:state.receipt_chain_head||"GENESIS"}; receipt.hash=await sha256Text(canonicalJson(receipt)); state.receipts.push(receipt); state.receipt_chain_head=receipt.hash; await saveState(env,state); return receipt; }
async function validateChain(env){ const state=await loadState(env); let previous="GENESIS"; const failures=[]; for(let i=0;i<state.receipts.length;i++){const r=state.receipts[i], supplied=r.hash, payload={...r}; delete payload.hash; const expected=await sha256Text(canonicalJson(payload)); if(r.previous_hash!==previous||supplied!==expected)failures.push({index:i,id:r.id}); previous=supplied;} return {pass:failures.length===0,receipts:state.receipts.length,failures,head:previous}; }
function asToolResult(structured,narration,widget=true){ return {structuredContent:structured,content:[{type:"text",text:narration}],...(widget?{_meta:{"ui.resourceUri":WIDGET_URI,"openai/outputTemplate":WIDGET_URI}}:{})}; }

async function invokeTool(name,args,env,request){
  if(name==="search"){ const v=await search(env,request,args); return asToolResult(v,`Found ${v.count} Stringdoor candidates for “${v.query}”.`); }
  if(name==="fetch"){ const v=await fetchRecord(env,request,args.id); return asToolResult(v,`Fetched ${v.title} from ${v.metadata.source_file}.`); }
  if(name==="navigator_open_stringdoor"){ const r=await resolve(env,request,args.target), url=r.url||"", openable=validExternalUrl(url), u=openable?new URL(url):null; const v={target:r.id,title:r.title,url,openable,host:u?.host||"",operation:openable?"OPEN_EXTERNAL":"RETURN_SOURCE_ROUTE",boundary:"The Navigator governs identity and receipt; ChatGPT/OpenAI browser or the device browser performs external navigation after user-approved access."}; if(args.create_receipt!==false)v.stringreceipt=await appendReceipt(env,"OPEN_STRINGDOOR_PLAN",r.id,openable?"READY":"NO_EXTERNAL_URL",{url,source_file:r.metadata.source_file}); return asToolResult(v,`Stringdoor resolved for ${v.title}; navigation remains user/host approved.`); }
  if(name==="navigator_resolve_rootword"){ const result=await search(env,request,{query:args.term,limit:6,sources:["radius_lexicon"]}); if(!result.results.length)throw new Error(`RootWord/Radius entry not found: ${args.term}`); const top=await fetchRecord(env,request,result.results[0].id), rec=top.record||{}; const v={term:args.term,entry:top,meaning_radius:rec.meaning_radius||{},root_action:rec.root_action||"",use_law:rec.use_law||"",visual_face:rec.visual_face||{},wordplay_face:rec.wordplay_face||{},claim_boundary:rec.claim||{},alternatives:result.results.slice(1)}; return asToolResult(v,`Resolved the Radius entry for ${top.title}.`); }
  if(name==="navigator_return_lineage"){ const item=await fetchRecord(env,request,args.id), rec=item.record||{}; const v={id:item.id,title:item.title,source:rec.source||item.metadata.source_file,source_file:item.metadata.source_file,preserved:rec.preserved||"",lineage:rec.lineage||[],connections:rec.connections||item.metadata.relationships||[],authority:rec.authority||{},boundary:typeof rec.claim==="object"?(rec.claim?.boundary||""):""}; return asToolResult(v,`Returned preserved lineage for ${v.title}.`,false); }
  if(name==="navigator_create_stringmark"){ const item=await resolve(env,request,args.target_id), state=await loadState(env); let mark=state.stringmarks.find(m=>m.target_id===item.id), outcome; if(mark){mark.label=args.label||mark.label||item.title;mark.note=args.note||"";mark.updated_at=utcNow();outcome="UPDATED";}else{mark={id:`STRINGMARK-${String(state.stringmarks.length+1).padStart(5,"0")}`,target_id:item.id,title:item.title,url:item.url||"",label:args.label||item.title,note:args.note||"",created_at:utcNow(),updated_at:utcNow()};state.stringmarks.push(mark);outcome="CREATED";} await saveState(env,state); const receipt=await appendReceipt(env,"CREATE_STRINGMARK",item.id,outcome,{stringmark_id:mark.id}); return asToolResult({stringmark:mark,stringreceipt:receipt},`Stringmark ${mark.id} preserved.`); }
  if(name==="navigator_register_body"){ const body=args.body||{}, nm=String(body.name||"").trim(); if(!nm)throw new Error("body.name is required"); const state=await loadState(env); const id=String(body.id||`LOCAL-BODY-${(await sha256Text(nm+utcNow())).slice(0,10).toUpperCase()}`); if(state.registered_bodies.some(x=>x.id===id))throw new Error(`registered body id already exists: ${id}`); const registered={id,name:nm,version:String(body.version||"unversioned"),kind:String(body.kind||"sovereign body"),route:String(body.route||""),source:String(body.source||"owner-provided"),lineage:body.lineage||[],capabilities:body.capabilities||[],claim_boundary:String(body.claim_boundary||"Named and registered; not independently proven by registration alone."),registered_at:utcNow()}; state.registered_bodies.push(registered); await saveState(env,state); const receipt=await appendReceipt(env,"REGISTER_BODY",id,"REGISTERED_NOT_PROVEN",{name:nm}); return asToolResult({body:registered,stringreceipt:receipt},`Registered ${nm} without claiming proof.`,false); }
  if(name==="navigator_create_stringreceipt"){ const v=await appendReceipt(env,args.action,args.target_id,args.outcome,args.evidence||{}); return asToolResult(v,`Stringreceipt ${v.id} appended to the hash chain.`,false); }
  if(name==="navigator_export_savepack"){ const clean=cleanName(args.name), state=await loadState(env), manifest=await sourceManifest(env,request), meta=await buildMeta(env,request); const payload={schema:"jm.navigator.savepack/v0.1-live",created_at:utcNow(),source_bridge:"JM3232 Navigator Browser Bridge v0.1",source_authority:meta,stringmarks:state.stringmarks,registered_bodies:state.registered_bodies,receipts:args.include_receipts===false?[]:state.receipts,receipt_chain_head:state.receipt_chain_head,source_manifest_hash:await sha256Text(canonicalJson(manifest)),boundary:"SavePack preserves governed pointers, registrations and receipts; it does not duplicate every full source body."}; payload.sha256=await sha256Text(canonicalJson(payload)); const exportKey=`export:${payload.sha256}`; await env.NAV_RUNTIME.put(exportKey,JSON.stringify(payload)); const receipt=await appendReceipt(env,"EXPORT_SAVEPACK",clean,"EXPORTED",{kv_key:exportKey,sha256:payload.sha256}); const base=new URL(request.url).origin; const v={path:`${base}/exports/${payload.sha256}.json`,relative_path:`exports/${payload.sha256}.json`,sha256:payload.sha256,stringreceipt:receipt}; return asToolResult(v,`SavePack exported with SHA-256 ${v.sha256}.`,false); }
  if(name==="navigator_bridge_status"){ const state=await loadState(env), manifest=await sourceManifest(env,request), meta=await buildMeta(env,request), chain=await validateChain(env); const v={name:"JM3232 Navigator Browser Bridge",version:"0.1-live.1",state:"LIVE_HTTPS_MCP_READY",source_body:meta,source_counts:manifest.counts,runtime:{stringmarks:state.stringmarks.length,registered_bodies:state.registered_bodies.length,receipts:state.receipts.length,receipt_chain_head:state.receipt_chain_head,receipt_chain_valid:chain.pass},tool_aliases:TOOL_ALIASES,boundary:"Canonical source authority is unchanged. This descendant provides HTTPS/MCP transport and durable KV runtime state; ChatGPT account approval and in-product contact are separate Dings."}; return asToolResult(v,`Bridge state: ${v.state}.`,false); }
  throw new Error(`Unknown tool: ${name}`);
}

async function handleMcp(request,env){
  const origin=request.headers.get("origin");
  const allowed=new Set(["https://chatgpt.com","https://chat.openai.com"]);
  if(origin && !allowed.has(origin) && !origin.includes("localhost") && !origin.includes("127.0.0.1")) return json(rpcError(null,-32001,"Origin rejected by JM PermissionGate."),403);
  let payload; try{payload=await request.json();}catch{return json(rpcError(null,-32700,"Parse error"),400);}
  if(!payload||payload.jsonrpc!=="2.0"||!payload.method)return json(rpcError(payload?.id??null,-32600,"Invalid Request"),400);
  if(payload.id===undefined||payload.id===null)return new Response(null,{status:202,headers:{"access-control-allow-origin":"*"}});
  const id=payload.id, method=payload.method, params=payload.params||{};
  try{
    if(method==="initialize"){ const requested=params.protocolVersion||DEFAULT_PROTOCOL, protocol=SUPPORTED_PROTOCOLS.has(requested)?requested:DEFAULT_PROTOCOL; return json(rpcResult(id,{protocolVersion:protocol,capabilities:{tools:{listChanged:false},resources:{subscribe:false,listChanged:false}},serverInfo:{name:"JM3232 Navigator Browser Bridge — Live Contact Descendant",version:APP_VERSION},instructions:"Search before fetch. Preserve source identity. Stringdoor governs navigation plans; Stringmark and Stringreceipt preserve trace; SavePack preserves portable custody. Registration is not proof."})); }
    if(method==="ping")return json(rpcResult(id,{}));
    if(method==="tools/list")return json(rpcResult(id,{tools:TOOLS}));
    if(method==="tools/call")return json(rpcResult(id,await invokeTool(params.name,params.arguments||{},env,request)));
    if(method==="resources/list")return json(rpcResult(id,{resources:[{uri:WIDGET_URI,name:"JM3232 Stringdoor v0.1",title:"JM3232 Navigator Stringdoor",description:"Compact Stringline-governed search, route, mark, lineage, and receipt field.",mimeType:"text/html;profile=mcp-app",_meta:{"ui.prefersBorder":false,"openai/widgetPrefersBorder":false,"ui.csp":{connectDomains:[],resourceDomains:[]},"openai/widgetDescription":"A compact interactive JM3232 Stringdoor field that searches Estate bodies, resolves RootWords, preserves marks, and returns traceable routes."}}]}));
    if(method==="resources/read"){ if(params.uri!==WIDGET_URI)return json(rpcError(id,-32004,`Unknown resource: ${params.uri}`),404); const html=await assetText(env,request,"/navigator-stringdoor-v0.1.html"); return json(rpcResult(id,{contents:[{uri:WIDGET_URI,mimeType:"text/html;profile=mcp-app",text:html,_meta:{"ui.prefersBorder":false,"ui.csp":{connectDomains:[],resourceDomains:[]},"openai/widgetDescription":"JM3232 Navigator Stringdoor field."}}]})); }
    return json(rpcError(id,-32601,`Method not found: ${method}`),404);
  }catch(e){ return json(rpcError(id,-32602,String(e?.message||e)),400); }
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(request.method==="OPTIONS" && url.pathname==="/mcp") return new Response(null,{status:204,headers:{"access-control-allow-origin":"*","access-control-allow-methods":"POST, GET, DELETE, OPTIONS","access-control-allow-headers":"content-type, mcp-session-id","access-control-expose-headers":"Mcp-Session-Id"}});
    if(url.pathname==="/mcp" && request.method==="POST") return handleMcp(request,env);
    if(url.pathname==="/mcp") return json(rpcError(null,-32000,"This bridge does not advertise a server-to-client SSE stream."),405);
    if(url.pathname==="/health"){ const chain=await validateChain(env); return json({ok:true,name:"JM3232 Navigator Browser Bridge",version:APP_VERSION,state:"LIVE_HTTPS_MCP_READY",durable_state:true,chain}); }
    if(url.pathname==="/bridge/search" && request.method==="GET") return json(await search(env,request,{query:url.searchParams.get("q")||"",limit:Number(url.searchParams.get("limit")||8)}));
    if(url.pathname.startsWith("/bridge/fetch/") && request.method==="GET") return json(await fetchRecord(env,request,decodeURIComponent(url.pathname.slice(14))));
    if(url.pathname.startsWith("/bridge/tool/") && request.method==="POST"){ try{return json(await invokeTool(decodeURIComponent(url.pathname.slice(13)),await request.json(),env,request));}catch(e){return json({error:{message:String(e?.message||e)}},400);} }
    if(url.pathname.startsWith("/exports/") && url.pathname.endsWith(".json")){ const hash=url.pathname.slice(9,-5), value=await env.NAV_RUNTIME.get(`export:${hash}`); return value?new Response(value,{headers:{"content-type":"application/json; charset=utf-8"}}):new Response("Not Found",{status:404}); }
    return env.ASSETS.fetch(request);
  }
};
