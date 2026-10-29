import {auditRegister,listCandidateContacts} from './influence-core.mjs';
import {executeNativeEvidenceContact} from './native-playform-contact.mjs';
// Existing Games&Beyond House PROOF lane: owner-local input; no server/storage writes.
const root=document.getElementById('jmInfluencePanel');
if (root) {
  const $=id=>document.getElementById(id);
  const file=$('jmInfluenceFile'),upload=$('jmInfluenceLoad'),select=$('jmInfluenceSelect'),
        compare=$('jmInfluenceCompare'),exportBtn=$('jmInfluenceExport'),status=$('jmInfluenceStatus'),
        result=$('jmInfluenceResult'),played=$('jmInfluencePlayed'),liked=$('jmInfluenceLiked'),note=$('jmInfluenceNote');
  let register=null,selectedContact=null;
  const tell=(message)=>status.textContent=message;
  upload.addEventListener('click',()=>file.click());
  file.addEventListener('change',async()=>{
    try {
      const picked=file.files?.[0];if(!picked)return;
      if(picked.size>2_000_000)throw Error('PRIVATE_REGISTER_TOO_LARGE');
      const next=JSON.parse(await picked.text());
      const audit=auditRegister(next);
      const candidates=listCandidateContacts(next);
      register=next;selectedContact=null;
      select.replaceChildren(...candidates.map(c=>new Option(c.sourceTitle,c.sourceTitle)));
      select.disabled=!candidates.length;compare.disabled=!candidates.length;
      exportBtn.disabled=true;result.textContent='';
      tell(`Local-only register read: ${audit.identified} identified games; ${audit.unresolved} unresolved packages; ${candidates.length} proposed JM comparison routes. No file uploaded.`);
    }catch(e){register=null;selectedContact=null;select.disabled=true;compare.disabled=true;exportBtn.disabled=true;
      tell(`Import rejected: ${String(e?.message||e)}. Your game runtime is unchanged.`);}
    finally{file.value='';}
  });
  compare.addEventListener('click',()=>{
    if(!register)return;
    try {
      selectedContact=executeNativeEvidenceContact(register,select.value);
      const c=selectedContact.comparison;
      result.textContent=[`SOURCE RECORD: ${c.sourceTitle}`,
        `INSTALL EVIDENCE: ${c.sourceEvidence.firstInstalled||'unknown'} to ${c.sourceEvidence.lastInstalled||'unknown'}`,
        `JM RECEIVER: ${c.relationship?.jmEstateRoute||'No comparison hypothesis yet'}`,
        `DESIGN QUESTION: ${c.relationship?.originalDesignQuestion||'None'}`,
        `JM NATIVE PLAYFORM RECEIPT: ${selectedContact.nativeReceipt.traceDigest}`,
        `SCOPE: research state only. No playable mechanic, renderer or Gardles executed.`].join('\n');
      exportBtn.disabled=false;
      tell('JM PLAYFORM research contact executed. Receiver gameplay remains unchanged.');
    }catch(e){selectedContact=null;exportBtn.disabled=true;tell(`Native comparison refused: ${String(e?.message||e)}`);}
  });
  exportBtn.addEventListener('click',()=>{
    if(!selectedContact)return;
    const review={played:played.value,liked:liked.value,note:note.value.trim().slice(0,4000)};
    const payload={schema:'jm.gaming-influence-owner-review/0.1',origin:'Games&Beyond existing House',
      comparison:selectedContact.comparison,ownerReview:review,nativeReceipt:selectedContact.nativeReceipt,
      proof:selectedContact.proof,rendererInvoked:false,gameRuntimeInvoked:false,gardlesInvoked:false};
    const bytes=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const href=URL.createObjectURL(bytes),a=document.createElement('a');
    a.href=href;a.download='JM_INFLUENCE_CONTACT_'+selectedContact.comparison.sourceTitle.replace(/[^a-z0-9]+/gi,'_').slice(0,60)+'.json';
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(href),1200);
    tell('Owner-edited comparison exported to your device. No silent remote save or game modification.');
  });
}
