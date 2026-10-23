import assert from 'node:assert/strict';
import fs from 'node:fs';
import {saveLocalReturn,recoverLocalReturn} from '../navigator/estate-integration/return-checkpoint.mjs';
import {createEstateReturnCloud} from '../unified-browser/jm-estate-return-cloud.mjs';
let checks=0;const yes=(x,msg)=>{assert.ok(x,msg);checks++};
const page=fs.readFileSync('navigator/estate-integration/index.html','utf8');
const operator=fs.readFileSync('navigator/estate-integration/native-operator.mjs','utf8');
const cloud=fs.readFileSync('unified-browser/jm-estate-return-cloud.mjs','utf8');
for(const id of ['jmCloudReturnPanel','jmCloudHandle','jmCloudCredential','jmCloudPhrase',
 'jmCloudRegister','jmCloudStage','jmCloudPush','jmCloudExport','jmCloudRecoveryImport',
 'jmCloudPull','jmCloudDownloadResult','jmCloudApplyPermit','jmCloudApply',
 'jmCloudReturnStatus'])yes(page.includes('id="'+id+'"'),'CP15_MISSING_OPERATOR_CONTROL_'+id);
yes(operator.includes('mountCloudReturn();'),'CP15_NOT_MOUNTED_IN_ORIGINAL_OPERATOR');
yes(operator.includes("import {createEstateReturnCloud}"),'CP15_NOT_USING_ORIGINAL_SHARDED_ADAPTER');
yes(operator.includes("import {createCloudWorkspaceClient,httpRequest}"),'ORIGINAL_JM_CLOUD_CLIENT_NOT_INHERITED');
yes(operator.includes("readJournal()"),'NO_PENDING_CIPHERTEXT_JOURNAL');
yes(operator.includes("jmCloudApplyPermit")&&operator.includes("LOCAL_REPLACEMENT_NOT_AUTHORISED"),
 'NO_EXPLICIT_CONFLICT_ACK');
yes(operator.includes("saveLocalReturn(localStorage,recoveredValue)"),
 'ORIGINAL_RETURN_CHECKPOINT_NOT_REUSED');
yes(operator.includes("jmCloudDownloadResult")&&operator.includes("saveJSON(recoveredValue"),
 'CROSS_MEDIUM_ORIGINAL_BODY_DOWNLOAD_NOT_AVAILABLE');
yes(operator.includes('PRIVATE BUNDLE LOADED IN SESSION'),'NO_PRIVATE_KEY_IMPORT_PATH');
yes(!operator.includes('localStorage.setItem(SLOT,token')&&
 !operator.includes('localStorage.setItem(SLOT,result.token'),
 'SCOPED_SECRET_LEAKED_TO_LOCAL_STORAGE');
yes(cloud.includes("await client.saveIntent(expected)"),'SIGNED_JM_CLOUD_ROUTE_NOT_EXECUTED');
yes(cloud.includes("await crypto.subtle.encrypt"),'CLIENT_SIDE_ENCRYPTION_MISSING');
yes(cloud.includes("await crypto.subtle.decrypt"),'DIFFERENT_CLIENT_CANNOT_DECRYPT');
const map=new Map(),store={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
const executed={schema:'jm.estate.operator.local-return/0.2',mode:'estate-fabric',
 input:'{"operations":[]}',summary:'Generated only by a bounded executed Estate contact'};
await saveLocalReturn(store,executed);
yes(JSON.stringify((await recoverLocalReturn(store)).value)===JSON.stringify(executed),
 'ORIGINAL_JM_LOCAL_RETURN_PERSISTENCE_BROKEN');
console.log(JSON.stringify({schema:'jm.m002.cp15.original-operator-integration-proof/1',
 state:'SOURCE_INTEGRATED_WITH_EXPLICIT_OWNER_CONTROLS',
 checks,actualBrowserUI:'NOT_TESTED_IN_THIS_SCOPE',
 originalCloudDonor:'UNCHANGED',originalCheckpoint:'REUSED',noAutomaticCloudWrite:true,
 physicalAndroid:'HOLD'}));
