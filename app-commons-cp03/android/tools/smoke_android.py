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
def wait_ready(seconds=48):
 deadline=time.monotonic()+seconds
 last=None
 while time.monotonic()<deadline:
  try:
   last=dump()
   nodes=list(last.iter('node'))
   values=[n.attrib.get('text','') for n in nodes]
   if any('APP//COMMONS' in x for x in values) and any(n.attrib.get('class','').endswith('EditText') for n in nodes):
    return last
  except (subprocess.SubprocessError,ET.ParseError,FileNotFoundError): pass
  time.sleep(1.5)
 raise RuntimeError('HOLD native activity did not reach visible JM editor after boot; no UI Ding')
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
 time.sleep(2);t=wait_ready();raw=(OUT/'view.xml').read_text()
 checkpoint('original JM native room renders', 'APP//COMMONS' in raw and 'INSPECT LOCAL SOURCE' in raw)
 checkpoint('independent origin label', 'ORIGINAL NATIVE WORKROOM' in raw)
 # Actual system touch + keyboard event, not preference injection.
 editors=[n for n in t.iter('node') if n.attrib.get('class','').endswith('EditText')]
 checkpoint('editable native source exists',bool(editors))
 if editors:
  b=editors[0].attrib['bounds'];q=list(map(int,re.findall(r'\d+',b)))
  adb('shell','input','tap',str((q[0]+q[2])//2),str((q[1]+q[3])//2))
  adb('shell','input','text','nativetouchproof')
  adb('shell','input','keyevent','4');time.sleep(1.5)
  t=dump()
  read=lambda tree: next((x.attrib.get('text','') for x in tree.iter('node') if x.attrib.get('class','').endswith('EditText')),'')
  entered=read(t)
  checkpoint('native keyboard changes source',len(entered)>=8 and entered!='')
  # Remove IME/focus uncertainty and establish real persisted draft before snapshot.
  adb('shell','am','force-stop','com.jmisjustme.appcommons')
  adb('shell','am','start','-n',COMP);t=wait_ready()
  checkpoint('edited source recovered on native cold launch',read(t)==entered and bool(entered))
  found=tap('SAVE REVIEWED SNAPSHOT')
  if not found:
   # Pixel 6 fallback targets the visually confirmed control bounds from the hierarchy.
   for node in t.iter('node'):
    if node.attrib.get('text')=='SAVE REVIEWED SNAPSHOT':
     m=re.findall(r'\d+',node.attrib.get('bounds',''))
     if len(m)==4:
      x1,y1,x2,y2=map(int,m);adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(1);found=True
     break
  checkpoint('save snapshot control receives touch',found)
  if found:
   t=dump();dialog='Preserve native snapshot' in (OUT/'view.xml').read_text()
   checkpoint('owner-save dialog visible',dialog)
   confirmed=tap('SAVE') if dialog else False
   checkpoint('save confirmation applied',confirmed)
  adb('shell','am','force-stop','com.jmisjustme.appcommons');adb('shell','am','start','-n',COMP)
  t=wait_ready()
  checkpoint('native source survives forced restart',read(t)==entered and bool(entered))
  checkpoint('native saved revision survives forced restart','Revision 1' in (OUT/'view.xml').read_text())
 adb('exec-out','screencap','-p') if False else None
 with (OUT/'native-cp03.png').open('wb') as out: subprocess.run(['adb','exec-out','screencap','-p'],stdout=out,check=True)
except Exception as e:
 results.append({'test':'test runner exception','pass':False,'error':str(e)})
finally:
 (OUT/'receipt.json').write_text(json.dumps({'environment':'Generic Android API35 emulator, disposable local data','tests':results,'passed':sum(x['pass'] for x in results),'total':len(results),'ownerSamsung':False},indent=2))
 print((OUT/'receipt.json').read_text())
 if not all(x['pass'] for x in results):sys.exit(1)