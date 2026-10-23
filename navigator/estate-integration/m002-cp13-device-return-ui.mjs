// CP13 additive controls inside the EXISTING JM Native Operator page.
// Manual file transport only. No device telemetry, remote writes or new door.
import {makeCP13Portable,inspectCP13Portable,receiveCP13Portable}
 from './m002-cp13-device-return.mjs';
import {recoverLocalReturn} from './return-checkpoint.mjs';
function mount(){
 const panel=document.getElementById('jmDeviceReturn');if(!panel)return;
 const $=id=>document.getElementById(id);
 const status=s=>$('jmTransferStatus').textContent=s;
 let held=null;
 const audit=(kind,value)=>window.JMEstateIntegration?.receipt?.(
  'native.operator.device-transfer-'+kind,{scope:'manual-local-file',
   state:value,source:'JM CP13 device carrier'});
 async function receive(file,approval=false){
  if(!file||file.size>450000)throw Error('CP13_FILE_SIZE_HOLD');
  const text=await file.text();let packet;
  try{packet=JSON.parse(text)}catch{throw Error('CP13_IMPORT_NOT_JSON_HOLD')}
  const inspected=await inspectCP13Portable(packet);
  let options={};
  if(approval){
   const current=await recoverLocalReturn(localStorage);
   if(!confirm('Replace this browser’s current saved JM operator return? Existing return will not be kept in this slot. Export it first to preserve it.')){
    throw Error('CP13_OWNER_REPLACEMENT_DECLINED');
   }
   options={allowReplace:true,expectedCurrentSha256:current.sha256};
  }
  try{
   const imported=await receiveCP13Portable(localStorage,packet,options);
   held=null;$('jmTransferReplace').hidden=true;
   status(imported.status+' · '+inspected.project+' · Source '+inspected.origin+
    ' · revision '+inspected.revision+' · SHA '+imported.envelopeSha256.slice(0,16)+
    '…\nProject carrier saved on THIS browser only. CP12 exchange is transported but NOT auto-applied to game/comic recipients.');
   if(inspected.containsOperator)$('jmOperatorRecover')?.click();
   audit('import',imported.status);
  }catch(e){
   if(String(e.message).includes('CP13_CONFLICT_REVIEW_REQUIRED_HOLD')){
    held=file;$('jmTransferReplace').hidden=false;
    status('CONFLICT HOLD — A different verified operator return already exists in this browser.'+
      '\nExport the existing return first. Only explicit reviewed replacement can continue.');
    audit('conflict','HOLD');
    return;
   }
   throw e;
  }
 }
 $('jmTransferExport').addEventListener('click',async()=>{
  try{
   const saved=await recoverLocalReturn(localStorage);
   const packet=await makeCP13Portable({
    project:$('jmTransferProject').value.trim(),origin:$('jmTransferDevice').value.trim(),
    revision:1,returnValue:saved.value});
   const blob=new Blob([JSON.stringify(packet,null,2)+'\n'],{type:'application/json'});
   const url=URL.createObjectURL(blob),anchor=document.createElement('a');
   anchor.href=url;anchor.download='JM_CP13_OPERATOR_PROJECT_TRANSFER.json';
   document.body.append(anchor);anchor.click();anchor.remove();
   setTimeout(()=>URL.revokeObjectURL(url),2000);
   status('EXPORT CREATED · SHA '+packet.sha256+' · Operator return saved earlier, file ready for explicit transfer. No cloud/device sending occurred.');
   audit('export','LOCAL_FILE_CREATED');
  }catch(e){status('EXPORT HOLD · '+String(e.message||e))}
 });
 $('jmTransferImport').addEventListener('click',()=>{
  $('jmTransferFile').value='';$('jmTransferFile').click();
 });
 $('jmTransferFile').addEventListener('change',async()=>{
  try{held=null;$('jmTransferReplace').hidden=true;await receive($('jmTransferFile').files[0]);}
  catch(e){status('IMPORT HOLD · '+String(e.message||e));audit('import','HOLD')}
 });
 $('jmTransferReplace').addEventListener('click',async()=>{
  try{if(!held)throw Error('CP13_NOTHING_TO_REVIEW');await receive(held,true);}
  catch(e){status('REVIEW HOLD · '+String(e.message||e))}
 });
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
}
