// JM CP11: independently pinned CP10 ciphertext copied to an explicit DIFFERENT
// filesystem with exclusive write, fsync, readback and a subsequent new-process check.
// This is NOT automatically an off-site, durable, owner-controlled or cloud backup.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
import {inspectCoordinatedCheckpoint} from './coordinated-checkpoint.mjs';
const h=b=>crypto.createHash('sha256').update(b).digest('hex');
const insist=(x,s)=>{if(!x)throw Error('CP11_'+s)};
function safe(loc){insist(typeof loc==='string'&&loc.trim().length>0,'PATH_REQUIRED');const p=path.resolve(loc),root=path.parse(p).root;let c=root;for(const part of p.slice(root.length).split(path.sep)){if(!part)continue;c=path.join(c,part);try{insist(!fs.lstatSync(c).isSymbolicLink(),'SYMLINK_REFUSED')}catch(e){if(e.code==='ENOENT')break;throw e}}return p}
function requireExternalDirectory(dir){const p=safe(dir),s=fs.lstatSync(p);insist(s.isDirectory()&&!s.isSymbolicLink(),'TARGET_IS_NOT_DIRECTORY');if(process.platform!=='win32'){
insist((s.mode&0o077)===0,'EXTERNAL_MOUNT_DIR_MUST_BE_PRIVATE');insist(s.uid===process.getuid(),'EXTERNAL_MOUNT_DIR_NOT_OWNED')};return{path:p,dev:s.dev}}
function readArchive(file){const p=safe(file),s=fs.lstatSync(p);insist(s.isFile()&&!s.isSymbolicLink()&&s.size>0&&s.size<=470*1024*1024&&s.nlink===1,'ARCHIVE_UNSAFE');const bytes=fs.readFileSync(p);return{file:p,bytes,sha256:h(bytes),dev:s.dev}}
function writeNew(dir,filename,data){const p=safe(path.join(dir,filename));insist(path.dirname(p)===dir,'PATH_ESCAPE');const fd=fs.openSync(p,'wx',0o600);try{fs.writeFileSync(fd,data);fs.fsyncSync(fd)}finally{fs.closeSync(fd)}const d=fs.openSync(dir,'r');try{fs.fsyncSync(d)}finally{fs.closeSync(d)}return p}
export function publishToIndependentFilesystem({sealedFile,targetDirectory,expectedSha256}){
insist(typeof expectedSha256==='string'&&/^[a-f0-9]{64}$/.test(expectedSha256),'INDEPENDENT_PIN_REQUIRED');
const src=readArchive(sealedFile),dir=requireExternalDirectory(targetDirectory);
insist(src.sha256===expectedSha256,'PIN_MISMATCH');insist(src.dev!==dir.dev,'DIFFERENT_FILESYSTEM_REQUIRED');
const structure=inspectCoordinatedCheckpoint({sealedFile:src.file});insist(structure.sealedSha256===expectedSha256,'ARCHIVE_READBACK_HOLD');
const filename=`JM_CP10_${structure.checkpointId}_${expectedSha256}.sealed`;const dest=path.join(dir.path,filename);
insist(!fs.existsSync(dest),'EXTERNAL_ARCHIVE_ALREADY_EXISTS');
const copied=writeNew(dir.path,filename,src.bytes);
const out=readArchive(copied);insist(out.dev===dir.dev&&out.sha256===expectedSha256&&out.bytes.length===src.bytes.length,'EXTERNAL_BYTE_READBACK_FAILED');
return{ok:true,scope:'DISTINCT_FILESYSTEM_COPY_AND_FSYNC_READBACK',checkpointId:structure.checkpointId,sealedSha256:expectedSha256,bytes:out.bytes.length,sourceDevice:src.dev,targetDevice:dir.dev,filename,limits:['NOT_OFFSITE','NOT_PERSISTENT_RETENTION','NOT_OWNER_MEDIA_VALIDATED','NOT_OWNER_KEY_CUSTODY','NOT_PG_RESTORE','NO_AUTOMATIC_DEPLOYMENT']};
}
export function verifyIndependentFilesystem({sealedFile,targetDirectory,expectedSha256}){
insist(typeof expectedSha256==='string'&&/^[a-f0-9]{64}$/.test(expectedSha256),'INDEPENDENT_PIN_REQUIRED');const t=requireExternalDirectory(targetDirectory),archive=readArchive(sealedFile);insist(path.dirname(archive.file)===t.path,'NOT_IN_EXPECTED_EXTERNAL_DIRECTORY');insist(archive.dev===t.dev,'DEVICE_MISMATCH');insist(archive.sha256===expectedSha256,'EXTERNAL_ARCHIVE_TAMPERED');const i=inspectCoordinatedCheckpoint({sealedFile:archive.file});insist(i.sealedSha256===expectedSha256,'ARCHIVE_READBACK_HOLD');return{ok:true,scope:'EXISTING_INDEPENDENT_FILESYSTEM_NEW_PROCESS_READBACK',checkpointId:i.checkpointId,sealedSha256:expectedSha256,bytes:archive.bytes.length,targetDevice:t.dev,claimBoundary:'Separate filesystem only. Persistence, owner control, physical remoteness and third-party storage are independently unproved.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
try{const [action,a,b,c]=process.argv.slice(2);if(action==='publish')console.log(JSON.stringify(publishToIndependentFilesystem({sealedFile:a,targetDirectory:b,expectedSha256:c})));else if(action==='verify')console.log(JSON.stringify(verifyIndependentFilesystem({sealedFile:a,targetDirectory:path.dirname(path.resolve(a)),expectedSha256:b})));else throw Error('CP11_USAGE publish <new-checkpoint.sealed> <existing-owner-specified-private-external-directory> <independently-known-sha256> | verify <existing-copy> <trusted-sha256>');}catch(e){console.error(e.message);process.exitCode=1}}
