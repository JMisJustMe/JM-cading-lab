const APP_VERSION = "0.3.0-original-ui-contact-cp02";
const CP02_URI = "ui://jm3232-navigator/airborne-source-cp02.html";
const ORIGINAL_BROWSER = "https://jmisjustme-estate.pages.dev/navigator/";
const APPROVED_CARRIER_SHA = "b41d03fdc5a4fd9545ed30beac5477e70a54ddf479bb580f4650333a41387569";
const LIVE_CARRIER_WITH_RETURN_SHA = "2ece6163a5ca81ff89ca056ffc9d508eefd04977dbe8ae470573f0e664ec4d8a";
const MAX_ORIGINAL_BYTES = 7_000_000;
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
  // This is a render-only MCP Apps tool: no owner writes or new browser shell.
  { name:"navigator_render_original_browser", title:"Open original JM3232 in ChatGPT",
    description:"Request the authentic, hash-verified public JM3232 AIRBORNE browser source directly in ChatGPT's MCP Apps UI. Rendering and interaction remain host-dependent; this does not open a new browser or grant owner write access.",
    inputSchema:{type:"object",properties:{},additionalProperties:false},
    outputSchema:OUTPUT_OBJECT,
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:true},
    _meta:{...toolMeta(),ui:{resourceUri:CP02_URI},"openai/outputTemplate":CP02_URI}
  },

  { name:"search", title:"Search the JM Estate", description:"Find JM Estate bodies, Navigator routes, Radius Lexicon terms, receipts, public doors, or source records. Returns stable IDs for fetch and does not change state.", inputSchema:{type:"object",properties:{query:{type:"string",minLength:1},limit:{type:"integer",minimum:1,maximum:25,default:8},sources:{type:"array",items:{type:"string"}}},required:["query"],additionalProperties:false}, outputSchema:OUTPUT_OBJECT, annotations:ro, _meta:toolMeta() },
  { name:"fetch", title:"Fetch an Estate source", description:"Retrieve one preserved Estate source record by stable ID, including its public-safe meaning, authority, route, relationships, flags, and source metadata. Does not change state.", inputSchema:{type:"object",properties:{id:{type:"string",minLength:1}},required:["id"],additionalProperties:false}, outputSchema:OUTPUT_OBJECT, annotations:ro, _meta:toolMeta() },
  { name:"navigator_resolve_rootword", title:"Resolve a RootWord", description:"Return public-safe Radius Lexicon meaning, good stretches, misuse edges, source boundaries, Visualang route, and wordplay face for a JM term without changing state.", inputSchema:{type:"object",properties:{term:{type:"string",minLength:1}},required:["term"],additionalProperties:false}, outputSchema:OUTPUT_OBJECT, annotations:ro, _meta:toolMeta() },
  { name:"navigator_return_lineage", title:"Return source lineage", description:"Return public-safe source authority, lineage locators, connections, and claim boundary for a known Estate or Radius record without changing state or reproducing raw source excerpts.", inputSchema:{type:"object",properties:{id:{type:"string",minLength:1}},required:["id"],additionalProperties:false}, outputSchema:OUTPUT_OBJECT, annotations:ro, _meta:toolMeta() },
  { name:"navigator_bridge_status", title:"Inspect bridge status", description:"Inspect public source counts and the live Estate integration boundary without exposing owner runtime state or changing Navigator state.", inputSchema:{type:"object",properties:{},additionalProperties:false}, outputSchema:OUTPUT_OBJECT, annotations:ro, _meta:toolMeta() },
];

const CP02_CSP = {
  connectDomains: ["https://jmisjustme-estate.pages.dev"],
  resourceDomains: ["https://jmisjustme-estate.pages.dev"],
  frameDomains: [],
};
const CP02_RESOURCE = {
  uri: CP02_URI,
  name: "Original JM3232 AIRBORNE v1.5.2 — direct source contact",
  title: "JM3232 Original Browser",
  description: "Direct loading of the authentic public browser carrier HTML in the ChatGPT MCP Apps frame, with pinned SHA-256 source-contact gate.",
  mimeType: "text/html;profile=mcp-app",
  _meta: {
    ui: { prefersBorder:false, csp:CP02_CSP },
    "openai/ui": { availableDisplayModes:["inline","fullscreen"] },
    "openai/widgetDescription": "JM3232's actual AIRBORNE browser source is rendered in the ChatGPT component sandbox, not redrawn or nested in another iframe.",
  },
};

function byteToHex(buffer){
  return Array.from(new Uint8Array(buffer), b=>b.toString(16).padStart(2,"0")).join("");
}
async function loadOriginalBrowser(){
  // Do not propagate cookies, credentials, host tokens, or private owner state.
  const res = await fetch(ORIGINAL_BROWSER, {
    method:"GET", credentials:"omit", redirect:"manual",
    headers:{accept:"text/html"},
    cf:{cacheTtl:0,cacheEverything:false},
  });
  if(!res.ok || !String(res.headers.get("content-type")||"").includes("text/html")) throw new Error("Canonical browser source unavailable.");
  const len = Number(res.headers.get("content-length")||0);
  if(len > MAX_ORIGINAL_BYTES) throw new Error("Canonical source size gate.");
  const bytes = await res.arrayBuffer();
  if(bytes.byteLength > MAX_ORIGINAL_BYTES) throw new Error("Canonical source size gate.");
  const sha = byteToHex(await crypto.subtle.digest("SHA-256", bytes));
  if(sha !== APPROVED_CARRIER_SHA && sha !== LIVE_CARRIER_WITH_RETURN_SHA) {
    throw new Error("Canonical browser source hash changed; contact held pending lineage proof.");
  }
  const html = new TextDecoder("utf-8",{fatal:true}).decode(bytes);
  if(!html.includes('v1.5.2 · AIRBORNE') || !html.includes('data-jm-airborne-canonical-door="v1.5.2"'))
    throw new Error("Canonical browser identity marker missing.");
  // A minimal BASE carrier adapter makes the authentic external resources resolve.
  // No rebuilt layout/DOM, app code, third-party nested iframe, or source substitution.
  if(!/<head(?:\s[^>]*)?>/i.test(html)) throw new Error("Original head marker missing.");
  const carrier = html.replace(/<head(\s[^>]*)?>/i, (head)=>
    head+'<base href="'+ORIGINAL_BROWSER+'">');
  return {carrier,sha,sourceBytes:bytes.byteLength};
}

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
  if(name==="navigator_bridge_status") return {name:"JM3232 Navigator",version:APP_VERSION,state:"PUBLIC_PLUGIN_READ_ONLY_INTEGRATED",source_counts:v?.source_counts||{},boundary:"Public descendant: five inherited read-only retrieval tools and one render-only UI surface; no owner runtime state, write tools, raw source excerpts, or shared mutable user state are exposed."};
  return v;
}
function sanitizeToolResult(name,result){if(!result||typeof result!=="object")return result; return {...result,structuredContent:sanitizeStructured(name,result.structuredContent||{})};}


async function publicLineageSeats(){
  try{
    const r=await fetch(INTEGRATION_REGISTRY,{headers:{accept:"application/json"},cf:{cacheTtl:0,cacheEverything:false}});
    if(!r.ok) return [];
    const d=await r.json();
    if(d?.schema!=="JM.Estate.PublicNervousSystem/1") return [];
    return Array.isArray(d.lineage_seats)?d.lineage_seats:[];
  }catch{return [];}
}
function seatNorm(value){return String(value||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();}
function seatMatches(query,seat){
  const q=seatNorm(query);
  if(!q)return false;
  const names=[seat?.name,...(Array.isArray(seat?.aliases)?seat.aliases:[])].map(seatNorm).filter(Boolean);
  return names.some(n=>q===n||q.includes(n)||n.includes(q));
}
function seatSearchRow(seat){
  return {
    id:seat.id||"",
    title:seat.name||"",
    text:[seat.role,seat.status,seat.version].filter(Boolean).join(" · "),
    url:"",
    source_kind:"estate_public_lineage",
    source_file:seat.source_file||"navigator/estate-integration/public-registry.json",
    score:100,
    flags:["public-safe","current-declared"],
    relationships:Array.isArray(seat.connections)?seat.connections.slice(0,12):[],
  };
}
function seatFetchView(seat){
  return {
    id:seat.id||"",
    title:seat.name||"",
    text:[seat.role,seat.status,seat.version,seat.preserved].filter(Boolean).join(" · "),
    url:"",
    metadata:{
      source_kind:"estate_public_lineage",
      source_file:seat.source_file||"navigator/estate-integration/public-registry.json",
      aliases:Array.isArray(seat.aliases)?seat.aliases:[],
      relationships:Array.isArray(seat.connections)?seat.connections:[],
      tags:["Build Mesh","ECOSTATE","control plane","public lineage"],
      flags:["public-safe","current-declared"],
    },
    record:{
      id:seat.id||"",
      canonical_name:seat.name||"",
      entry_type:"public lineage seat",
      entry_status:seat.status||"",
      version:seat.version||"",
      source:seat.source||"",
      preserved:seat.preserved||"",
      connections:Array.isArray(seat.connections)?seat.connections:[],
      authority:seat.authority||{},
      lineage:Array.isArray(seat.lineage)?seat.lineage:[],
      claim:{claim_status:seat.status||"",boundary:seat.boundary||""},
    },
  };
}
function seatLineageView(seat){
  return {
    id:seat.id||"",
    title:seat.name||"",
    source:seat.source||"",
    source_file:seat.source_file||"navigator/estate-integration/public-registry.json",
    preserved:seat.preserved||"",
    lineage:Array.isArray(seat.lineage)?seat.lineage:[],
    connections:Array.isArray(seat.connections)?seat.connections:[],
    authority:seat.authority||{},
    boundary:seat.boundary||"",
  };
}
function localToolResult(structuredContent){
  return {
    content:[{type:"text",text:JSON.stringify(structuredContent,null,2)}],
    structuredContent,
    isError:false,
  };
}

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
      return json(rpcResult(id,{protocolVersion:protocol,capabilities:{tools:{listChanged:false},resources:{listChanged:false}},serverInfo:{name:"JM3232 Navigator — Public Read-Only Integrated Descendant",version:APP_VERSION},instructions:"Search before fetch. Preserve source identity. Six public read-only tools, including one original-source render surface. Bridge status also reports the public-safe Estate integration registry. Owner write-state remains outside the public Plugin."}));
    }
    if(method==="ping") return json(rpcResult(id,{}));
    if(method==="tools/list") return json(rpcResult(id,{tools:TOOLS}));
    if(method==="tools/call"){
      if(params.name==="navigator_render_original_browser"){
        if(Object.keys(params.arguments||{}).length) return json(rpcError(id,-32602,"Render tool accepts no parameters."),400);
        return json(rpcResult(id,localToolResult({identity:"jm://navigator",canonical:ORIGINAL_BROWSER,source_status:"PINNED_SOURCE_REQUESTED",host_render_state:"UNVERIFIED",owner_write_exposed:false,claim:"Direct original carrier resource; final ChatGPT host render and Internet return are separate gates."})));
      }
      if(!ALLOWED_TOOLS.has(params.name)) return json(rpcError(id,-32602,`Tool is not exposed on the public read-only descendant: ${params.name}`),400);
      const args=params.arguments||{};
      if(params.name==="fetch"||params.name==="navigator_return_lineage"){
        const seats=await publicLineageSeats();
        const seat=seats.find(x=>x?.id===args.id);
        if(seat){
          const structured=params.name==="fetch"?seatFetchView(seat):seatLineageView(seat);
          return json(rpcResult(id,localToolResult(structured)));
        }
      }
      const result=await upstream("tools/call",{name:params.name,arguments:args});
      const safe=sanitizeToolResult(params.name,result);
      if(params.name==="search"){
        const seats=await publicLineageSeats();
        const local=seats.filter(x=>seatMatches(args.query,x)).map(seatSearchRow);
        if(local.length){
          const existing=Array.isArray(safe.structuredContent?.results)?safe.structuredContent.results:[];
          const ids=new Set(local.map(x=>x.id));
          safe.structuredContent.results=[...local,...existing.filter(x=>!ids.has(x.id))].slice(0,Math.max(1,Math.min(Number(args.limit||8),25)));
          safe.structuredContent.count=safe.structuredContent.results.length;
          safe.structuredContent.boundary=((safe.structuredContent.boundary||"")+" Public-safe lineage seats are projected from the canonical Estate integration registry and do not grant write authority.").trim();
        }
      }
      if(params.name==="navigator_bridge_status") safe.structuredContent.estate_integration=await integrationStatus();
      return json(rpcResult(id,safe));
    }
    if(method==="resources/list") return json(rpcResult(id,{resources:[CP02_RESOURCE]}));
    if(method==="resources/read"){
      if(params.uri !== CP02_URI) return json(rpcError(id,-32602,"Unknown UI resource."),400);
      try{
        const original=await loadOriginalBrowser();
        return json(rpcResult(id,{contents:[{
          uri:CP02_URI,mimeType:"text/html;profile=mcp-app",text:original.carrier,
          _meta:{...CP02_RESOURCE._meta,"jm/source_sha256":original.sha,"jm/source_bytes":original.sourceBytes,
            "jm/source_status":"EXACT_LIVE_CARRIER_PINNED_HOST_UNVERIFIED"}
        }]}));
      }catch(e){
        return json(rpcError(id,-32010,String(e?.message||e)),502);
      }
    }
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
    if(url.pathname==="/health") return json({ok:true,name:"JM3232 Navigator",version:APP_VERSION,state:"PUBLIC_PLUGIN_READ_ONLY_INTEGRATED",tool_count:TOOLS.length,resource_count:1,shared_mutable_user_state:false,raw_source_excerpts:false,estate_integration:await integrationStatus()});
    return env.ASSETS.fetch(request);
  }
};
