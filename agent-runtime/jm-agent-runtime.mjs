#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"..");
const CONTRACT_PATH=path.join(HERE,"JM_SOVEREIGN_AGENT_RUNTIME_CONTRACT_v0_1.json");

function loadJson(p){return JSON.parse(fs.readFileSync(p,"utf8"));}
function sha256File(p){return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");}
function tokens(v){return [...new Set(String(v).toLowerCase().replace(/[^a-z0-9]+/g," ").trim().split(/\s+/).filter(Boolean))].sort();}
function candidateTokens(item){
  const parts=[item.name??"",item.domain??"",...(item.capabilities??[]),...(item.donor_roles??[])];
  return new Set(tokens(parts.join(" ")));
}
function sortObj(v){
  if(Array.isArray(v)) return v.map(sortObj);
  if(v && typeof v==="object"){
    const o={};
    for(const k of Object.keys(v).sort()) o[k]=sortObj(v[k]);
    return o;
  }
  return v;
}
function stable(v){return JSON.stringify(sortObj(v));}

const argv=process.argv.slice(2);
let query="";
let coreOnly=false;
for(let i=0;i<argv.length;i++){
  if(argv[i]==="--query") query=argv[++i]??"";
  else if(argv[i]==="--core-only") coreOnly=true;
  else {console.error("Unknown argument:",argv[i]);process.exit(2);}
}

const runtime=loadJson(CONTRACT_PATH);
const docs={};
const sources={};
for(const [key,rel] of Object.entries(runtime.canonical_sources)){
  const p=path.join(ROOT,rel);
  docs[key]=loadJson(p);
  sources[key]={path:rel,sha256:sha256File(p)};
}
const agent=docs.sovereign_agent;
const governance=docs.build_governance;
const estate=docs.estate_capability_field;
const current64=docs.coding_current64;
const errors=[];
if(agent.schema!=="JM.SovereignAgentContract/0.1") errors.push("sovereign agent schema");
if(governance.schema!=="JM.BuildLawsPreferencesGovernance/1.0") errors.push("build governance schema");
if(estate.schema!=="JM.EstateCapabilityField/1.0") errors.push("Estate capability schema");
if(current64.schema!=="JM.CodingEstate.Current64/1.0") errors.push("Current64 schema");
if((estate.current_project_heads??[]).length!==19) errors.push("Estate current head count");
if((estate.overlay_and_donor_profiles??[]).length!==11) errors.push("Estate overlay count");
if((current64.identities??[]).length!==64) errors.push("Current64 identity count");
if(errors.length){console.error("JM AGENT RUNTIME: FAIL "+errors.join(", "));process.exit(1);}

const qt=tokens(query);
const candidates=[];
for(const [kind,items] of [
  ["current_project_head",estate.current_project_heads],
  ["overlay_donor_profile",estate.overlay_and_donor_profiles]
]){
  for(const item of items){
    const ct=candidateTokens(item);
    const score=qt.filter(t=>ct.has(t)).length;
    if(score) candidates.push({kind,id:item.id??null,name:item.name??null,domain:item.domain??null,score});
  }
}
candidates.sort((a,b)=> {
  const score=b.score-a.score; if(score) return score;
  const kind=(a.kind==="current_project_head"?0:1)-(b.kind==="current_project_head"?0:1); if(kind) return kind;
  const an=String(a.name), bn=String(b.name); return an<bn?-1:an>bn?1:0;
});

const core={
  schema:"JM.AgentRuntimeSession/0.1",
  authority_class:"SESSION_ROUTER_NOT_SOURCE_AUTHORITY",
  source_digests:sources,
  governance:{
    master_runtime:governance.master_runtime??null,
    authority_gate:governance.authority_gate?.required??null,
    host_neutral:governance.sovereignty?.host_neutral??null
  },
  estate:{
    current_project_heads:estate.current_project_heads.length,
    overlay_profiles:estate.overlay_and_donor_profiles.length,
    routing_authority_class:estate.authority_class??null
  },
  coding:{
    current_identities:current64.identities.length,
    identity_law:current64.identity_law??null
  },
  query:{raw:query,tokens:qt},
  route_candidates:candidates,
  required_next:[
    "resolve live/current authority for selected head before material action",
    "preserve donor and recipient identity",
    "execute only through an authorized host route",
    "require returned consequence before Ding"
  ],
  keeper:runtime.keeper
};
if(coreOnly) console.log(stable(core));
else {
  const coreText=stable(core);
  console.log(JSON.stringify(sortObj({
    adapter:{implementation:"node","role":"HOST_ADAPTER_NOT_SOURCE_AUTHORITY"},
    core,
    core_sha256:crypto.createHash("sha256").update(coreText,"utf8").digest("hex")
  }),null,2));
}
