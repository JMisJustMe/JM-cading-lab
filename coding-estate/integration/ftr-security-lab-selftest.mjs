import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {auditOwnedLoopback,reviewOwnedShodanHost} from './ftr-security-lab.mjs';
let pass=0;
const test=async(name,fn)=>{await fn();pass++;console.log('PASS',name);};
const refuses=async(fn,code)=>assert.rejects(fn,e=>e.code===code);
await test('Local scope refuses nonlocal host',async()=>refuses(()=>auditOwnedLoopback({url:'http://example.org',authorised:true}),'NOT_LOOPBACK_HTTP'));
await test('Local scope requires authority',async()=>refuses(()=>auditOwnedLoopback({url:'http://127.0.0.1',authorised:false}),'LOCAL_AUTH_REQUIRED'));
const server=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/plain','X-Content-Type-Options':'nosniff'});res.end('JM FTR authorised local lab');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
try{
 const address=server.address();
 await test('Genuine local service gets inspected',async()=>{const result=await auditOwnedLoopback({url:'http://127.0.0.1:'+address.port,authorised:true});assert.equal(result.status,200);assert.equal(result.target,'LOOPBACK_ONLY');assert.equal(result.exploited,false);});
 await test('Missing CSP labelled config review',async()=>{const result=await auditOwnedLoopback({url:'http://127.0.0.1:'+address.port,authorised:true});assert(result.findings.includes('MISSING_CONTENT_SECURITY_POLICY'));assert.equal(result.severity,'CONFIGURATION_REVIEW_NOT_VULNERABILITY_PROOF');});
}finally{await new Promise(r=>server.close(r));}
await test('Shodan rejects unowned host',async()=>refuses(()=>reviewOwnedShodanHost({ip:'203.0.113.44',ownedIPs:['192.0.2.5'],authorised:true,apiKey:'unit-fixture'}),'SHODAN_UNOWNED_OR_INVALID_IP'));
await test('Shodan rejects unauthorised inquiry',async()=>refuses(()=>reviewOwnedShodanHost({ip:'192.0.2.5',ownedIPs:['192.0.2.5'],authorised:false,apiKey:'unit-fixture'}),'SHODAN_AUTH_REQUIRED'));
await test('Shodan offline API fixture redacts key',async()=>{
 let requested;
 const fetchImpl=async url=>{requested=url;return {ok:true,json:async()=>({ip_str:'192.0.2.5',data:[{port:23,transport:'tcp',_shodan:{module:'telnet'}}]})}};
 const result=await reviewOwnedShodanHost({ip:'192.0.2.5',ownedIPs:['192.0.2.5'],authorised:true,apiKey:'TEST_SECRET_VALUE',fetchImpl});
 assert(requested.startsWith('https://api.shodan.io/shodan/host/192.0.2.5'));
 assert(!JSON.stringify(result).includes('TEST_SECRET_VALUE'));assert.equal(result.services[0].review,'PRIORITY_PORT_REVIEW');assert.equal(result.activeProbe,false);
});
await test('Shodan forged payload refused',async()=>refuses(()=>reviewOwnedShodanHost({ip:'192.0.2.5',ownedIPs:['192.0.2.5'],authorised:true,apiKey:'fake',fetchImpl:async()=>({ok:true,json:async()=>({ip_str:'other',data:[]})})}),'SHODAN_PAYLOAD_SCOPE'));
console.log(JSON.stringify({schema:'jm.ftr.security-lab-proof/1',passed:pass,failed:0,proof:'GitHub Actions loopback GET and fake Shodan API only; no external network scanning or installed Parrot/NetHunter'}));
