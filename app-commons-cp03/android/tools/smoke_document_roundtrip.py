"""CP04 native SAF proof: real system picker, owner-visible confirmation and byte roundtrip.
An independent generic emulator gate; no private phone or GitHub promotion.
Failures are scoped HOLDs with screenshots and UI hierarchies saved for repair.
"""
import subprocess,time,xml.etree.ElementTree as ET,json,pathlib,re,sys
OUT=pathlib.Path('android-document-proof');OUT.mkdir(exist_ok=True)
PACKAGE='com.jmisjustme.appcommons';COMP=PACKAGE+'/com.jmisjustme.foldultra.AppCommonsActivity';checks=[]
def adb(*a,timeout=35):return subprocess.check_output(['adb',*a],stderr=subprocess.STDOUT,text=True,timeout=timeout).strip()
def stamp(name,good):checks.append({'test':name,'pass':bool(good)});print(('PASS' if good else 'FAIL'),name,flush=True)
def get_tree():
 adb('shell','uiautomator','dump','/sdcard/jm_cp04.xml')
 subprocess.run(['adb','pull','/sdcard/jm_cp04.xml',str(OUT/'latest.xml')],capture_output=True,check=True)
 return ET.parse(OUT/'latest.xml').getroot()
def nodes():return list(get_tree().iter('node'))
def visible(text):return any(text in n.attrib.get('text','')+' '+n.attrib.get('content-desc','') for n in nodes())
def tap(label,scrolls=0):
 for a in range(scrolls+1):
  for n in nodes():
   if label.lower() in (n.attrib.get('text','')+' '+n.attrib.get('content-desc','')).lower():
    q=list(map(int,re.findall(r'\d+',n.attrib.get('bounds',''))))
    if len(q)==4:
     adb('shell','input','tap',str((q[0]+q[2])//2),str((q[1]+q[3])//2));time.sleep(1.1);return True
  if a<scrolls: adb('shell','input','swipe','400','810','400','275','350');time.sleep(.9)
 return False
def tap_document(filename):
 tree=get_tree()
 def walk(node,parents):
  if filename==node.attrib.get('text',''):
   clickable=next((x for x in reversed(parents) if x.attrib.get('clickable')=='true'),None)
   target=clickable or node
   q=list(map(int,re.findall(r'\d+',target.attrib.get('bounds',''))))
   if len(q)==4:
    adb('shell','input','tap',str((q[0]+q[2])//2),str((q[1]+q[3])//2))
    time.sleep(1.4);return True
  for child in node:
   if walk(child,parents+[node]):return True
  return False
 return walk(tree,[])
def shot(name):
 with (OUT/(name+'.png')).open('wb') as out:subprocess.run(['adb','exec-out','screencap','-p'],stdout=out,check=True)
def wait(text,limit=30):
 deadline=time.monotonic()+limit
 while time.monotonic()<deadline:
  try:
   if visible(text):return True
  except Exception:pass
  time.sleep(1.5)
 return False
try:
 adb('shell','am','force-stop',PACKAGE);adb('shell','am','start','-n',COMP);assert wait('ORIGINAL NATIVE WORKROOM',45),'app not ready'
 stamp('CP04 native room enters view',visible('CP04'))
 # First, proof the independent native capsule verifier and no-provider route.
 assert tap('VERIFY LOCAL CAPSULE',scrolls=3),'native audit control missing'
 stamp('native self-audit consequence',wait('CAPSULE VERIFIED',12))
 tap('Return')
 # Existing source starts empty on new emulator install; write through Android touch.
 editor=next(n for n in nodes() if n.attrib.get('class','').endswith('EditText'))
 q=list(map(int,re.findall(r'\d+',editor.attrib['bounds'])))
 adb('shell','input','tap',str((q[0]+q[2])//2),str((q[1]+q[3])//2))
 adb('shell','input','text','NativeCapsuleRoundtripCP04');adb('shell','input','keyevent','4');time.sleep(1.2)
 # Real export through Android ACTION_CREATE_DOCUMENT picker.
 assert tap('EXPORT VERIFIED .JSON',scrolls=4),'export button not reached'
 stamp('export consent preview visible',wait('Export full source',12))
 assert tap('CHOOSE FILE'),'export approval missing'
 stamp('Android document create picker opened',wait('Save',22) or wait('SAVE',8))
 shot('create-picker')
 # Document picker uses button SAVE; do not replace with direct storage writes.
 assert tap('Save',scrolls=1),'document picker SAVE not found'
 stamp('selected document re-read exactly',wait('EXPORT VERIFIED',22))
 shot('export-verified')
 # Change the real draft through native keyboard AFTER the exported file is preserved.
 for _ in range(4):
  adb('shell','input','swipe','400','310','400','1160','260');time.sleep(.35)
 editor=next((x for x in nodes() if x.attrib.get('class','').endswith('EditText')),None)
 assert editor is not None,'native source not visible after export'
 q=list(map(int,re.findall(r'\d+',editor.attrib['bounds'])))
 adb('shell','input','tap',str((q[0]+q[2])//2),str((q[1]+q[3])//2))
 adb('shell','input','text','AfterExportMutation');adb('shell','input','keyevent','4')
 time.sleep(1)
 stamp('native draft changed after export',any('AfterExportMutation' in n.attrib.get('text','') for n in nodes()))
 assert tap('VERIFY + IMPORT .JSON',scrolls=4),'import control unreachable'
 stamp('Android document read picker opened',wait('Downloads',15) or wait('Recent',12))
 shot('open-picker')
 filename='JM_APP_COMMONS_NATIVE_CP04.json'
 assert tap_document(filename),'exported JSON tile not selectable in picker'
 stamp('verified source approval shown',wait('Adopt verified external',22))
 assert tap('ADOPT TO DRAFT'),'adopt approval missing'
 stamp('native source adopted after verifying JSON',wait('NATIVE IMPORT VERIFIED',15))
 # The imported file must actually undo the post-export change, not merely report success.
 for _ in range(3):adb('shell','input','swipe','400','315','400','1160','280');time.sleep(.3)
 stamp('actual earlier source restored from document',not any('AfterExportMutation' in n.attrib.get('text','') for n in nodes()) and any('NativeCapsuleRoundtripCP04' in n.attrib.get('text','') for n in nodes()))
 shot('import-verified')
except Exception as e:
 checks.append({'test':'bounded execution HOLD','pass':False,'reason':str(e)})
 print('HOLD',type(e).__name__,str(e),flush=True)
 try:shot('failure')
 except Exception:pass
finally:
 (OUT/'receipt.json').write_text(json.dumps({'schema':'JM.CP04.NativeDocumentProof/0.1','kind':'real Android ACTION_CREATE_DOCUMENT and ACTION_OPEN_DOCUMENT','checks':checks,'passed':sum(int(x['pass']) for x in checks),'total':len(checks),'ownerSamsung':False},indent=2))
 print((OUT/'receipt.json').read_text(),flush=True)
 if not all(c['pass'] for c in checks):sys.exit(1)
