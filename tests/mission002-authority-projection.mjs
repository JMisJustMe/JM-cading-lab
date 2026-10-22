import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker from '../navigator/mcp-public-v1/worker.mjs';
const registry=JSON.parse(fs.readFileSync('navigator/estate-integration/public-registry.json'));
const seat=registry.lineage_seats.find(x=>x.id==='JM-BUILD-MESH-001');
assert.equal(seat.authority.hosted_mcp_current,'v0.8.5');
assert.equal(seat.authority.primary,'JM.CareerCurrentProjectRegistry/0.24');
assert.ok(seat.lineage.some(x=>x.locator==='v0.7.3'));
assert.match(seat.boundary,/candidate until explicitly deployed/);
const original=globalThis.fetch;
globalThis.fetch=async url=>{
 if(String(url).endsWith('/navigator/estate-integration/public-registry.json'))return Response.json(registry);
 throw Error('UNEXPECTED_NETWORK');
};
try{
 const req=new Request('https://navigator-plugin-public.example/mcp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'navigator_return_lineage',arguments:{id:'JM-BUILD-MESH-001'}}})});
 const response=await worker.fetch(req,{ASSETS:{fetch:async()=>new Response('unused')}});
 assert.equal(response.status,200);
 const result=(await response.json()).result.structuredContent;
 assert.equal(result.authority.primary,'JM.CareerCurrentProjectRegistry/0.24');
 assert.match(result.source,/v0.8.5/);
 assert.match(result.boundary,/v0.8.6 is live/);
 assert.equal(JSON.stringify(result).includes('receipt_chain_head'),false);
 console.log(JSON.stringify({status:'PASS',checks:9,actualSourceRegistryConsumed:true,hosted:'0.8.5',candidate:'0.8.6',publication:false}));
}finally{globalThis.fetch=original}
