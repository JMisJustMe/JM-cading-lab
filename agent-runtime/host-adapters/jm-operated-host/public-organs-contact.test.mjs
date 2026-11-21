import test from 'node:test';
import assert from 'node:assert/strict';
import {PUBLIC_ORGAN_ROUTES,getPublicOrgan,validatePublicOrganFixture,probeOriginalPublicOrgans} from './public-organs-contact.mjs';
const origin='https://jm-cloud-contact-server-v05.onrender.com';
const j=(o,status=200,url='')=>new Response(JSON.stringify(o),{status,headers:{'content-type':'application/json'}});
const fixture={
 '/game/v1/meta':{ok:true,schema:'JM.GameProfile/0.3',root:'JM CLOUD CONTACT SERVER v0.5.1-hosted',organs:['matchmaking']},
 '/game/v1/ready':{ok:true,ready:true,players:0,matches:0,clans:0},
 '/mesh/v1/meta':{ok:true,keeper:'MESH ≠ MERGE',cloudRoot:'/v5',mountedBodies:['JM RouteVault']},
 '/mesh/v1/ready':{ok:true,ready:true,authusers:0,workspaces:0},
 '/mesh/v2/meta':{ok:true,keeper:'MESH ≠ MERGE',packetSchema:'jm.packet/1.0',mountedBodies:['JM Collector Protocol App']},
 '/market/v1/meta':{ok:true,schema:'JM.MarketEcosystemLab.HostedProfile/0.41',cloudRoot:'JM CLOUD CONTACT SERVER v0.5.1-hosted'},
 '/market/v1/ready':{ok:true,ready:true,page:true,supportedPairs:4},
 '/market/v1/persistence':{ok:true,mode:'postgres',durable:true,databaseConfigured:true},
 '/zezu/v1/meta':{ok:true,schema:'JM.Zezu/0.2',manifestSchema:'JM.Manifest/1',admissions:[]},
 '/zezu/v1/ready':{ok:true,ready:true,admitted:3,boot:{errors:[]}}
};
const transport=async(url,options)=>{assert.equal(options.method,'GET');assert.equal(options.redirect,'manual');assert.equal(options.headers.accept,'application/json');const p=new URL(url).pathname;assert.ok(PUBLIC_ORGAN_ROUTES.includes(p));return j(fixture[p])};
test('source fixture recognizes each sovereign organ without collapsing their contracts',()=>{const v=validatePublicOrganFixture(fixture);assert.deepEqual(Object.keys(v),['cloud','game','mesh','market','zezu']);assert.equal(v.market.durableClaimFromPublicAPI,true);assert.equal(v.zezu.admitted,3)});
test('rejects unknown endpoints, anything account-bearing and alternate origins before contact',async()=>{let calls=0;const bad=async()=>{calls++;throw Error('NETWORK_CALLED')};for(const p of ['/v5/spaces','/game/v1/me','/mesh/v1/dashboard','/market/v1/snapshots','/zezu/v1/store','/market/v1/quotes'])await assert.rejects(()=>getPublicOrgan({path:p,transport:bad}),/UNKNOWN_OR_SENSITIVE_ENDPOINT/);await assert.rejects(()=>getPublicOrgan({path:'/game/v1/meta',origin:'http://jm-cloud-contact-server-v05.onrender.com',transport:bad}),/PINNED_ORIGIN/);assert.equal(calls,0)});
test('all actual probes require immutable CP14 parent readiness and preserve GET-only operations',async()=>{const result=await probeOriginalPublicOrgans({origin,transport,probeParent:async()=>({ok:true,ready:{ready:true,version:'0.5.1-hosted'},key:{keyId:'abcd'}})});assert.equal(result.ok,true);assert.equal(result.pathsChecked,10);assert.equal(result.organs.game.ready,true);assert.equal(result.organs.market.databaseConfigured,true);await assert.rejects(()=>probeOriginalPublicOrgans({transport,probeParent:async()=>({ok:false})}),/CP14_PARENT_NOT_READY/)});
test('fails closed on wrong or partial response and missing required organs',()=>{const x={...fixture,'/market/v1/ready':{ok:true,ready:false,page:true,supportedPairs:4}};assert.throws(()=>validatePublicOrganFixture(x),/MARKET_NOT_READY/);const y={...fixture};delete y['/zezu/v1/meta'];assert.throws(()=>validatePublicOrganFixture(y),/MISSING_ORGAN_PROOF/)});
test('fails closed on non-200, non-json, HTTP redirects and bad JSON',async()=>{for(const tx of [async()=>j({ok:false},503),async()=>new Response('x',{status:200,headers:{'content-type':'text/plain'}}),async()=>new Response('{bad',{status:200,headers:{'content-type':'application/json'}})])await assert.rejects(()=>getPublicOrgan({path:'/game/v1/meta',transport:tx}),/CP15_/)});
test('no raw confidential data is carried into the public receipt',()=>{const x=JSON.parse(JSON.stringify(fixture));x['/market/v1/persistence'].password='NEVER';x['/game/v1/ready'].token='NEVER';x['/zezu/v1/meta'].records=[{secret:'NEVER'}];const v=validatePublicOrganFixture(x);assert.ok(!JSON.stringify(v).includes('NEVER'));assert.equal(v.market.persistenceMode,'postgres')});
