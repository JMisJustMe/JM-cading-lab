#!/usr/bin/env python3
from pathlib import Path
import hashlib,json,subprocess,sys

ROOT=Path(__file__).resolve().parents[2]
ORGAN=(ROOT/'governance/contact-organ/JM_ESTATE_CONTACT_ORGAN_v1_0.js').read_text(encoding='utf-8')
OUT=ROOT/'estate-publication/contact-organ-descendants'
MARK='JM_ESTATE_CONTACT_ORGAN_PATCH_v1_0'

ROWS=[
('cross-continuity','00_OPEN_FIRST_DEVICE_CONTINUITY_v1_1_7.html',None,'FULL_CROSS_DEVICE','PHONE_LAPTOP_CONTINUITY','REMOTE_SESSION',True,None),
('cross-forge',None,None,'FULL_CONTRACT_CARRIER_ADAPTER_REQUIRED','DUAL_SURFACE_AUTHORING_BUILD_RECEIPT','PROJECT_SESSION',True,'apps/jm-android-forge/index.html'),
('cross-private-arcade',None,None,'FULL_CROSS_DEVICE','SHARED_REGISTRY_LOAD_OPEN_EXPORT','REMOTE_SESSION',True,None),
('phone-browser','JM3232_UNIFIED_BROWSER_v1_1_3_ROUTE_LENS_EMBODIMENT_CANDIDATE.html','3812dcb853cda310ac05566f9365255ad5de646a88ad39500aea5860aa2224d1','COMMON_CONTACT_ORGANS','ROUTE_CONTACT_AND_PERSISTENCE','NONE',False,'__JM3232_RECONSTRUCT__'),
('phone-gold','JM_GOLD_MODE_CODING_HUB_v0_9_5_GOLD_CIRCUIT_EMBODIMENT_CANDIDATE.html',None,'COMMON_CONTACT_ORGANS','CODING_STATE_CONTACT_AND_RECOVERY','NONE',False,None),
('phone-foundry','JM3241_CREATOR_FOUNDRY_v0_1_1_MAKER_FOUNDRY_EMBODIMENT_CANDIDATE.html','dcfaacc5b30f81d6e19f41c4d4e4c3b4dccd643948766c8703314b4ecf71d86b','COMMON_CONTACT_ORGANS','AUTHORING_BUILD_EXPORT_RECEIPT','NONE',False,None),
('phone-grabber','JM_FILE_GRABBER_FLL_v0_4_INTAKE_DOCK_EMBODIMENT_CANDIDATE.html',None,'COMMON_CONTACT_ORGANS','FILE_INTAKE_ACQUISITION_RECEIPT','NONE',False,None),
('phone-librarian','JM_ESTATE_LIBRARIAN_v2_1_ARCHIVE_LANTERN_EMBODIMENT_CANDIDATE.html',None,'COMMON_CONTACT_ORGANS','LIBRARY_FIND_OPEN_ARCHIVE_RECEIPT','NONE',False,None),
('phone-lyricstudio','JM_LYRICSTUDIO_v0_5_1_VERSE_CHAMBER_EMBODIMENT_CANDIDATE.html','3472d3815f68c1cd3cb4e7befbf66f46a1439d1fe8d1f02750fe2fc271f6669e','COMMON_CONTACT_ORGANS','LYRIC_SAVE_INGEST_EXPORT_RECEIPT','NONE',False,'lyrics/index.html'),
('phone-notebook','JM_LIVING_NOTEBOOK_v1_6_ESTATE_SWITCHYARD_EMBODIMENT_CANDIDATE.html','f0109f2666ef2971d8d99ccbba332ea1c0f0ddfc661a45a460487e80a9d92068','COMMON_CONTACT_ORGANS','NOTE_STATE_PERSIST_RECOVER','NONE',False,None),
('phone-kading','KADING_ESTATE_CODE_LATTICE_RUNTIME_VISION_CANDIDATE.html','df85cf5be3168be20ee74ab15e0cdb5c229aecd8c887d9e1c5de318b972ee14a','COMMON_CONTACT_ORGANS','PROJECT_SAVE_LOAD_EXPORT_RECEIPT','NONE',False,None),
('phone-source-notebook','SOURCE_AWARE_NOTEBOOK_v2_1_PROVENANCE_FOLIO_EMBODIMENT_CANDIDATE.html',None,'COMMON_CONTACT_ORGANS','PROVENANCE_AWARE_SAVE_RECEIPT','NONE',False,None),
('phone-griproute','JM_FTR_GRIPROUTE_v1_2_PALM_ROUTE_FIELD_EMBODIMENT_CANDIDATE.html',None,'COMMON_CONTACT_ORGANS','GRIP_ROUTE_CONTACT_STATE','NONE',False,None),
('phone-zion-os','JM_ZIONFOLDER_OS_v1_1_1R_1_LIVING_ROOMS_EMBODIMENT_CANDIDATE.html',None,'COMMON_CONTACT_ORGANS','ROOM_STATE_ROUTE_RECOVERY','NONE',False,None),
('phone-game-estate','JM_GAME_ESTATE_SUPERSET_v0_3_ARCADE_HANGAR_EMBODIMENT_CANDIDATE.html',None,'COMMON_CONTACT_ORGANS','GAME_BODY_LOAD_OPEN_EXPORT_CONTACT','NONE',False,None),
('phone-money','JM_MONEY_MENU_v1_2_1_VALUE_LEDGER_EMBODIMENT_CANDIDATE.html','75fca3499525c28082abb5fecb2c314ed92cd20f8e52b1d45d11f77e487be727','COMMON_CONTACT_ORGANS','ENQUIRY_OR_EXPORT_RECEIPT','NONE',False,'money-menu/index.html'),
('phone-legaliving','JM_LEGALIVING_v1_0_4_LIVING_LEGAL_FOLIO_EMBODIMENT_CANDIDATE.html','f9d4f15e9aef2e9bbcf4ba729e0c0d0a810ebd9bcd908f91b4ca7afdf8114af2','COMMON_CONTACT_ORGANS','LEGAL_ROUTE_OPEN_EXPORT_CONTACT','NONE',False,None),
('phone-source-vault','JM_FULL_SOURCE_CF_DECLARED_FORWARD_BRIDGE.html','27df9e944388da4d61c6dfffceea52fa2efddda04822e6cb58fb7593ac35d2b4','COMMON_CONTACT_ORGANS','SOURCE_AUTHORITY_INSPECT_EXPORT','NONE',False,None),
('phone-organ-library','JM_APP_ORGAN_LIBRARY_v1_1_1_ANATOMICAL_BENCH_EMBODIMENT_CANDIDATE.html','3e1ce7e5f4f9485d0a8020cdb62e312c48944220505ef09774486c893ca097d7','COMMON_CONTACT_ORGANS','ORGAN_FIND_INSPECT_DONATE_RECEIPT','NONE',False,None),
('phone-context','JM_CONTEXTUAL_CF_DECLARED_FORWARD_BRIDGE.html','1a6ab7480eff3b6e108ddcc0e393a488f66487b917ef0d2ca0e0f47b172bedac','COMMON_CONTACT_ORGANS','CONTEXT_INSPECT_ROUTE_EXPORT','NONE',False,None),
('phone-studios','JMSTUDIOS_B0_9_0_STUDIO_DISTRICT_MASTER_LAUNCHER_CANDIDATE.html','ac91809341d841d9c92ee7835a9ac588779d0def7bf707a743bdde7c384d2556','COMMON_CONTACT_ORGANS','STUDIO_LAUNCH_ROUTE_RECEIPT','NONE',False,'games-beyond/index.html'),
('phone-contact-deck','JM_COMMON_FLOOR_v0_11_1_CONTACT_DECK_EMBODIMENT_CANDIDATE.html','a46dc5c0a667938810e8dbb63f5c650a81255adb1bc71b8d2b7b453934736242','COMMON_CONTACT_ORGANS','COMMON_FLOOR_CONTACT_ACTION_RECEIPT','NONE',False,None),
('phone-signal','JM_SIGNAL_ENGINE_v2_4_1_SIGNAL_OBSERVATORY_EMBODIMENT_CANDIDATE.html','976b2aeb9ddb1c917a9fe1eec431e5cfb2e4b37ff9eba1f6271e55e03767ec24','COMMON_CONTACT_ORGANS','SIGNAL_ACTION_TRACE_RECEIPT','NONE',False,None),
('phone-compass','JM_ESTATE_COMPASS_v1_5_2_1_COMPASS_ROSE_EMBODIMENT_CANDIDATE.html',None,'COMMON_CONTACT_ORGANS','ROUTE_SELECT_OPEN_CONTINUE','NONE',False,None),
('phone-intertap','JM_INTERTAP_v0_1_4_DECLARED_FORWARD_BRIDGE.html','43e299559cbc39a462bc854563512a8fc8492a62f26d86b9f0b7b81e82e65612','COMMON_CONTACT_ORGANS','TAP_HANDOFF_RECEIPT','NONE',False,None),
('phone-housekeeper','ZIONFOLDER_HOUSEKEEPER_v1_1_2_DECLARED_FORWARD_BRIDGE.html',None,'COMMON_CONTACT_ORGANS','SAFE_SCAN_QUARANTINE_RESTORE_RECEIPT','NONE',False,None),
('phone-multihub','JM_LIVING_MULTIHUB_v6_0A_DECLARED_FORWARD_BRIDGE.html','e757adb2e2d5c751038ae4f624243c6de662873981fa34f6907b91391229c3c0','COMMON_CONTACT_ORGANS','MULTIHUB_STATE_PERSIST_RECOVER','NONE',False,None),
('phone-onebody','JM_ONEBODY_CODING_OS_v1_0_2_SOVEREIGN_MACHINE_EMBODIMENT_CANDIDATE.html','dd0b93b7beae0d8df0a25e59023115e70fd8494aa865adc0dc5fa95843df9fd0','COMMON_CONTACT_ORGANS','CODING_ACTION_OUTPUT_RECOVERY_RECEIPT','NONE',False,None),
]

def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
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

def patch(src,rid,inheritance,consequence,auth,remote,source_class,expected):
 text=src.read_text(encoding='utf-8',errors='strict')
 if '</body>' not in text.lower():return None,'HTML_BODY_GATE'
 cfg={'schema':'jm.estate.contact-organ-recipient/1.0','recipientId':rid,'bodyId':src.name,'bodyVersion':'repo-contact-descendant','inheritance':inheritance,'consequence':consequence,'authorizationModel':auth,'remoteAuthority':remote,'persistence':True,'cloudEvents':False,'protectedParent':True,'sourceClass':source_class,'claimBoundary':'This source descendant proves organ mounting only. Body-specific consequence, APK build/install and physical/device Ding remain separately observed and claim-gated.'}
 bootstrap=f'''\n<!-- {MARK} -->\n<script>{ORGAN}</script>\n<script>\nwindow.JM_CONTACT_PATCH_CONFIG={json.dumps(cfg,separators=(',',':'))};\n(async()=>{{window.JMContact=JMContactOrgan.create(window.JM_CONTACT_PATCH_CONFIG);await window.JMContact.init();await window.JMContact.ready({{observedDocument:true,sourceClass:{json.dumps(source_class)}}});window.dispatchEvent(new CustomEvent('jm-contact-organ-ready',{{detail:{{recipientId:{json.dumps(rid)}}}}));}})().catch(e=>console.error('JM Contact Organ',e));\n</script>\n<!-- /{MARK} -->\n'''
 pos=text.lower().rfind('</body>');outdir=OUT/rid;outdir.mkdir(parents=True,exist_ok=True);out=outdir/(src.stem+'_CONTACT_ORGAN_v1_0_DESCENDANT.html');out.write_text(text[:pos]+bootstrap+text[pos:],encoding='utf-8')
 receipt={'schema':'jm.estate.contact-organ-patch-receipt/1.0','recipientId':rid,'source':str(src.relative_to(ROOT)),'sourceClass':source_class,'sourceSha256':digest(src),'expectedExactSourceSha256':expected,'descendant':str(out.relative_to(ROOT)),'descendantSha256':digest(out),'parentMutated':False,'organMounted':True,'bodySpecificConsequenceWiring':'OPEN_UNTIL_BODY_ACTION_RESULT_IS_EXPLICITLY_OBSERVED','apkBuild':'OPEN','physicalDing':'OPEN'}
 (outdir/'PATCH_RECEIPT.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8');return out,receipt

def main():
 OUT.mkdir(parents=True,exist_ok=True);results=[]
 for rid,name,expected,inheritance,consequence,auth,remote,fallback in ROWS:
  src=find_exact(name);source_class='EXACT_MAPPED_SOURCE'
  if src and expected and digest(src)!=expected:
   results.append({'recipientId':rid,'status':'EXACT_SOURCE_HASH_MISMATCH','found':str(src.relative_to(ROOT)),'actual':digest(src),'expected':expected});continue
  if not src and fallback=='__JM3232_RECONSTRUCT__':src=navigator_fallback();source_class='RECOVERED_REPO_SOURCE_AUTHORITY'
  elif not src and fallback and (ROOT/fallback).exists():src=ROOT/fallback;source_class='CURRENT_REPO_REAL_BODY_FALLBACK'
  if not src:
   results.append({'recipientId':rid,'status':'SOURCE_NOT_IN_CURRENT_GIT_TREE','expectedFile':name,'fallback':fallback});continue
  out,rec=patch(src,rid,inheritance,consequence,auth,remote,source_class,expected)
  if out:results.append({'recipientId':rid,'status':'PATCHED_DESCENDANT','source':str(src.relative_to(ROOT)),'sourceClass':source_class,'descendant':str(out.relative_to(ROOT)),'sha256':rec['descendantSha256']})
  else:results.append({'recipientId':rid,'status':rec,'source':str(src.relative_to(ROOT))})
 report={'schema':'jm.estate.contact-organ-github-propagation/1.0','law':'FROZEN PARENT -> CLEAN DESCENDANT','ownerLaw':'OWNER USES; THE BODY PROVES.','claimLaw':'NO DING, NO CLAIM.','totalRecipients':len(ROWS),'patched':sum(r['status']=='PATCHED_DESCENDANT' for r in results),'exactPatched':sum(r.get('sourceClass')=='EXACT_MAPPED_SOURCE' and r['status']=='PATCHED_DESCENDANT' for r in results),'fallbackRealBodiesPatched':sum(r.get('sourceClass') in {'CURRENT_REPO_REAL_BODY_FALLBACK','RECOVERED_REPO_SOURCE_AUTHORITY'} and r['status']=='PATCHED_DESCENDANT' for r in results),'results':results}
 (OUT/'PROPAGATION_RECEIPT.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,indent=2))
if __name__=='__main__':main()
