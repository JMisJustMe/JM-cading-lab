'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');const G=require('../gong_scope_request_cp04.js');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function receipt(overall){const a={schema:'JM_GONG_CP03_READONLY_ADVISORY_v1',base:'a'.repeat(40),head:'b'.repeat(40),changedFileCount:1,changedFiles:[{path:'app/index.html',priority:overall,changes:[overall==='DIRECT_CHANGED_SCOPE'?'touch_routing':'styling'],physicalFoldTestPerformed:false,devicePassClaimed:false}],overall,governance:{ownerDevicePassClaimed:false}};return {...a,digest:hash(JSON.stringify(a))};}
for(const [mode,expect] of [['LOCAL_CHECK','LOCAL_REGRESSION_PLUS_EVIDENCE_LOOKUP'],['HOLD_TRIAGE','TRIAGE_UNKNOWN'],['DIRECT_CHANGED_SCOPE','FRESH_SCOPED_CONTACT'],['INHERITED_UNCHANGED','EVIDENCE_LOOKUP_ELIGIBLE'],['NO_APPLICABLE_CODE_CHANGE','NO_SOURCE_SCOPE']])test('advisory '+mode,()=>{const x=G.request(receipt(mode));assert.equal(x.recommendedNext,expect);assert.equal(x.descendantFoldPass,false);assert.equal(x.formallyInheritedEvidence,false);assert(G.verify(x));});
test('tampered digest blocks',()=>{let x=receipt('LOCAL_CHECK');x.overall='INHERITED_UNCHANGED';assert.throws(()=>G.request(x))});
test('device pass forged in advisory blocks',()=>{let x=receipt('LOCAL_CHECK');x.changedFiles[0].devicePassClaimed=true;const {digest,...body}=x;x.digest=hash(JSON.stringify(body));assert.throws(()=>G.request(x))});
test('device action never required by default',()=>assert.equal(G.request(receipt('DIRECT_CHANGED_SCOPE')).ownerAction,'NONE_BY_DEFAULT'));
test('bad scope rejected',()=>assert.throws(()=>G.request(receipt('BAD_MODE'))));
test('public private-source flag stays false',()=>assert.equal(G.request(receipt('LOCAL_CHECK')).privateRegistrySupplied,false));
test('result digest modification detected',()=>{let r=G.request(receipt('LOCAL_CHECK'));r.nextAction='MADE_UP';assert(!G.verify(r))});