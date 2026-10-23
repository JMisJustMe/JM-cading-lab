#!/usr/bin/env node
// CP16 LOCAL LAUNCHER — no public network, GitHub token, Render deploy, or
// embedded owner data. Configure only with a private owner-held local file.
import {readFileSync,statSync,realpathSync,lstatSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {assembleRegistry} from '../navigator/estate-integration/native-operator.mjs';
import {createTrustedEstateServer} from '../coding-estate/integration/m002-cp16-trusted-host.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const configPath=process.env.JM_CP16_LOCAL_CONFIG;
if(!configPath||!resolve(configPath).startsWith('/')||
 lstatSync(configPath).isSymbolicLink()||!statSync(configPath).isFile())
 throw Error('CP16_PRIVATE_CONFIG_REQUIRED');
if(process.platform!=='win32'&&(statSync(configPath).mode & 0o077))
 throw Error('CP16_PRIVATE_CONFIG_PERMISSIONS_0600_REQUIRED');
const read=JSON.parse(readFileSync(configPath,'utf8'));
if(!read||Object.keys(read).some(k=>!['stateFile','sourceRoot','sources','receivers','mesh'].includes(k)))
 throw Error('CP16_PRIVATE_CONFIG_FIELDS_HOLD');
const manifest=JSON.parse(readFileSync(root+'/coding-estate/integration/REGISTRY.json','utf8'));
const parts=manifest.parts.map(p=>JSON.parse(readFileSync(root+'/coding-estate/integration/'+p,'utf8')));
const registry=assembleRegistry(manifest,parts);
const port=Number(process.env.JM_CP16_LOCAL_PORT||18736);
if(!Number.isSafeInteger(port)||port<1025||port>65535)throw Error('CP16_PORT_BOUNDARY_HOLD');
const server=createTrustedEstateServer({...read,registry,
 bearer:process.env.JM_CP16_LOCAL_BEARER,
 sealKey:process.env.JM_CP16_LOCAL_SEAL,
 host:'127.0.0.1'});
await server.listen(port);
console.log(JSON.stringify({state:'CP16_LOCAL_TRUSTED_HOST_READY',
 host:'127.0.0.1',port,sourceIds:server.sourceIds,
 scope:'OWNER_CONTROLLED_LOCAL_ONLY_UNDEPLOYED'}));
const close=()=>server.close().finally(()=>process.exit(0));
process.once('SIGINT',close);process.once('SIGTERM',close);
