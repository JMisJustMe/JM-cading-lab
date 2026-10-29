import fs from 'node:fs';
import {auditRegister,listCandidateContacts} from './influence-core.mjs';
import {executeNativeEvidenceContact} from './native-playform-contact.mjs';
const path=process.argv[2];
if(!path){console.error('Pass a LOCAL owner-owned register JSON path; do not commit the export.');process.exitCode=2;}
else {
  const register=JSON.parse(fs.readFileSync(path,'utf8'));
  const counts=auditRegister(register);
  const candidates=listCandidateContacts(register);
  const contact=candidates.length?executeNativeEvidenceContact(register,candidates[0].sourceTitle):null;
  console.log(JSON.stringify({schema:'jm.private-gaming-influence-probe/0.1',counts,
    candidateCount:candidates.length,candidateNames:candidates.map(x=>x.sourceTitle),
    nativeReceipt:contact?.nativeReceipt||null,
    privateExportStoredInRepo:false,
    gameRuntimeInvoked:false,rendererInvoked:false,gardlesInvoked:false},null,2));
}
