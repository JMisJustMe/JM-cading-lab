#!/usr/bin/env python3
"""JM Estate Contact Organ Propagation v1.1 — cross-aware descendant materialiser.

Preserves v1 history, preserves parents, and separates:
- common contact organs for phone/app recipients;
- common + cross-device protocol donor for genuine cross-device recipients.

NO DING, NO CLAIM: this script proves source materialisation only.
"""
from pathlib import Path
import hashlib, json, runpy, subprocess, sys

ROOT=Path(__file__).resolve().parents[2]
V1=runpy.run_path(str(ROOT/'governance/contact-organ/propagate_contact_organ_v1.py'))
ROWS=V1['ROWS']
COMMON=(ROOT/'governance/contact-organ/JM_ESTATE_CONTACT_ORGAN_v1_0.js').read_text(encoding='utf-8')
CROSS=(ROOT/'governance/contact-organ/JM_ESTATE_CROSS_DEVICE_CONTACT_ADAPTER_v1_0.js').read_text(encoding='utf-8')
OUT=ROOT/'estate-publication/contact-organ-descendants'
MARK='JM_ESTATE_CONTACT_ORGAN_PATCH_v1_1'

# Known current-repo bodies used only when the exact named Estate source is not present.
# A fallback remains labelled as such; it never impersonates the File-Library exact source.
FALLBACKS={
 'cross-forge':'apps/jm-android-forge/index.html',
 'phone-lyricstudio':'lyrics/index.html',
 'phone-money':'money-menu/index.html',
 'phone-studios':'games-beyond/index.html',
 'phone-browser':'__JM3232_RECONSTRUCT__',
}

CROSS_IDS={'cross-continuity','cross-forge','cross-private-arcade'}

def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()

def find_exact(name):
 if not name:return None
 hits=[p for p in ROOT.rglob(name) if 'contact-organ-descendants' not in p.parts and '.git' not in p.parts]
 return hits[0] if hits else None

def navigator_fallback():
 base=ROOT/'estate-publication/apps-tools-games/JM3232-Navigator-Browser-Bridge-v0.1/source-carriage'
 recon=base/'reconstruct_navigator_bridge.py'
 if recon.exists():
  subprocess.run([sys.executable,str(recon)],cwd=base,check=False)
  cand=base/'reconstructed/JM3232_NAVIGATOR_BROWSER_BRIDGE_v0_1/source_authorities/JM3232_UNIFIED_BROWSER_v1_0_OPEN.html'
  if cand.exists():return cand
 return None

def resolve_source(rid,name,expected):
 src=find_exact(name); source_class='EXACT_MAPPED_SOURCE'
 if src and expected and digest(src)!=expected:
  return None,'EXACT_SOURCE_HASH_MISMATCH',{'found':str(src.relative_to(ROOT)),'actual':digest(src),'expected':expected}
 if src:return src,source_class,{}
 fb=FALLBACKS.get(rid)
 if fb=='__JM3232_RECONSTRUCT__':
  src=navigator_fallback()
  if src:return src,'RECOVERED_REPO_SOURCE_AUTHORITY',{}
 elif fb and (ROOT/fb).exists():
  return ROOT/fb,'CURRENT_REPO_REAL_BODY_FALLBACK',{}
 return None,'SOURCE_RECOVERY_REQUIRED',{'expectedFile':name,'fallback':fb}

def materialise(src,rid,inheritance,consequence,auth,remote,source_class,expected):
 text=src.read_text(encoding='utf-8',errors='strict')
 if '</body>' not in text.lower():return None,{'status':'NATIVE_CARRIER_ADAPTER_REQUIRED','source':str(src.relative_to(ROOT))}
 cross=rid in CROSS_IDS
 cfg={
  'schema':'jm.estate.contact-organ-recipient/1.1','recipientId':rid,'bodyId':src.name,
  'bodyVersion':'repo-contact-descendant-v1.1','inheritance':inheritance,'consequence':consequence,
  'authorizationModel':auth,'remoteAuthority':bool(remote),'persistence':True,'cloudEvents':False,
  'protectedParent':True,'sourceClass':source_class,'crossDeviceDonorMounted':cross,
  'carrierBinding':'REQUIRED_FOR_REAL_CROSS_DEVICE_CONSEQUENCE' if cross else 'NOT_APPLICABLE',
  'claimBoundary':'Source descendant proves organ mounting only. Body consequence, APK build/install, remote transport and physical/device Ding remain separately observed and claim-gated.'
 }
 donor=f'<script>{COMMON}</script>\n'
 if cross:donor+=f'<script>{CROSS}</script>\n'
 boot=f'''\n<!-- {MARK} -->\n{donor}<script>\nwindow.JM_CONTACT_PATCH_CONFIG={json.dumps(cfg,separators=(',',':'))};\n(async()=>{{\n window.JMContact=JMContactOrgan.create(window.JM_CONTACT_PATCH_CONFIG);\n await window.JMContact.init();\n await window.JMContact.ready({{observedDocument:true,sourceClass:{json.dumps(source_class)}}});\n window.JMCrossDeviceContactDonorMounted={str(cross).lower()};\n window.dispatchEvent(new CustomEvent('jm-contact-organ-ready',{{detail:{{recipientId:{json.dumps(rid)},crossDeviceDonorMounted:{str(cross).lower()}}}}}));\n}})().catch(e=>console.error('JM Contact Organ v1.1',e));\n</script>\n<!-- /{MARK} -->\n'''
 pos=text.lower().rfind('</body>')
 outdir=OUT/rid;outdir.mkdir(parents=True,exist_ok=True)
 out=outdir/(src.stem+'_CONTACT_ORGAN_v1_1_DESCENDANT.html')
 out.write_text(text[:pos]+boot+text[pos:],encoding='utf-8')
 receipt={
  'schema':'jm.estate.contact-organ-patch-receipt/1.1','recipientId':rid,
  'source':str(src.relative_to(ROOT)),'sourceClass':source_class,'sourceSha256':digest(src),
  'expectedExactSourceSha256':expected,'descendant':str(out.relative_to(ROOT)),
  'descendantSha256':digest(out),'parentMutated':False,'commonOrganMounted':True,
  'crossDeviceDonorMounted':cross,'crossCarrierBound':False if cross else None,
  'bodySpecificConsequenceWiring':'OPEN_UNTIL_BODY_ACTION_RESULT_IS_EXPLICITLY_OBSERVED',
  'apkBuild':'OPEN','physicalDing':'OPEN'
 }
 (outdir/'PATCH_RECEIPT_v1_1.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
 return out,receipt

def main():
 OUT.mkdir(parents=True,exist_ok=True);results=[]
 for rid,name,expected,inheritance,consequence,auth,remote,_oldfb in ROWS:
  src,source_class,extra=resolve_source(rid,name,expected)
  if not src:
   results.append({'recipientId':rid,'status':source_class,**extra});continue
  out,rec=materialise(src,rid,inheritance,consequence,auth,remote,source_class,expected)
  if out:
   results.append({'recipientId':rid,'status':'MATERIALIZED_CROSS_DONOR_DESCENDANT' if rid in CROSS_IDS else 'MATERIALIZED_COMMON_DESCENDANT',
    'source':str(src.relative_to(ROOT)),'sourceClass':source_class,'descendant':str(out.relative_to(ROOT)),
    'sha256':rec['descendantSha256'],'crossDeviceDonorMounted':rec['crossDeviceDonorMounted']})
  else:results.append({'recipientId':rid,**rec})
 missing=[r for r in results if r['status'] in {'SOURCE_RECOVERY_REQUIRED','EXACT_SOURCE_HASH_MISMATCH'}]
 report={
  'schema':'jm.estate.contact-organ-github-propagation/1.1','law':'FROZEN PARENT -> CLEAN DESCENDANT',
  'transferLaw':'TRANSFER THE ORGAN WHERE THE MEANING SURVIVES; ADAPT THE CARRIER WHERE THE PLATFORM CHANGES.',
  'ownerLaw':'OWNER USES; THE BODY PROVES.','claimLaw':'NO DING, NO CLAIM.',
  'totalRecipients':len(ROWS),'crossRecipients':len(CROSS_IDS),'phoneRecipients':len(ROWS)-len(CROSS_IDS),
  'materialized':sum(r['status'].startswith('MATERIALIZED_') for r in results),
  'crossMaterialized':sum(r['status']=='MATERIALIZED_CROSS_DONOR_DESCENDANT' for r in results),
  'commonMaterialized':sum(r['status']=='MATERIALIZED_COMMON_DESCENDANT' for r in results),
  'recoveryOpen':len(missing),'results':results,
  'claimBoundary':'Materialisation is source evidence only; no APK build/install or physical consequence is synthesized.'
 }
 (OUT/'PROPAGATION_RECEIPT_v1_1.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
 (OUT/'SOURCE_RECOVERY_QUEUE_v1_1.json').write_text(json.dumps({'schema':'jm.estate.contact-organ-source-recovery-queue/1.1','count':len(missing),'rows':missing},indent=2)+'\n',encoding='utf-8')
 print(json.dumps(report,indent=2))

if __name__=='__main__':main()
