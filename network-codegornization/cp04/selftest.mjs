// CP04 bounded CI: real TLS v1.3 socket on localhost, independent child process and cold recovery.
// Loopback CI never claims physical Fold/laptop contact.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn,execFileSync} from 'node:child_process';
import https from 'node:https';
import tls from 'node:tls';
import {JMDurableSpool} from '../cp02/jm-durable-spool.mjs';
import {startDeviceReceiver,sendDeviceContact,createPacket,fingerprint,privateIPv4,normalizePin,pairToken} from './jm-device-contact.mjs';
const tests=[];
async function check(name,fn){
  try{await fn();tests.push({name,pass:true});}
  catch(e){tests.push({name,pass:false,error:String(e.code||e.message)});}
}
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'jm-cp04-'));
const store=path.join(temp,'custody'),certFile=path.join(temp,'cert.pem'),keyFile=path.join(temp,'key.pem'),tokenFile=path.join(temp,'pair.secret');
const key='a1'.repeat(32),badKey='b2'.repeat(32);
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-sha256','-nodes',
  '-keyout',keyFile,'-out',certFile,'-days','1','-subj','/CN=JM-CP04-LOCAL',
  '-addext','subjectAltName=IP:127.0.0.1'],{stdio:'ignore'});
const cert=await fs.readFile(certFile,'utf8'),privateKey=await fs.readFile(keyFile,'utf8');
await fs.writeFile(tokenFile,key+'\n',{mode:0o600,flag:'wx'});
let receiver=await startDeviceReceiver({root:store,token:key,certPem:cert,keyPem:privateKey,bind:'127.0.0.1',port:0});
const config=()=>({host:'127.0.0.1',port:receiver.port,token:key,certPem:cert,pin:receiver.fingerprint});
const packet=(id,channel='device',message='JM LOCAL TLS CONTACT FIXTURE')=>createPacket({id,channel,message});
let child;
try{
  await check('01 IPv4 receiver is loopback',()=>assert.equal(receiver.server.address().address,'127.0.0.1'));
  await check('02 genuine socket negotiates TLS13',async()=>await new Promise((resolve,reject)=>{
    const socket=tls.connect({host:'127.0.0.1',port:receiver.port,ca:cert,
      rejectUnauthorized:true,minVersion:'TLSv1.3',maxVersion:'TLSv1.3'},()=>{
      try{assert.equal(socket.getProtocol(),'TLSv1.3');socket.end();resolve();}
      catch(e){socket.destroy();reject(e);}
    });
    socket.once('error',reject);
  }));
  await check('03 certificate pin matches presented cert',()=>assert.equal(receiver.fingerprint,fingerprint(cert)));
  await check('04 pin colon form normalization',()=>assert.equal(normalizePin(receiver.fingerprint.match(/../g).join(':')),receiver.fingerprint));
  await check('05 real TLS device message reaches disk',async()=>{
    const r=await sendDeviceContact({...config(),packet:packet('device_101')});
    assert.equal(r.status,200);assert.equal(r.result,'persisted');assert.equal(r.scope,'PRIVATE_TLS13_TO_LOCAL_DISK');
  });
  await check('06 real TLS mail corridor remains sandbox custody',async()=>{
    assert.equal((await sendDeviceContact({...config(),packet:packet('mail_101','mail')})).status,200);
  });
  await check('07 real TLS storage corridor persisted',async()=>{
    assert.equal((await sendDeviceContact({...config(),packet:packet('storage_101','storage')})).status,200);
  });
  await check('08 recovered records include all corridors',async()=>{
    const a=await new JMDurableSpool(store).recover();
    assert.deepEqual(new Set(a.records.map(x=>x.channel)),new Set(['device','mail','storage']));
  });
  await check('09 persisted receipt invoked original RouteScript',async()=>{
    const a=await new JMDurableSpool(store).recover();
    assert.equal(a.records[0].receipt.bodyProof.RouteScript,'NetworkRoute:start');
  });
  await check('10 receipt omits user message contents',async()=>{
    const secret='SHOULD_NOT_ECHO_ONLY_TEST_DATA';
    const r=await sendDeviceContact({...config(),packet:packet('privacy_101','device',secret)});
    assert.equal(JSON.stringify(r).includes(secret),false);
  });
  await check('11 bad pin denied before transmit',async()=>{
    await assert.rejects(sendDeviceContact({...config(),pin:'00'.repeat(32),packet:packet('pinbad_101')}),{code:'CERTIFICATE_PIN_MISMATCH'});
    assert.equal((await new JMDurableSpool(store).recover()).records.some(x=>x.id==='pinbad_101'),false);
  });
  await check('12 bad pair token never persists',async()=>{
    await assert.rejects(sendDeviceContact({...config(),token:badKey,packet:packet('badkey_101')}),{code:'RESPONSE_SIGNATURE_INVALID'});
    assert.equal((await new JMDurableSpool(store).recover()).records.some(x=>x.id==='badkey_101'),false);
  });
  const replay=packet('replay_101');
  await check('13 first nonce is accepted',async()=>{
    assert.equal((await sendDeviceContact({...config(),packet:replay})).status,200);
  });
  await check('14 same signed packet replay is denied',async()=>{
    const r=await sendDeviceContact({...config(),packet:replay});
    assert.equal(r.status,401);assert.equal(r.reason,'NONCE_REPLAY');
  });
  await check('15 nonce survives actual receiver restart',async()=>{
    await receiver.close();
    receiver=await startDeviceReceiver({root:store,token:key,certPem:cert,keyPem:privateKey,bind:'127.0.0.1',port:0});
    const r=await sendDeviceContact({...config(),packet:replay});
    assert.equal(r.status,401);assert.equal(r.reason,'NONCE_REPLAY');
  });
  await check('16 fresh nonce with duplicate durable ID denied',async()=>{
    const r=await sendDeviceContact({...config(),packet:packet('device_101')});
    assert.equal(r.status,409);assert.equal(r.reason,'DUPLICATE_DURABLE_ID');
  });
  await check('17 stale signed timestamp denied',async()=>{
    const p=createPacket({id:'stale_101',channel:'device',message:'x'},{issuedAt:Date.now()-120000});
    const r=await sendDeviceContact({...config(),packet:p});assert.equal(r.reason,'TIMESTAMP_STALE');
  });
  await check('18 future signed timestamp denied',async()=>{
    const p=createPacket({id:'future_101',channel:'device',message:'x'},{issuedAt:Date.now()+120000});
    const r=await sendDeviceContact({...config(),packet:p});assert.equal(r.reason,'TIMESTAMP_STALE');
  });
  await check('19 public IP target disallowed before network',async()=>{
    await assert.rejects(sendDeviceContact({...config(),host:'8.8.8.8',packet:packet('pub_101')}),{code:'NUMERIC_PRIVATE_IPV4_REQUIRED'});
  });
  await check('20 DNS target disallowed before network',async()=>{
    await assert.rejects(sendDeviceContact({...config(),host:'example.com',packet:packet('dns_101')}),{code:'NUMERIC_PRIVATE_IPV4_REQUIRED'});
  });
  await check('21 wildcard server bind denied',async()=>{
    await assert.rejects(startDeviceReceiver({root:store,token:key,certPem:cert,keyPem:privateKey,bind:'0.0.0.0',port:0}),{code:'NUMERIC_PRIVATE_IPV4_REQUIRED'});
  });
  await check('22 strict private CIDRs only',()=>{
    assert.equal(privateIPv4('192.168.2.9'),true);assert.equal(privateIPv4('172.15.0.1'),false);
    assert.equal(privateIPv4('172.31.0.1'),true);assert.equal(privateIPv4('127.0.0.2'),false);
  });
  await check('23 short or human guessable pairing token rejected',()=>assert.throws(()=>pairToken('123456'),{code:'PAIR_TOKEN_REQUIRED_32_BYTES_HEX'}));
  await check('24 malformed pin rejected',()=>assert.throws(()=>normalizePin('not-a-pin'),{code:'CERTIFICATE_PIN_REQUIRED'}));
  await check('25 non-JSON packet envelope rejected',async()=>{
    await assert.rejects(sendDeviceContact({...config(),packet:null}),{code:'PACKET_REQUIRED'});
  });
  await check('26 out-of-range port rejected',async()=>{
    await assert.rejects(sendDeviceContact({...config(),port:65536,packet:packet('port_101')}),{code:'INVALID_PORT'});
  });
  await check('27 TLS1.2-only handshake cannot contact receiver',async()=>{
    await assert.rejects(new Promise((resolve,reject)=>{
      const req=https.request({hostname:'127.0.0.1',port:receiver.port,method:'POST',path:'/v1/contact',ca:cert,
        rejectUnauthorized:true,minVersion:'TLSv1.2',maxVersion:'TLSv1.2'},()=>resolve());
      req.on('error',reject);req.end();
    }));
  });
  await check('28 no plaintext in nonce custody files',async()=>{
    const files=await fs.readdir(path.join(store,'.cp04-nonces'));
    assert.ok(files.length>=5);
    assert.ok(files.every(x=>/^[a-f0-9]{64}\.seen$/.test(x)));
  });
  await check('29 independent Node receiver process receives authenticated TLS',async()=>{
    const childStore=path.join(temp,'child-custody');
    child=spawn(process.execPath,[path.join(import.meta.dirname,'cli.mjs'),'receive',
      '--root',childStore,'--bind','127.0.0.1','--port','0','--cert',certFile,
      '--key',keyFile,'--token',tokenFile],{stdio:['ignore','pipe','pipe']});
    let output='';
    const port=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('CHILD_READY_TIMEOUT')),9000);
      child.stdout.on('data',chunk=>{
        output+=chunk.toString();
        const line=output.split('\n').find(x=>x.startsWith('{"result":"READY"'));
        if(line){clearTimeout(timer);resolve(JSON.parse(line).port);}
      });
      child.once('error',reject);child.once('exit',code=>reject(new Error('CHILD_EXIT_'+code)));
    });
    const r=await sendDeviceContact({host:'127.0.0.1',port,token:key,certPem:cert,
      pin:fingerprint(cert),packet:packet('child_101')});
    assert.equal(r.status,200);
    assert.equal((await new JMDurableSpool(childStore).recover()).records[0].id,'child_101');
    child.kill('SIGTERM');await new Promise(ok=>child.once('exit',ok));child=null;
  });
  await check('30 original native ten preserved in child receipt',async()=>{
    const r=await new JMDurableSpool(path.join(temp,'child-custody')).recover();
    assert.equal(Object.keys(r.records[0].receipt.bodyProof).length,10);
  });
}finally{
  if(child)child.kill('SIGTERM');
  await receiver.close().catch(()=>{});
  await fs.rm(temp,{recursive:true,force:true});
}
const failed=tests.filter(t=>!t.pass);
console.log(JSON.stringify({schema:'JM.NetworkCP04.TLSDeviceCandidateTests/1',total:tests.length,passed:tests.length-failed.length,failed:failed.length,tests},null,2));
if(failed.length)process.exitCode=1;
