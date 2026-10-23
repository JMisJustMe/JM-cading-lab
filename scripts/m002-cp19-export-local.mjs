#!/usr/bin/env node
/**
 * CP19 local manually invoked export. First start the existing approved CP16
 * localhost host separately; no credentials or private owner content in repo.
 * Use an OUTSIDE-REPOSITORY directory, ideally an owner-only file vault.
 */
import {randomUUID} from 'node:crypto';
import {readFileSync,realpathSync,lstatSync,openSync,closeSync,writeSync,fsyncSync,linkSync,unlinkSync} from 'node:fs';
import {resolve,dirname,sep,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareCP19Transfer} from '../coding-estate/integration/m002-cp19-original-app-return.mjs';
const root=realpathSync(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
const port=Number(process.env.JM_CP16_LOCAL_PORT||18736);
const bearer=process.env.JM_CP16_LOCAL_BEARER,operationId=process.env.JM_CP19_OPERATION_ID;
const rawFolder=process.env.JM_CP19_EXPORT_DIR;
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
if(!Number.isInteger(port)||port<1025||port>65535||!bearer||bearer.length<32||
 !uuid.test(operationId||'')||typeof rawFolder!=='string'||!isAbsolute(rawFolder)||
 lstatSync(rawFolder).isSymbolicLink()||!lstatSync(rawFolder).isDirectory())
 throw Error('CP19_PRIVATE_EXPORT_SCOPE_HOLD');
const folder=realpathSync(rawFolder);
if(folder===root||folder.startsWith(root+sep))throw Error('CP19_NO_PRIVATE_EXPORT_IN_PUBLIC_REPOSITORY_HOLD');
const permitted=['book','music','cartoon','game','comic'];
const output={};
for(const kind of permitted){
 const result=await prepareCP19Transfer({port,bearer,operationId,medium:kind});
 const bytes=JSON.stringify(result,null,2)+'\n';
 if(Buffer.byteLength(bytes)>90000)throw Error('CP19_PACKET_LARGE_HOLD');
 const filename='JM_CP19_'+kind.toUpperCase()+'_RETURN_'+operationId+'.json';
 const file=resolve(folder,filename),tmp=file+'.'+randomUUID()+'.tmp';
 let fd;
 try{
  fd=openSync(tmp,'wx',0o600);writeSync(fd,bytes);fsyncSync(fd);closeSync(fd);fd=null;
  if(lstatSync(folder).isSymbolicLink()||realpathSync(folder)!==folder)
   throw Error('CP19_EXPORT_DIRECTORY_CHANGED_HOLD');
  try{linkSync(tmp,file)}catch{throw Error('CP19_EXPORT_EXISTING_FILE_HOLD')}
  unlinkSync(tmp);
  output[kind]={filename,bytes:Buffer.byteLength(bytes),digest:result.sha256};
 }finally{if(fd!==null&&fd!==undefined)closeSync(fd);try{unlinkSync(tmp)}catch{}}
}
console.log(JSON.stringify({status:'CP19_OWNER_MANUAL_EXPORT_COMPLETED',output,
 scope:'LOCAL CP16 AUTHENTICATED REPLAY; PRIVATE UNENCRYPTED JSON; MANUALLY IMPORT EACH FILE. DEVICE_NOT_PROVED'}));
