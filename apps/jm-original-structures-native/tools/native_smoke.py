#!/usr/bin/env python3
"""Authentic disposable-emulator native UI, disk and cold-reentry evidence.
No ADB injection of owner data; only UI Save and Verify write state.
"""
import hashlib,json,re,subprocess,time,xml.etree.ElementTree as ET,os
from pathlib import Path
PKG='me.jmisjustme.originalstructures'
OUT=Path('native-proof');OUT.mkdir(exist_ok=True)
def adb(*args,check=True):
 p=subprocess.run(['adb',*args],capture_output=True,timeout=60)
 if check and p.returncode:raise AssertionError((args,p.stderr.decode(errors='replace')[-700:]))
 return p.stdout

def nodes(tag):
 # Generic Android 35 can raise its OWN Quickstep or Pixel Launcher ANR.
 # Only those two EXACT OS messages qualify; do not clear JM app faults.
 events=[]
 for attempt in range(7):
  adb('shell','uiautomator','dump','/sdcard/jm_native_ui.xml')
  src=adb('exec-out','cat','/sdcard/jm_native_ui.xml')
  (OUT/(tag+f'_{attempt}.xml')).write_bytes(src)
  ns=[v.attrib for v in ET.fromstring(src).iter('node')]
  observed={n.get('text','') for n in ns}
  labels=[name for name in ("Quickstep isn't responding","Pixel Launcher isn't responding") if name in observed]
  if not labels:
   if events:(OUT/(tag+'_ANDROID_LAUNCHER_OBSTRUCTIONS.json')).write_text(json.dumps(events,indent=2))
   return ns
  assert len(labels)==1,'HOLD: multiple Android launcher dialogs'
  waits=[n for n in ns if n.get('text')=='Wait' and n.get('class')=='android.widget.Button']
  assert len(waits)==1,'HOLD: Android launcher dialog cannot be safely cleared'
  m=re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]',waits[0]['bounds'])
  assert m,'HOLD: missing native OS Wait bounds'
  x,y,x2,y2=map(int,m.groups())
  assert 0<=x<x2<=720 and 0<=y<y2<=1600,'HOLD: Android system dialog bounds'
  events.append({'environment':'generic Android emulator','obstruction':labels[0],
                 'action':'Wait','attempt':attempt,'jm_ui_proven':False})
  adb('shell','input','tap',str((x+x2)//2),str((y+y2)//2));time.sleep(1.4)
 (OUT/(tag+'_ANDROID_LAUNCHER_OBSTRUCTIONS.json')).write_text(json.dumps(events,indent=2))
 raise AssertionError('HOLD: native UI obscured by Android launcher after bounded retries')

def tap_button(label,tag):
 ns=nodes(tag)
 found=[v for v in ns if v.get('class')=='android.widget.Button' and v.get('text')==label]
 assert len(found)==1,(label,'expected uniquely visible native control',found)
 m=re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]',found[0]['bounds'])
 assert m,(label,'bad bounds')
 x,y,x2,y2=map(int,m.groups());assert x2>x and y2>y
 adb('shell','input','tap',str((x+x2)//2),str((y+y2)//2));time.sleep(1.5)

def snapshot():
 data=adb('exec-out','run-as',PKG,'cat','files/jm_original_checkpoint.json')
 return json.loads(data.decode())

def check_record(d):
 assert d['schema']=='JM.NativeSnapshot/0.1'
 assert d['sha256']==hashlib.sha256(d['source'].encode()).hexdigest()
 s=json.loads(d['source']);assert s['schema']=='JM.OriginalStructures.BrowserCP01/1'
 assert len(s['projects'])>=3
 return s

def main():
 assert adb('shell','getprop','ro.kernel.qemu').decode().strip()=='1','No physical owner device allowed'
 adb('shell','wm','size','720x1600');adb('shell','wm','density','320')
 adb('shell','am','start','-W','-n',PKG+'/.MainActivity')
 time.sleep(9)
 ns=nodes('first_running')
 assert any('Save'==n.get('text') for n in ns),'Native Save missing'
 assert any('JM NATIVE WORKROOM READY' in n.get('text','').upper() for n in ns),('Embedded source+GripCube not verified at runtime',ns)
 # WebView content may be absent from uiautomator's accessibility tree even
 # while real JavaScript runs. Native readiness is proved by JS checking
 # #source, state, GripCube and worker organ, NOT by an accessibility guess.
 (OUT/'CP08_FIRST_RENDER.png').write_bytes(adb('exec-out','screencap','-p'))
 tap_button('Save','real_owner_save')
 raw=snapshot();state=check_record(raw)
 print('PASS native UI render, owner Save -> app-private AtomicFile -> SHA-256 readback',flush=True)
 (OUT/'CP08_NATIVE_WRITTEN_SNAPSHOT.json').write_text(json.dumps({'schema':raw['schema'],'sha256':raw['sha256'],'revision':state['revision'],'project_count':len(state['projects'])},indent=2))
 adb('shell','am','force-stop',PKG)
 adb('shell','am','start','-W','-n',PKG+'/.MainActivity')
 time.sleep(8)
 ns=nodes('after_cold_reopen')
 assert any(n.get('text')=='Verify' for n in ns),'Cold native toolbar lost'
 tap_button('Verify','native_vault_verify')
 after=snapshot();assert after['sha256']==raw['sha256'],'Cold reentry altered saved snapshot'
 ns=nodes('after_tap_verify')
 assert any('VERIFIED NATIVE VAULT' in n.get('text','') for n in ns),'No visible verified SHA receipt'
 adb('exec-out','screencap','-p');(OUT/'CP08_NATIVE_SCREEN.png').write_bytes(adb('exec-out','screencap','-p'))
 print('PASS cold process-stop/reopen, same native snapshot and real Verify UI button',flush=True)
 (OUT/'CP08_RECEIPT.json').write_text(json.dumps({'status':'PASS','native_ui_render':True,'explicit_save_touched':True,'private_atomic_file_checked':True,'cold_reopen_verified':True,'native_verify_touched':True,'owner_fold_tested':False,'external_provider_contact':False},indent=2))
if __name__=='__main__':main()