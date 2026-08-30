const APP_VERSION = "0.1.0-plugin-public.1";
const SOURCE_MCP = "https://navigator-live-contact.jm-inline-contact-probe.pages.dev/mcp";
const WIDGET_URI = "ui://jm3232-navigator/stringdoor-v0.1.html";
const SUPPORTED_PROTOCOLS = new Set(["2025-06-18", "2025-03-26"]);
const DEFAULT_PROTOCOL = "2025-06-18";
const ALLOWED_TOOLS = new Set([
  "search",
  "fetch",
  "navigator_resolve_rootword",
  "navigator_return_lineage",
  "navigator_bridge_status",
]);

const OUTPUT_OBJECT = { type: "object", additionalProperties: true };
const ro = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const toolMeta = (widget = false) => ({
  "openai/toolInvocation/invoking": "Reading through JM3232 Navigator…",
  "openai/toolInvocation/invoked": "Navigator route returned",
  ...(widget ? { "ui.resourceUri": WIDGET_URI, "openai/outputTemplate": WIDGET_URI } : {}),
});

const TOOLS = [
  { name:"search", title:"Search the JM Estate", description:"Find JM Estate bodies, Navigator routes, Radius Lexicon terms, receipts, public doors, or source records. Returns stable IDs for fetch and does not change state.", inputSchema:{type:"object",properties:{query:{type:"string",minLength:1},limit:{type:"integer",minimum:1,maximum:25,default:8},sources:{type:"array",items:{type:"string"}}},required:["query"],additionalProperties:false}, outputSchema:OUTPUT_OBJECT, annotations:ro, _meta:toolMeta(true) },
  { name:"fetch", title:"Fetch an Estate source", description:"Retrieve one preserved Estate source record by stable ID, including route, relationships, flags, and preserved metadata. Does not change state.", inputSchema:{type:"object",properties:{id:{type:"string",minLength:1}},required:["id"],additionalProperties:false}, outputSchema:OUTPUT_OBJECT, annotations:ro, _meta:toolMeta(true) },
  { name:"navigator_resolve_rootword", title:"Resolve a RootWord", description:"Return Radius Lexicon meaning, good stretches, misuse edges, source boundaries, Visualang route, and wordplay face for a JM term without changing state.", inputSchema:{type:"object",properties:{term:{type:"string",minLength:1}},required:["term"],additionalProperties:false}, outputSchema:OUTPUT_OBJECT, annotations:ro, _meta:toolMeta(true) },
  { name:"navigator_return_lineage", title:"Return source lineage", description:"Return preserved source, authority, lineage, connections, and claim boundary for a known Estate or Radius record without changing state.", inputSchema:{type:"object",properties:{id:{type:"string",minLength:1}},required:["id"],additionalProperties:false}, outputSchema:OUTPUT_OBJECT, annotations:ro, _meta:toolMeta(false) },
  { name:"navigator_bridge_status", title:"Inspect bridge status", description:"Inspect mounted source counts and the live publication boundary without changing Navigator state.", inputSchema:{type:"object",properties:{},additionalProperties:false}, outputSchema:OUTPUT_OBJECT, annotations:ro, _meta:toolMeta(false) },
];

function json(data,status=200,extra={}){
  return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","access-control-allow-origin":"*","access-control-expose-headers":"Mcp-Session-Id",...extra}});
}
function rpcResult(id,result){return {jsonrpc:"2.0",id,result};}
function rpcError(id,code,message,data){return {jsonrpc:"2.0",id,error:{code,message,...(data===undefined?{}:{data})}};}

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
      return json(rpcResult(id,{protocolVersion:protocol,capabilities:{tools:{listChanged:false},resources:{subscribe:false,listChanged:false}},serverInfo:{name:"JM3232 Navigator — Public Read-Only Plugin Descendant",version:APP_VERSION},instructions:"Search before fetch. Preserve source identity. This public descendant is deliberately read-only: it exposes retrieval, RootWord resolution, lineage and status only. Stringmarks, registrations, receipts and SavePacks remain on the separate owner/live-contact body."}));
    }
    if(method==="ping") return json(rpcResult(id,{}));
    if(method==="tools/list") return json(rpcResult(id,{tools:TOOLS}));
    if(method==="tools/call"){
      if(!ALLOWED_TOOLS.has(params.name)) return json(rpcError(id,-32602,`Tool is not exposed on the public read-only descendant: ${params.name}`),400);
      return json(rpcResult(id,await upstream("tools/call",{name:params.name,arguments:params.arguments||{}})));
    }
    if(method==="resources/list") return json(rpcResult(id,await upstream("resources/list")));
    if(method==="resources/read") return json(rpcResult(id,await upstream("resources/read",params)));
    return json(rpcError(id,-32601,`Method not found: ${method}`),404);
  }catch(e){return json(rpcError(id,-32603,String(e?.message||e)),500);}
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(request.method==="OPTIONS"&&url.pathname==="/mcp") return new Response(null,{status:204,headers:{"access-control-allow-origin":"*","access-control-allow-methods":"POST, GET, OPTIONS","access-control-allow-headers":"content-type, mcp-session-id","access-control-expose-headers":"Mcp-Session-Id"}});
    if(url.pathname==="/mcp"&&request.method==="POST") return handleMcp(request);
    if(url.pathname==="/mcp") return json(rpcError(null,-32000,"This plugin endpoint accepts MCP POST requests."),405);
    if(url.pathname==="/health") return json({ok:true,name:"JM3232 Navigator",version:APP_VERSION,state:"PUBLIC_PLUGIN_READ_ONLY_READY",source_mcp:SOURCE_MCP,tool_count:TOOLS.length,shared_mutable_user_state:false});
    return env.ASSETS.fetch(request);
  }
};
