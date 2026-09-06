const APP_VERSION = "0.2.0-estate-integration.1";
const SOURCE_MCP = "https://navigator-live-contact.jm-inline-contact-probe.pages.dev/mcp";
const INTEGRATION_REGISTRY = "https://jmisjustme-estate.pages.dev/navigator/estate-integration/public-registry.json";
const SUPPORTED_PROTOCOLS = new Set(["2025-06-18", "2025-03-26"]);
const DEFAULT_PROTOCOL = "2025-06-18";
const ALLOWED_TOOLS = new Set([
  "search",
  "fetch",
  "navigator_resolve_rootword",
  "navigator_return_lineage",
  "navigator_bridge_status",
]);
const OWNED_HOSTS = new Set(["jmisjustme.github.io", "jmisjustme-estate.pages.dev"]);

const OUTPUT_OBJECT = { type: "object", additionalProperties: true };
const ro = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const toolMeta = () => ({
  "openai/toolInvocation/invoking": "Reading through JM3232 Navigator…",
  "openai/toolInvocation/invoked": "Navigator route returned",
});

const TOOLS = [
  { name:"search", title:"Search the JM Estate", description:"Find JM Estate bodies, Navigator routes, Radius Lexicon terms, receipts, public doors, or source records. Returns stable IDs for fetch and does not change state.", inputSchema:{type:"object",properties:{query:{type:"string",minLength:1},limit:{type:"integer",minimum:1,maximum:25,default:8},sources:{type:"array",items:{type:"string"}}},required:["query"],additionalProperties:false}, outputSchema:OUTPUT_OBJECT, annotations:ro, _meta:toolMeta() },
  { name:"fetch", title:"Fetch an Estate source", description:"Retrieve one preserved Estate source record by stable ID, including its public-safe meaning, authority, route, relationships, flags, and source metadata. Does not change state.", inputSchema:{type:"object",properties:{id:{type:"string",minLength:1}},required:["id"],additionalProperties:false}, outputSchema:OUTPUT_OBJECT, annotations:ro, _meta:toolMeta() },
  { name:"navigator_resolve_rootword", title:"Resolve a RootWord", description:"Return public-safe Radius Lexicon meaning, good stretches, misuse edges, source boundaries, Visualang route, and wordplay face for a JM term without changing state.", inputSchema:{type:"object",properties:{term:{type:"string",minLength:1}},required:["term"],additionalProperties:false}, outputSchema:OUTPUT_OBJECT, annotations:ro, _meta:toolMeta() },
  { name:"navigator_return_lineage", title:"Return source lineage", description:"Return public-safe source authority, lineage locators, connections, and claim boundary for a known Estate or Radius record without changing state or reproducing raw source excerpts.", inputSchema:{type:"object",properties:{id:{type:"string",minLength:1}},required:["id"],additionalProperties:false}, outputSchema:OUTPUT_OBJECT, annotations:ro, _meta:toolMeta() },
  { name:"navigator_bridge_status", title:"Inspect bridge status", description:"Inspect public source counts and the live Estate integration boundary without exposing owner runtime state or changing Navigator state.", inputSchema:{type:"object",properties:{},additionalProperties:false}, outputSchema:OUTPUT_OBJECT, annotations:ro, _meta:toolMeta() },
];

function json(data,status=200,extra={}){
  return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","access-control-allow-origin":"*","access-control-expose-headers":"Mcp-Session-Id",...extra}});
}
function rpcResult(id,result){return {jsonrpc:"2.0",id,result};}
function rpcError(id,code,message,data){return {jsonrpc:"2.0",id,error:{code,message,...(data===undefined?{}:{data})}};}
function keep(obj, keys){const out={}; if(!obj||typeof obj!=="object")return out; for(const k of keys)if(obj[k]!==undefined)out[k]=obj[k]; return out;}
function safeUrl(value){if(!value)return ""; try{const u=new URL(value); return OWNED_HOSTS.has(u.hostname.toLowerCase())?value:"";}catch{return "";}}
function safeLineage(items){return Array.isArray(items)?items.filter(x=>x&&typeof x==="object").map(x=>keep(x,["source_file","locator","authority","role"])):[];}
function safeAuthority(a){return keep(a,["primary","confirmation_status","source_owner"]);}
function safeRecord(r){
  if(!r||typeof r!=="object")return {};
  const out=keep(r,["id","canonical_name","entry_type","entry_status","shelf","version_introduced","root_action","use_law","misuse_warning","vault_home","tags","dates","connections","flags","status","version","proof","source","preserved","next","public"]);
  if(r.authority) out.authority=safeAuthority(r.authority);
  if(r.names) out.names=keep(r.names,["source_names","aliases","speech_variants","public_name"]);
  if(r.definitions) out.definitions=keep(r.definitions,["plain","public_safe"]);
  if(r.meaning_radius) out.meaning_radius=keep(r.meaning_radius,["core_use","good_stretches","bad_stretches","misuse_edges","forbidden_collapses"]);
  if(r.relationships) out.relationships=keep(r.relationships,["term_family","source_family","meaning_neighbours","false_twins","bridge_terms","opposites","parent_terms","child_terms"]);
  if(r.visual_face) out.visual_face=keep(r.visual_face,["text_glyph","shape_logic","route_diagram","image_family"]);
  if(r.wordplay_face) out.wordplay_face=keep(r.wordplay_face,["operation","source_form","sound_form","alternate_readings","mechanism","public_note"]);
  if(r.claim) out.claim=keep(r.claim,["claim_status","d_level","boundary"]);
  if(r.lineage) out.lineage=safeLineage(r.lineage);
  if(out.public) out.public=safeUrl(out.public);
  return out;
}
function safeResultRow(row){return {id:row?.id||"",title:row?.title||"",text:row?.text||"",url:safeUrl(row?.url||""),source_kind:row?.source_kind||"",source_file:row?.source_file||"",score:row?.score,flags:Array.isArray(row?.flags)?row.flags:[],relationships:Array.isArray(row?.relationships)?row.relationships.slice(0,12):[]};}
function safeFetch(v){return {id:v?.id||"",title:v?.title||"",text:v?.text||"",url:safeUrl(v?.url||""),metadata:keep(v?.metadata,["source_kind","source_file","aliases","relationships","tags","flags"]),record:safeRecord(v?.record)};}
function sanitizeStructured(name,v){
  if(name==="search") return {...keep(v,["query","count","route","boundary"]),results:Array.isArray(v?.results)?v.results.map(safeResultRow):[]};
  if(name==="fetch") return safeFetch(v);
  if(name==="navigator_resolve_rootword") return {term:v?.term||"",entry:safeFetch(v?.entry),meaning_radius:keep(v?.meaning_radius,["core_use","good_stretches","bad_stretches","misuse_edges","forbidden_collapses"]),root_action:v?.root_action||"",use_law:v?.use_law||"",visual_face:keep(v?.visual_face,["text_glyph","shape_logic","route_diagram","image_family"]),wordplay_face:keep(v?.wordplay_face,["operation","source_form","sound_form","alternate_readings","mechanism","public_note"]),claim_boundary:keep(v?.claim_boundary,["claim_status","d_level","boundary"]),alternatives:Array.isArray(v?.alternatives)?v.alternatives.map(safeResultRow):[]};
  if(name==="navigator_return_lineage") return {id:v?.id||"",title:v?.title||"",source:v?.source||"",source_file:v?.source_file||"",preserved:v?.preserved||"",lineage:safeLineage(v?.lineage),connections:Array.isArray(v?.connections)?v.connections:[],authority:safeAuthority(v?.authority),boundary:v?.boundary||""};
  if(name==="navigator_bridge_status") return {name:"JM3232 Navigator",version:APP_VERSION,state:"PUBLIC_PLUGIN_READ_ONLY_INTEGRATED",source_counts:v?.source_counts||{},boundary:"Public descendant: five read-only retrieval tools; no owner runtime state, write tools, raw source excerpts, or shared mutable user state are exposed."};
  return v;
}
function sanitizeToolResult(name,result){if(!result||typeof result!=="object")return result; return {...result,structuredContent:sanitizeStructured(name,result.structuredContent||{})};}

async function integrationStatus(){
  try{
    const r=await fetch(INTEGRATION_REGISTRY,{headers:{accept:"application/json"},cf:{cacheTtl:0,cacheEverything:false}});
    if(!r.ok) throw new Error(`registry ${r.status}`);
    const d=await r.json();
    if(d?.schema!=="JM.Estate.PublicNervousSystem/1") throw new Error("registry schema mismatch");
    return {
      state:"CONNECTED",
      schema:d.schema,
      version:d.version||"",
      registry_status:d.status||"",
      canonical_root:d.canonical_root||"",
      integration_route:d.integration_route||"",
      registry_route:d.registry_route||INTEGRATION_REGISTRY,
      route_count:Array.isArray(d.routes)?d.routes.length:0,
      service_count:Array.isArray(d.services)?d.services.length:0,
      private_owner_write_published:d?.privacy_boundary?.contains_owner_write_endpoint===true,
    };
  }catch(e){
    return {state:"HOLD",registry_route:INTEGRATION_REGISTRY,error:String(e?.message||e),private_owner_write_published:false};
  }
}

async function upstream(method,params={}){
  const r=await fetch(SOURCE_MCP,{method:"POST",headers:{"content-type":"application/json","accept":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})});
  const j=await r.json();
  if(!r.ok||j.error) throw new Error(j?.error?.message||`upstream ${method} returned ${r.status}`);
  return j.result;
}

async function handleMcp(request){
  const origin=request.headers.get("origin");
  const allowed=new Set(["https://chatgpt.com","https://chat.openai.com"]);
  if(origin && !allowed.has(origin) && !origin.includes("localhost") && !origin.includes("127.0.0.1")) return json(rpcError(null,-32001,"Origin rejected by JM PermissionGate."),403);
  let payload; try{payload=await request.json();}catch{return json(rpcError(null,-32700,"Parse error"),400);}
  if(!payload||payload.jsonrpc!=="2.0"||!payload.method)return json(rpcError(payload?.id??null,-32600,"Invalid Request"),400);
  if(payload.id===undefined||payload.id===null)return new Response(null,{status:202,headers:{"access-control-allow-origin":"*"}});
  const id=payload.id, method=payload.method, params=payload.params||{};
  try{
    if(method==="initialize"){
      const requested=params.protocolVersion||DEFAULT_PROTOCOL;
      const protocol=SUPPORTED_PROTOCOLS.has(requested)?requested:DEFAULT_PROTOCOL;
      return json(rpcResult(id,{protocolVersion:protocol,capabilities:{tools:{listChanged:false}},serverInfo:{name:"JM3232 Navigator — Public Read-Only Integrated Descendant",version:APP_VERSION},instructions:"Search before fetch. Preserve source identity. Five public read-only tools only. Bridge status also reports the public-safe Estate integration registry. Owner write-state remains outside the public Plugin."}));
    }
    if(method==="ping") return json(rpcResult(id,{}));
    if(method==="tools/list") return json(rpcResult(id,{tools:TOOLS}));
    if(method==="tools/call"){
      if(!ALLOWED_TOOLS.has(params.name)) return json(rpcError(id,-32602,`Tool is not exposed on the public read-only descendant: ${params.name}`),400);
      const result=await upstream("tools/call",{name:params.name,arguments:params.arguments||{}});
      const safe=sanitizeToolResult(params.name,result);
      if(params.name==="navigator_bridge_status") safe.structuredContent.estate_integration=await integrationStatus();
      return json(rpcResult(id,safe));
    }
    if(method==="resources/list") return json(rpcResult(id,{resources:[]}));
    if(method==="resources/read") return json(rpcError(id,-32602,"The public submission descendant does not expose an MCP UI resource.",400),400);
    return json(rpcError(id,-32601,`Method not found: ${method}`),404);
  }catch(e){return json(rpcError(id,-32603,String(e?.message||e)),500);}
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(request.method==="OPTIONS"&&url.pathname==="/mcp") return new Response(null,{status:204,headers:{"access-control-allow-origin":"*","access-control-allow-methods":"POST, GET, OPTIONS","access-control-allow-headers":"content-type, mcp-session-id","access-control-expose-headers":"Mcp-Session-Id"}});
    if(url.pathname==="/mcp"&&request.method==="POST") return handleMcp(request);
    if(url.pathname==="/mcp") return json(rpcError(null,-32000,"This plugin endpoint accepts MCP POST requests."),405);
    if(url.pathname==="/integration") return json(await integrationStatus());
    if(url.pathname==="/health") return json({ok:true,name:"JM3232 Navigator",version:APP_VERSION,state:"PUBLIC_PLUGIN_READ_ONLY_INTEGRATED",tool_count:TOOLS.length,resource_count:0,shared_mutable_user_state:false,raw_source_excerpts:false,estate_integration:await integrationStatus()});
    return env.ASSETS.fetch(request);
  }
};
