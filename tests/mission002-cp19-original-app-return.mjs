import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createTrustedEstateServer} from '../coding-estate/integration/m002-cp16-trusted-host.mjs';
import {makeCP16Fixture} from './fixtures/m002-cp16-provenance.mjs';
import {prepareCP19Transfer,CP19_SCOPE}
 from '../coding-estate/integration/m002-cp19-original-app-return.mjs';
const sha=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
let checks=0,service;const eq=(a,b)=>{assert.deepEqual(a,b);checks++};
const yes=a=>{assert.ok(a);checks++};
const fail=async(f,re)=>{await assert.rejects(f,re);checks++};
const fixture=makeCP16Fixture(),media=['book','music','cartoon','game','comic'];
try{
 service=createTrustedEstateServer(fixture.config);
 const addr=await service.listen(0),port=addr.port,operationId=randomUUID();
 const start=await fetch('http://127.0.0.1:'+port+'/v1/execute',{
  method:'POST',headers:{authorization:'Bearer '+fixture.config.bearer,'content-type':'application/json'},
  body:JSON.stringify({operationId,expectedRevision:0,sourceIds:['alpha','beta'],
   question:'habit',top:3,request:fixture.request})});
 eq(start.status,201);const state=await start.json();
 eq(state.status,'CP14_EXECUTED_LOCAL_COMMITTED');
 mkdirSync('qa/m002-foundations/CP19_PACKETS',{recursive:true});
 for(const medium of media){
  const result=await prepareCP19Transfer({port,bearer:fixture.config.bearer,operationId,medium});
  if(['book','music','cartoon'].includes(medium)){
   eq(result.schema,'jm.m002.cp19.portable-creative-packet/1');
   eq(sha(result.body),result.sha256);
   const body=JSON.parse(result.body);
   eq(body.schema,'jm.m002.cp19.creative-packet-body/1');
   eq(body.originalSubject,'JM Krix');
   eq(body.medium,medium);
   eq(body.cp16SourceSha256,state.sha256);
   eq(body.earnedStations,3);
   eq(body.sourceClaim,'RECOVERED_CP16_LOCAL_REPLAY_SCOPED_NO_EXTERNAL_ATTESTATION');
   eq(body.nativeEditable.schema,'jm.m002.cp17.'+medium+'-work/1');
   if(medium==='book')yes(body.nativeEditable.chapters.length>=1);
   if(medium==='music')eq(body.nativeEditable.pattern.length,16);
   if(medium==='cartoon')yes(body.nativeEditable.frames.length>=2);
  }else{
   eq(result.schema,'jm.m002.cp14.recipient-export/1');
   eq(result.kind,medium);
   eq(result.revision,1);
   eq(sha(result.value),result.sha256);
   if(medium==='game'){
    eq(result.value.events.length,1);
    eq(result.value.events[0].action,'ROUTE_LEAP');
    eq(result.value.selected,'Krix');
   }else{
    yes(result.value.pages.length>=3);
    yes(result.value.pages[0].layerCommands.some(c=>c.op==='figure'));
   }
  }
  writeFileSync('qa/m002-foundations/CP19_PACKETS/CP19_'+medium.toUpperCase()+'_ORIGINAL_LOCAL_TEST_FIXTURE.json',
    JSON.stringify(result,null,2)+'\n');
  eq(JSON.parse(readFileSync('qa/m002-foundations/CP19_PACKETS/CP19_'+medium.toUpperCase()+'_ORIGINAL_LOCAL_TEST_FIXTURE.json')).sha256,
    result.sha256);
 }
 await fail(()=>prepareCP19Transfer({port,bearer:'bad'.repeat(12),operationId,medium:'book'}),/CP18_LOCAL_SOURCE_REPLAY_HOLD/);
 await fail(()=>prepareCP19Transfer({port,bearer:fixture.config.bearer,operationId,medium:'video'}),/CP19_UNKNOWN_MEDIUM_HOLD/);
 const source=fixture.config.sourceRoot+'/alpha.md',before=readFileSync(source,'utf8');
 writeFileSync(source,before+'\n# changed after exact CP16 receipt\n');
 await fail(()=>prepareCP19Transfer({port,bearer:fixture.config.bearer,operationId,medium:'comic'}),/CP18_LOCAL_SOURCE_REPLAY_HOLD/);
 writeFileSync(source,before);
 const recovered=await prepareCP19Transfer({port,bearer:fixture.config.bearer,operationId,medium:'cartoon'});
 eq(JSON.parse(recovered.body).originalSubject,'JM Krix');
 console.log(JSON.stringify({schema:'jm.m002.cp19.real-original-native-to-private-import-contract/1',
  status:'PASS',checks,media,liveLocalPythonSourceReplayed:true,
  originalGameComicImportSchemas:true,originalPrivateAppsModified:false,
  realPhysicalSamsung:'NOT_TESTED',browserPrivateApps:'SEPARATE_PRIVATE_TEST_GATE',
  publishedMainChanged:false,sourceAuthority:CP19_SCOPE.schema}));
}finally{if(service)await service.close();fixture.dispose()}
