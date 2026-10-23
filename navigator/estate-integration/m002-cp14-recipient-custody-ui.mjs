// Additive CP14 receiver custody INSIDE the existing JM Native Operator page.
// Typed JM CP11 recipient state only. Does not silently mutate private
// FIVE//FLIP browser gameplay or Comic Atelier illustrations.
import {registerCP14Original,inspectCP14RecipientReturn,applyCP14RecipientReturn,
 exportCP14Recipient} from './m002-cp14-recipient-custody.mjs';
const $=id=>document.getElementById(id);
function mount(){
 if(!$('jmCP14RecipientReturn'))return;
 const status=s=>$('jmCP14Status').textContent=s;
 let review=null;
 const signal=(state,detail='')=>window.JMEstateIntegration?.receipt?.('native.operator.cp14-recipient',{
  state,source:'JM CP14 typed recipient custody',detail:String(detail).slice(0,180)});
 const file=(name,value)=>{
  const blob=new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1800);
 };
 $('jmCP14Register').addEventListener('click',()=>{
  $('jmCP14BaselineFile').value='';$('jmCP14BaselineFile').click();
 });
 $('jmCP14BaselineFile').addEventListener('change',async()=>{
  review=null;$('jmCP14Commit').disabled=true;
  try{
   const source=$('jmCP14BaselineFile').files[0];
   if(!source||source.size>260000)throw Error('CP14_BASELINE_SIZE_HOLD');
   let parsed;try{parsed=JSON.parse(await source.text())}catch{throw Error('CP14_BASELINE_INVALID_JSON_HOLD')}
   const result=await registerCP14Original(localStorage,{game:parsed.game,comic:parsed.comic});
   status(result.status+'\nGAME SHA '+result.gameSha256+'\nCOMIC SHA '+result.comicSha256+
    '\nOriginal typed snapshots registered. No imported changes applied.');
   signal('REGISTERED_WITH_READBACK');
  }catch(e){status('BASELINE HOLD · '+String(e.message||e));signal('BASELINE_HOLD',e.message)}
 });
 $('jmCP14Preview').addEventListener('click',async()=>{
  review=null;$('jmCP14Commit').disabled=true;
  try{
   const kind=$('jmCP14Kind').value;
   const result=await inspectCP14RecipientReturn(localStorage,kind);
   review={kind,token:result.reviewToken,source:result.sourceSha256};
   $('jmCP14Commit').disabled=false;
   status('REVIEW ONLY · '+kind.toUpperCase()+'\nChoice '+result.choice+
    ' · Actor '+result.subject+'\nChanges:\n'+JSON.stringify(result.changes,null,2)+
    '\nBaseline '+result.originSha256+'\nNew '+result.targetSha256+
    '\nNo file or app was modified. Explicit approval is required.');
   signal('REVIEW_ONLY',kind);
  }catch(e){status('PREVIEW HOLD · '+String(e.message||e));signal('PREVIEW_HOLD',e.message)}
 });
 $('jmCP14Kind').addEventListener('change',()=>{review=null;$('jmCP14Commit').disabled=true});
 $('jmCP14Commit').addEventListener('click',async()=>{
  try{
   if(!review||review.kind!==$('jmCP14Kind').value)throw Error('CP14_REVIEW_REQUIRED_HOLD');
   if(!confirm('Apply this reviewed CP12 change to the local typed '+review.kind+
     ' recipient? Existing state will be replaced in this one recipient slot.'))return;
   const result=await applyCP14RecipientReturn(localStorage,review.kind,review.token,{approve:true});
   review=null;$('jmCP14Commit').disabled=true;
   status(result.status+'\n'+result.kind+' · revision '+result.revision+
    '\nSource '+result.sourceSha256+'\nRecipient '+result.recipientSha256+
    '\nNew typed state is saved and recoverable here; the private original game or comic application has NOT been directly updated.');
   signal('APPLIED_READBACK',result.kind);
  }catch(e){status('APPLY HOLD · '+String(e.message||e));signal('APPLY_HOLD',e.message)}
 });
 $('jmCP14Export').addEventListener('click',async()=>{
  try{
   const kind=$('jmCP14Kind').value;
   const x=await exportCP14Recipient(localStorage,kind);
   file('JM_CP14_'+kind.toUpperCase()+'_TYPED_RETURN.json',x);
   status('TYPED RECIPIENT EXPORTED · '+kind+' · SHA '+x.sha256+
    '\nThis is current state of the scoped CP11 typed host, not a complete private browser game save.');
   signal('TYPED_FILE_EXPORTED',kind);
  }catch(e){status('EXPORT HOLD · '+String(e.message||e));signal('EXPORT_HOLD',e.message)}
 });
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
}
