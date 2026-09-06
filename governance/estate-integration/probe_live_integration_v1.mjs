import fs from 'node:fs';

const estateHosts = [
  'https://jmisjustme-estate.pages.dev',
  'https://089434e7.jmisjustme-estate.pages.dev',
];
const mcpHosts = [
  'https://navigator-plugin-public.jm-inline-contact-probe.pages.dev',
  'https://e0b3ba0a.jm-inline-contact-probe.pages.dev',
];
const estateRoutes = [
  ['root','/','JMISJUSTME'],
  ['navigator','/navigator/','JM3232 NAVIGATOR'],
  ['stringline','/navigator/stringline.json','estate-sovereign-integration'],
  ['integration','/navigator/estate-integration/','One Estate.'],
  ['registry','/navigator/estate-integration/public-registry.json','JM.Estate.PublicNervousSystem/1'],
  ['apps','/apps/','NON-GAME APPS HOUSE'],
  ['theory','/theory/','Human Pattern Calibration'],
  ['lyrics','/lyrics/','data-jm-estate-integration="v1"'],
  ['recovery','/recovery/','data-jm-estate-integration="v1"'],
];

async function get(url){
  try{
    const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'JM-Estate-Integration-Live-Probe/1'}});
    const text=await r.text();
    return {ok:r.ok,status:r.status,url:r.url,text};
  }catch(e){return {ok:false,status:0,url,error:String(e?.message||e),text:''}}
}

async function rpc(base,id,method,params={}){
  try{
    const r=await fetch(base+'/mcp',{method:'POST',headers:{'content-type':'application/json','accept':'application/json','user-agent':'JM-Estate-Integration-Live-Probe/1'},body:JSON.stringify({jsonrpc:'2.0',id,method,params})});
    const text=await r.text();
    let json; try{json=JSON.parse(text)}catch{json=null}
    return {ok:r.ok,status:r.status,json,text:text.slice(0,500)};
  }catch(e){return {ok:false,status:0,error:String(e?.message||e)}}
}

const result={
  schema:'JM.Estate.LiveIntegrationProbe/1',
  at:new Date().toISOString(),
  estate:{},
  mcp:{},
  pass:false,
};

for(const host of estateHosts){
  const rows=[];
  for(const [id,path,needle] of estateRoutes){
    const q=(path.includes('?')?'&':'?')+'probe='+Date.now()+'-'+encodeURIComponent(id);
    const x=await get(host+path+q);
    const needlePass=x.ok && x.text.includes(needle);
    rows.push({id,path,status:x.status,ok:x.ok,needle,needlePass,finalUrl:x.url||'',bytes:x.text.length});
    console.log('ESTATE',host,id,'HTTP',x.status,'needle',needlePass?'PASS':'FAIL','bytes',x.text.length);
  }
  result.estate[host]=rows;
}

for(const base of mcpHosts){
  const health=await get(base+'/health?probe='+Date.now());
  let healthJson=null; try{healthJson=JSON.parse(health.text)}catch{}
  const init=await rpc(base,1,'initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'JM Estate live probe',version:'1'}});
  const list=await rpc(base,2,'tools/list');
  const status=await rpc(base,3,'tools/call',{name:'navigator_bridge_status',arguments:{}});
  const write=await rpc(base,4,'tools/call',{name:'navigator_create_stringreceipt',arguments:{}});
  const toolCount=list?.json?.result?.tools?.length ?? null;
  const integration=status?.json?.result?.structuredContent?.estate_integration ?? null;
  const safeText=JSON.stringify({health:healthJson,status:status.json||null});
  const noLeak=!['receipt_chain_head','registered_bodies','stringmarks','navigator-live-contact.jm-inline-contact-probe.pages.dev'].some(x=>safeText.includes(x));
  const row={
    health:{status:health.status,ok:health.ok,version:healthJson?.version||'',integration:healthJson?.estate_integration||null},
    initialize:{status:init.status,ok:init.ok,error:init?.json?.error||null},
    tools:{status:list.status,ok:list.ok,count:toolCount,names:list?.json?.result?.tools?.map(t=>t.name)||[]},
    bridgeStatus:{status:status.status,ok:status.ok,integration},
    writeRejected:!write.ok && !!write?.json?.error,
    noOwnerLeak:noLeak,
  };
  result.mcp[base]=row;
  console.log('MCP',base,'health',health.status,'tools',toolCount,'integration',integration?.state||'NONE','writeRejected',row.writeRejected,'noLeak',noLeak);
}

const canonicalEstate=result.estate[estateHosts[0]]||[];
const canonicalEstatePass=canonicalEstate.every(r=>r.ok&&r.needlePass);
const canonicalMcp=result.mcp[mcpHosts[0]];
const canonicalMcpPass=
  canonicalMcp?.health?.ok &&
  canonicalMcp?.health?.version==='0.2.0-estate-integration.1' &&
  canonicalMcp?.tools?.ok && canonicalMcp.tools.count===5 &&
  canonicalMcp?.bridgeStatus?.ok && canonicalMcp.bridgeStatus.integration?.state==='CONNECTED' &&
  canonicalMcp.bridgeStatus.integration?.private_owner_write_published===false &&
  canonicalMcp.writeRejected===true && canonicalMcp.noOwnerLeak===true;

result.pass=canonicalEstatePass&&canonicalMcpPass;
result.canonical={estatePass:canonicalEstatePass,mcpPass:canonicalMcpPass};
fs.writeFileSync('ESTATE_SOVEREIGN_INTEGRATION_LIVE_PROOF_v1.json',JSON.stringify(result,null,2)+'\n');
console.log('CANONICAL ESTATE',canonicalEstatePass?'PASS':'FAIL');
console.log('CANONICAL MCP',canonicalMcpPass?'PASS':'FAIL');
console.log('OVERALL',result.pass?'PASS':'FAIL');
if(!result.pass) process.exit(1);
