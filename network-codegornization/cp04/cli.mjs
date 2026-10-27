// CP04 operator rail: Node 22+ (Termux/Android or laptop), credentials only from private files.
// NO internet, DNS, mailboxes or app permissions required. No key or payload in logs.
import fs from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
import {JMDurableSpool} from '../cp02/jm-durable-spool.mjs';
import {startDeviceReceiver,sendDeviceContact,createPacket,pairToken} from './jm-device-contact.mjs';
const fail=code=>{throw Object.assign(new Error(code),{code});};
const flags={};
for(let i=3;i<process.argv.length;i+=2){
  const k=process.argv[i];
  if(!/^--[a-z-]+$/.test(k)||!process.argv[i+1]||Object.hasOwn(flags,k))fail('ARGUMENT_INVALID');
  flags[k]=process.argv[i+1];
}
const opt=(name,required=true)=>{
  const v=flags['--'+name];
  if(required&&!v)fail('MISSING_'+name.toUpperCase().replaceAll('-','_'));
  return v;
};
async function token(){
  const file=opt('token'),st=await fs.lstat(file);
  if(!st.isFile()||st.isSymbolicLink()||(st.mode&0o077)!==0)fail('PAIR_FILE_PERMISSIONS_UNSAFE');
  return pairToken((await fs.readFile(file,'utf8')).trim());
}
async function main(){
  const cmd=process.argv[2];
  if(cmd==='pair'){
    const file=path.resolve(opt('out'));
    const h=await fs.open(file,'wx',0o600);
    try{await h.writeFile(randomBytes(32).toString('hex')+'\n');await h.sync();}
    finally{await h.close();}
    console.log(JSON.stringify({result:'PAIR_FILE_CREATED',path:file,mode:'0600',warning:'Transfer privately. Never commit or post this file.'}));
  }else if(cmd==='receive'){
    const bind=opt('bind'),port=Number(opt('port')),root=opt('root');
    const certPem=await fs.readFile(opt('cert'),'utf8'),keyPem=await fs.readFile(opt('key'),'utf8');
    const receiver=await startDeviceReceiver({root,token:await token(),certPem,keyPem,bind,port});
    console.log(JSON.stringify({result:'READY',protocol:'TLSv1.3',bind,port:receiver.port,
      sha256_certificate_pin:receiver.fingerprint,scope:'PRIVATE_IPV4_CANDIDATE',owner_contact:'HOLD'}));
    const close=async()=>{await receiver.close();process.exit(0);};
    process.once('SIGTERM',close);process.once('SIGINT',close);
  }else if(cmd==='send'){
    const host=opt('host'),port=Number(opt('port')),channel=opt('channel'),id=opt('id');
    if(flags['--message']&&flags['--message-file'])fail('CHOOSE_ONE_MESSAGE_SOURCE');
    const message=flags['--message-file']?await fs.readFile(flags['--message-file'],'utf8'):opt('message');
    const certPem=await fs.readFile(opt('cert'),'utf8');
    const r=await sendDeviceContact({host,port,token:await token(),certPem,pin:opt('pin'),
      packet:createPacket({id,channel,message})});
    console.log(JSON.stringify(r));
    if(r.status!==200||r.result!=='persisted')process.exitCode=2;
  }else if(cmd==='recover'){
    const r=await new JMDurableSpool(opt('root')).recover();
    // Privacy: output IDs, digests and native body names, NEVER stored plaintext.
    console.log(JSON.stringify({schema:'JM.CP04.LocalCustodyAudit/1',
      recordCount:r.records.length,records:r.records.map(x=>({id:x.id,channel:x.channel,
        originalBodies:Object.keys(x.receipt?.bodyProof||{})})),
      orphanPartials:r.orphanPartials,owner_physical_test:'HOLD_UNTIL_OWNER_RECEIPT'}));
  }else fail('USAGE_PAIR_RECEIVE_SEND_RECOVER');
}
main().catch(e=>{console.error('JM_CP04_HOLD:'+String(e.code||e.message||'UNKNOWN'));process.exitCode=1;});
