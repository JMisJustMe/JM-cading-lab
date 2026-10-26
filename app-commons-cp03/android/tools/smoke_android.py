"""CP03 disposable Android API35 touch/cold-restart proof, NOT an owner's Fold."""
import subprocess,time,xml.etree.ElementTree as ET,json, pathlib,re,sys
OUT=pathlib.Path('android-smoke-proof');OUT.mkdir(exist_ok=True)
COMP='com.jmisjustme.appcommons/com.jmisjustme.foldultra.AppCommonsActivity'
results=[]
def adb(*a):return subprocess.check_output(['adb',*a],stderr=subprocess.STDOUT,text=True,timeout=30).strip()
def checkpoint(name,ok):results.append({'test':name,'pass':bool(ok)});print(('PASS' if ok else 'FAIL'),name,flush=True)
def dump():
 adb('shell','uiautomator','dump','/sdcard/jm_view.xml');subprocess.run(['adb','pull','/sdcard/jm_view.xml',str(OUT/'view.xml')],capture_output=True,check=True)
 return ET.parse(OUT/'view.xml').getroot()
def tap(label):
 tree=dump()
 for node in tree.iter('node'):
  s=node.attrib.get('text','')+' '+node.attrib.get('content-desc','')
  if label in s:
   b=node.attrib.get('bounds','');m=re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]',b)
   if m:
    l,t,r,bt=map(int,m.groups());adb('shell','input','tap',str((l+r)//2),str((t+bt)//2));time.sleep(.9);return True
 return False
def scroll():adb('shell','input','swipe','200','720','200','310','360');time.sleep(.7)
try:
 adb('shell','am','force-stop','com.jmisjustme.appcommons')
 adb('shell','am','start','-n',COMP)
 time.sleep(3);t=dump();raw=(OUT/'view.xml').read_text()
 checkpoint('original JM native room renders', 'APP//COMMONS' in raw and 'INSPECT LOCAL SOURCE' in raw)
 checkpoint('independent origin label', 'ORIGINAL NATIVE WORKROOM' in raw)
 # Actual system touch + keyboard event, not preference injection.
 editors=[n for n in t.iter('node') if n.attrib.get('class','').endswith('EditText')]
 checkpoint('editable native source exists',bool(editors))
 if editors:
  b=editors[0].attrib['bounds'];q=list(map(int,re.findall(r'\d+',b)))
  adb('shell','input','tap',str((q[0]+q[2])//2),str((q[1]+q[3])//2))
  adb('shell','input','text','JM_NATIVE_CP03_CONTACT')
  adb('shell','input','keyevent','4');time.sleep(1)
  t=dump();checkpoint('native keyboard changes source', 'JM_NATIVE_CP03_CONTACT' in (OUT/'view.xml').read_text())
  found=False
  for _ in range(5):
   if tap('SAVE REVIEWED SNAPSHOT'):found=True;break
   scroll()
  checkpoint('save snapshot control receives touch',found)
  if found:
   checkpoint('owner-save dialog visible', 'Preserve native snapshot' in (OUT/'view.xml').read_text())
   checkpoint('save confirmation applied',tap('SAVE'))
  adb('shell','am','force-stop','com.jmisjustme.appcommons');adb('shell','am','start','-n',COMP);time.sleep(2.5)
  dump();checkpoint('native source survives forced restart','JM_NATIVE_CP03_CONTACT' in (OUT/'view.xml').read_text())
  checkpoint('native saved revision survives forced restart','Revision 1' in (OUT/'view.xml').read_text())
 adb('exec-out','screencap','-p') if False else None
 with (OUT/'native-cp03.png').open('wb') as out: subprocess.run(['adb','exec-out','screencap','-p'],stdout=out,check=True)
except Exception as e:
 results.append({'test':'test runner exception','pass':False,'error':str(e)})
finally:
 (OUT/'receipt.json').write_text(json.dumps({'environment':'Generic Android API35 emulator, disposable local data','tests':results,'passed':sum(x['pass'] for x in results),'total':len(results),'ownerSamsung':False},indent=2))
 print((OUT/'receipt.json').read_text())
 if not all(x['pass'] for x in results):sys.exit(1)
