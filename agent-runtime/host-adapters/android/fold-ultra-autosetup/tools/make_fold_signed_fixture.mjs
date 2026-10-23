// Disposable-emulator ONLY. Generate a synthetic ECDSA-signed Living Home
// return bundle and separate independent key ID; never publish a private key.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
const dir=process.argv[2]||'emulator-proof';
fs.mkdirSync(dir,{recursive:true});
const canonical=v=>v===null||typeof v!=='object'?JSON.stringify(v):
  Array.isArray(v)?'['+v.map(canonical).join(',')+']':
  '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
const sha=x=>crypto.createHash('sha256').update(String(x)).digest('hex');
const kp=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const jwk=kp.publicKey.export({format:'jwk'}),keyId=sha(canonical(jwk)).slice(0,24);
const challenge='0123456789abcdef0123456789abcdef',mission='jmlh-native-signed-qa';
const text='SYNTHETIC_EMULATOR_SIGNED: transport receipt only';
const payload={schema:'JM.LivingHome.CloudReturn/1.0',missionId:mission,challenge,result:text};
const signedCore={schema:'jm.cloud-contact.signal-receipt/0.5',
spaceId:'qa_native_signed',signalId:991,requestId:'return:'+mission,
from:'receiver',to:'sender',kind:'JM_LIVING_HOME_RETURN',
at:'2026-10-23T12:00:00.000Z',payloadSha256:sha(canonical(payload))};
const receiptHash=sha(canonical(signedCore));
const publicSig=crypto.sign('sha256',Buffer.from(receiptHash),{
  key:kp.privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url');
const receipt={...signedCore,receiptHash,publicSig,publicKeyId:keyId,
  signatureAlgorithm:'ECDSA-P256-SHA256-P1363',
  claimBoundary:'Synthetic fixture only'};
const outgoing={schema:'JM.LivingHome.CloudMission/1.0',missionId:mission,
  challenge,project:'JM Games House',source:{id:'jm-games-house'}};
const row={missionId:mission,challenge,project:'JM Games House',
  state:'RETURN_RECEIVED_UNVERIFIED',returnSignalId:991,returnText:text,outgoing};
const evidence={schema:'JM.LivingHome.SignedReturnEvidence/1',
  status:'SERVER_RETURN_SIGNATURE_VERIFIED',origin:'https://qa-native.example',
  spaceId:'qa_native_signed',memberId:'sender',from:'receiver',missionId:mission,
  project:'JM Games House',sourceId:'jm-games-house',challenge,
  returnSignalId:991,signalReceiptHash:receiptHash,
  payloadSha256:signedCore.payloadSha256,publicKeyId:keyId};
const bundle={schema:'JM.LivingHome.NativeSignedReturnBundle/1',
  ledger:{schema:'JM.LivingHome.CP07.CloudReturn/1.0',missions:[row]},
  evidence,signedReceipt:receipt,signedPayload:payload,serverPublicJwk:jwk};
const save=(n,v)=>fs.writeFileSync(path.join(dir,n),JSON.stringify(v));
save('JM_SIGNED_NATIVE_BUNDLE_QA.json',bundle);
save('JM_SIGNED_NATIVE_TAMPER_QA.json',{...bundle,signedPayload:{...payload,result:'TAMPERED'}});
save('JM_SIGNED_NATIVE_SOURCE_QA.json',{...bundle,ledger:{...bundle.ledger,
  missions:[{...row,outgoing:{...outgoing,source:{id:'wrong-id'}}}]}});
fs.writeFileSync(path.join(dir,'JM_SIGNED_NATIVE_PIN_QA.txt'),keyId+'\n');
console.log(JSON.stringify({schema:'JM.FoldSignedFixture/1',scope:'SYNTHETIC_EMULATOR_ONLY',
  keyId,generatedFiles:4,privateKeyWritten:false}));
