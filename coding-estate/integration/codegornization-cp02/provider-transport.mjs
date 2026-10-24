import {readFile,writeFile,mkdir,cp,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Journal} from './transactions.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const sourceSeal=sha(await readFile(new URL('./source-seal.json',import.meta.url)));
if(process.argv[2]==='produce'){
 const out=new URL('./provider-output/',import.meta.url);await mkdir(new URL('packets/',out),{recursive:true});const files={};
 for(const name of ['skyray','rootwarden','prismwisp']){const path='packets/'+name+'.json',bytes=await readFile(new URL('./godot/'+path,import.meta.url));files[path]=sha(bytes);await writeFile(new URL(path,out),bytes)}
 const seal=await readFile(new URL('./godot/SourceSeal.gd',import.meta.url));files['SourceSeal.gd']=sha(seal);await writeFile(new URL('SourceSeal.gd',out),seal);
 await writeFile(new URL('manifest.json',out),JSON.stringify({schema:'jm.provider.transport/2',sourceSeal,files,scope:'GitHub artifact transfer integrity; not independent sender identity'},null,2));
}else{
 const input=new URL('./provider-input/',import.meta.url),manifest=JSON.parse(await readFile(new URL('manifest.json',input),'utf8'));
 if(manifest.sourceSeal!==sourceSeal)throw Error('PROVIDER_SOURCE_DRIFT');
 for(const [path,digest] of Object.entries(manifest.files)){
  if(!['SourceSeal.gd','packets/skyray.json','packets/rootwarden.json','packets/prismwisp.json'].includes(path))throw Error('PROVIDER_PATH_HOLD');
  const bytes=await readFile(new URL(path,input));if(sha(bytes)!==digest)throw Error('PROVIDER_BYTES_DRIFT');
  if(path.endsWith('.json')){const e=JSON.parse(bytes),p=JSON.parse(e.payload);if(sha(e.payload)!==e.payloadSHA256)throw Error('PAYLOAD_HASH');Journal.recover(p.journal,sourceSeal)}
  await writeFile(new URL('./godot/'+path,import.meta.url),bytes);
 }
 console.log('Independent provider job: exact transferred source packets reexecuted and admitted');
}
