#!/usr/bin/env python3
"""CP05 real Android controls and persisted SQLite consequences.

EXPLICIT TEST FIXTURE: configure ready=true on a fresh disposable emulator.
This lane makes NO onboarding, provider, speech-audibility or physical Fold claim.
All document creation, typing, checkpoint, tool and recovery changes use the UI.
"""
import json,re,sqlite3,tempfile,time,subprocess
from pathlib import Path
import xml.etree.ElementTree as ET
from audit_ui_flow import adb,capture,dump,has,pref_values
PKG='com.jmisjustme.foldultra';MAIN=PKG+'/.MainActivity';OUT=Path('emulator-proof')

def touch(label,kind=None):
    for attempt in range(9):
        nodes=dump('cp05_'+re.sub(r'\W','_',label)+str(attempt))
        found=[n for n in nodes if label.lower() in n.get('text','').lower() and (not kind or n.get('class')==kind)]
        found.sort(key=lambda n:(n.get('text')!=label,not n.get('clickable')=='true'))
        for n in found:
            bounds=list(map(int,re.findall(r'\d+',n['bounds'])))
            if len(bounds)!=4:continue
            x1,y1,x2,y2=bounds
            if y1>=60 and y2<=1530 and y2>y1:
                adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(.7);return
        adb('shell','input','swipe','360','1380','360','460','260');time.sleep(.3)
    capture('CP05_FAILED_TOUCH');raise AssertionError('Control unavailable: '+label)

def db():
    # Read the actual app database; no document state is injected by this test.
    adb('shell','am','force-stop',PKG)
    time.sleep(.4)
    data=adb('exec-out','run-as',PKG,'cat','databases/jm-workroom-cp05.db')
    path=OUT/'CP05_DB.sqlite';path.write_bytes(data)
    c=sqlite3.connect(path);c.row_factory=sqlite3.Row
    return c

def reopen():
    adb('shell','am','start','-W','-n',MAIN);time.sleep(1)
    touch('JM WORKROOM','android.widget.Button');has('JM WORKROOM','cp05_reopen')

def main():
    OUT.mkdir(exist_ok=True)
    adb('install','emulator-input/JM_FOLD_ULTRA_LIVING_CONTACT_v1_0_DEBUG.apk',timeout=90)
    adb('shell','wm','size','720x1600');adb('shell','wm','density','320')
    adb('shell','am','start','-W','-n',MAIN);time.sleep(1.2)
    adb('shell','am','force-stop',PKG)
    raw=adb('exec-out','run-as',PKG,'cat','shared_prefs/jm.fold.ultra.prelaunch.v0.2.xml')
    tree=ET.fromstring(raw)
    for name,tag,value in [('ready','boolean','true'),('nav.last','int','0')]:
        for old in list(tree):
            if old.get('name')==name:tree.remove(old)
        ET.SubElement(tree,tag,{'name':name,'value':value})
    fixture=OUT/'CP05_DISPOSABLE_READY_FIXTURE.xml';fixture.write_bytes(ET.tostring(tree,encoding='utf-8',xml_declaration=True))
    adb('push',str(fixture),'/data/local/tmp/jm-cp05-fixture.xml')
    adb('shell','run-as',PKG,'cp','/data/local/tmp/jm-cp05-fixture.xml','shared_prefs/jm.fold.ultra.prelaunch.v0.2.xml')
    adb('shell','am','start','-W','-n',MAIN);time.sleep(1.2)
    before=pref_values()
    touch('JM WORKROOM','android.widget.Button');has('No documents here yet','cp05_empty_native_store')
    touch('New','android.widget.Button');touch('JSON data')
    has('data.json','cp05_created_document');capture('CP05_EDITOR_NARROW')
    touch('Save revision','android.widget.Button');has('Saved revision 1','cp05_first_checkpoint')
    touch('Tools','android.widget.Button');touch('Format / validate JSON','android.widget.Button')
    has('Draft saved locally','cp05_formatted_draft')
    touch('Save revision','android.widget.Button');has('Saved revision 2','cp05_second_checkpoint')
    # Type into actual native EditText; no SQLite/session injection.
    nodes=dump('cp05_editor_target');fields=[n for n in nodes if n.get('class')=='android.widget.EditText']
    assert len(fields)==1,fields
    x1,y1,x2,y2=map(int,re.findall(r'\d+',fields[0]['bounds']))
    adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))
    adb('shell','input','keyevent','123')
    adb('shell','input','text','CP05_NATIVE_TYPED_MARKER');time.sleep(.9)
    adb('shell','input','keyevent','4');time.sleep(.5)
    c=db();d=c.execute('SELECT * FROM documents').fetchone();assert d is not None
    assert 'CP05_NATIVE_TYPED_MARKER' in d['body'],d['body']
    assert 'CP05_NATIVE_TYPED_MARKER' not in d['saved']
    assert d['revision']==2 and d['project']=='jm-ecostate'
    assert c.execute('SELECT count(*) FROM revisions').fetchone()[0]==2;c.close()
    reopen();has('CP05_NATIVE_TYPED_MARKER','cp05_cold_draft_recovered')
    touch('History','android.widget.Button');touch('Revision 1');touch('Recover as draft','android.widget.Button')
    has('Draft saved locally','cp05_history_recovery')
    c=db();d=c.execute('SELECT * FROM documents').fetchone();r=c.execute('SELECT body FROM revisions WHERE revision=1').fetchone()[0]
    assert d['body']==r and d['revision']==2,'history must recover draft without rolling back revision';c.close()
    reopen();touch('Tools','android.widget.Button');touch('Stage a copy','android.widget.Button');touch('Append draft','android.widget.Button');has('JM draft updated','cp05_session_native_consequence');touch('Close','android.widget.Button')
    p=pref_values();assert 'creator' in p.get('session.draft.jm-ecostate.note','')
    for key in ('root','session.deck','reentry.points','project.shelf','project.active'):
        assert p.get(key)==before.get(key),(key,'protected ancestor changed')
    # Actual wide re-creation and local document reopening.
    adb('shell','wm','size','1400x1800');adb('shell','wm','density','280');time.sleep(1.4)
    has('JM WORKROOM','cp05_wide');capture('CP05_WORKROOM_WIDE')
    receipt={'status':'PASS','scope':'generic Android emulator CP05 only','setup':'explicit disposable ready fixture; onboarding NOT tested','ui_creation':True,'ui_typing':True,'sqlite_draft_persisted':True,'revision_history':True,'cold_resume':True,'ui_history_recovery':True,'session_transport':True,'protected_ancestor_state_unchanged':True,'narrow_wide':True,'physical_fold':False,'audible_tts':'NOT_TESTED','provider_auth':'NOT_TESTED','saf_file_picker':'NOT_TESTED'}
    (OUT/'JM_WORKROOM_CP05_RECEIPT.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt))
if __name__=='__main__':main()
