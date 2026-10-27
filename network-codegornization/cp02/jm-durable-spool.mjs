/**
 * JM Network CP02 — local durable spool, not internet delivery.
 * Imports CP01's actual native route consequence. No providers or credentials.
 * Disk payloads are PLAINTEXT: do not use for secrets or real personal mail.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { JMNetworkFederation, validateEnvelope } from '../cp01/jm-network-federation.mjs';

const sha256=s=>createHash('sha256').update(s).digest('hex');
const goodId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{3,64}$/.test(id);
const spoolError=(code)=>Object.assign(new Error(code),{code});
const isCorrupt=e=>e?.code==='CORRUPT_SPOOL';
const fileFor=(root,id)=>path.join(root,id+'.jmq');

export class JMDurableSpool {
  constructor(root){if(typeof root!=='string'||!root.trim())throw new TypeError('SPOOL_ROOT_REQUIRED');this.root=path.resolve(root);}
  async prepare(){
    await fs.mkdir(this.root,{recursive:true,mode:0o700});
    const stat=await fs.lstat(this.root);
    if(!stat.isDirectory()||stat.isSymbolicLink())throw spoolError('UNSAFE_SPOOL_DIRECTORY');
    if((stat.mode&0o077)!==0)throw spoolError('PERMISSIONS_TOO_BROAD');
    return this.root;
  }
  async has(id){if(!goodId(id))throw new TypeError('INVALID_ID');await this.prepare();
    try{await fs.lstat(fileFor(this.root,id));return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}
  }
  async persist(entry,receipt){
    await this.prepare();
    if(!goodId(entry?.id)||!['mail','device','storage'].includes(entry.channel)||entry.carrier!=='local-memory-queue'||typeof entry.payload!=='string')throw spoolError('INVALID_QUEUE_ENTRY');
    if(receipt?.result!=='queued'||receipt.id!==entry.id||receipt.channel!==entry.channel)throw spoolError('RECEIPT_MISMATCH');
    const payload={schema:'JM.NetworkSpool/0.1',id:entry.id,channel:entry.channel,body:entry.payload,receipt};
    const raw=JSON.stringify(payload);
    if(Buffer.byteLength(raw)>32768)throw spoolError('RECORD_TOO_LARGE');
    const stored=JSON.stringify({sha256:sha256(raw),payload});
    const target=fileFor(this.root,entry.id),temp=path.join(this.root,'.'+entry.id+'.'+randomUUID()+'.partial');
    let handle;
    try {
      handle=await fs.open(temp,'wx',0o600);
      await handle.writeFile(stored);await handle.sync();await handle.close();handle=null;
      await fs.link(temp,target); // hard-link creates final name only when absent
      const directory=await fs.open(this.root,'r');try{await directory.sync();}finally{await directory.close();}
      return {id:entry.id,scope:'LOCAL_DISK_ONLY',sha256:sha256(raw),persisted:true};
    } catch(e) {
      if(e.code==='EEXIST')throw spoolError('DUPLICATE_DURABLE_ID');
      throw e;
    } finally {
      if(handle)await handle.close();
      await fs.rm(temp,{force:true}).catch(()=>{});
    }
  }
  async recover(){
    await this.prepare();
    const entries=await fs.readdir(this.root);
    const records=[],partial=entries.filter(x=>x.endsWith('.partial'));
    for(const name of entries.filter(x=>x.endsWith('.jmq')).sort()){
      const id=name.slice(0,-4);
      if(!goodId(id))throw spoolError('INVALID_DISK_NAME');
      const st=await fs.lstat(path.join(this.root,name));
      if(!st.isFile()||st.isSymbolicLink()||st.size>32768)throw spoolError('UNSAFE_DISK_RECORD');
      let parsed;
      try{parsed=JSON.parse(await fs.readFile(path.join(this.root,name),'utf8'));}catch{throw spoolError('CORRUPT_SPOOL');}
      const payload=parsed?.payload,raw=JSON.stringify(payload);
      if(parsed?.sha256!==sha256(raw)||payload?.schema!=='JM.NetworkSpool/0.1'||payload?.id!==id||
          !['mail','device','storage'].includes(payload.channel)||typeof payload.body!=='string'||
          payload.receipt?.id!==id||payload.receipt?.channel!==payload.channel||payload.receipt?.result!=='queued')
        throw spoolError('CORRUPT_SPOOL');
      records.push(payload);
    }
    return {schema:'JM.NetworkSpoolRecovery/0.1',records,orphanPartials:partial.length,scope:'LOCAL_DISK_ONLY'};
  }
}
export class JMDurableNetwork {
  constructor(root){this.memory=new JMNetworkFederation();this.spool=new JMDurableSpool(root);}
  async accept(raw){
    const envelope=validateEnvelope(raw);
    if(await this.spool.has(envelope.id))return {id:envelope.id,result:'denied',reason:'DUPLICATE_DURABLE_ID',scope:'LOCAL_DISK_ONLY'};
    const receipt=this.memory.process(envelope);
    if(receipt.result!=='queued')return {...receipt,persisted:false};
    const entry=this.memory.snapshot().outbox.find(x=>x.id===envelope.id);
    try{
      const durable=await this.spool.persist(entry,receipt);
      return {...receipt,durable,persisted:true};
    }catch(e){
      return {id:envelope.id,result:'hold',reason:e.code||'DURABLE_WRITE_FAILED',persisted:false,
        boundary:'Memory queue is not evidence of durable delivery.'};
    }
  }
}
