#!/usr/bin/env python3
"""JM Fold Ultra Contact 003 disposable emulator: exact seven-room direct UI tests.
Never mutate projects by a public Intent, and never claim Samsung voice acceptance.
"""
import json
import subprocess
import time
from pathlib import Path
import xml.etree.ElementTree as ET
from emulator_dialog import adb, require_emulator, clear_overlay_and_read

OUT=Path("emulator-proof")
PKG="com.jmisjustme.foldultra"
MAIN=PKG+"/.MainActivity"
PREF="shared_prefs/jm.fold.ultra.prelaunch.v0.2.xml"
ROUTES=[
    ("root","CURRENT FIELD",None),
    ("galaxy","SAMSUNG NATIVE / JM INHERITANCE",None),
    ("projects","JM / PROJECT CONTACT",None),
    ("games","JM Games House","JM Beatmaker"),
    ("music","JM Beatmaker","JM Games House"),
    ("sessions","JM / SESSION CONTACT",None),
    ("recovery","JM / RETURN POINT",None),
]
PROTECTED=("root","ready","focus","session","project.shelf",
           "project.active","project.family","session.deck","reentry.points",
           "livinghome.return.applied","setup.last")

def snapshot_prefs():
    raw=adb("exec-out","run-as",PKG,"cat",PREF)
    root=ET.fromstring(raw)
    return {n.get("name"):(n.get("value") if n.get("value") is not None else n.text)
            for n in root}

def assert_room(name,marker,hidden):
    for attempt in range(4):
        nodes=clear_overlay_and_read("ROOM_"+name+"_"+str(attempt))
        texts=[n.get("text","") for n in nodes]
        if any(marker in t and n.get("package")==PKG for t,n in zip(texts,nodes)):
            if hidden is not None:
                assert not any(hidden in t and n.get("package")==PKG for t,n in zip(texts,nodes)),(
                    name,"unexpected other family item",hidden)
            return
        time.sleep(1)
    raise AssertionError("JM "+name+" screen not visibly reached: "+str(texts[:24]))

def contact(name,cold):
    if cold:adb("shell","am","force-stop",PKG)
    link="jmfoldultra://open/"+name
    result=adb("shell","am","start","-W","-a","android.intent.action.VIEW",
               "-c","android.intent.category.BROWSABLE","-d",link).decode(errors="replace")
    (OUT/("CONTACT003_"+name+"_START.txt")).write_text(result)
    assert "com.jmisjustme.foldultra/.MainActivity" in result,result[-600:]
    time.sleep(.9)
    return result

def main():
    require_emulator()
    start=snapshot_prefs()
    assert start.get("ready")=="true","Full inherited first-run UI not completed"
    proof=[]
    for i,(name,marker,excluded) in enumerate(ROUTES):
        started=contact(name,i==0)
        assert_room(name,marker,excluded)
        proof.append({"route":name,"cold":i==0,"marker":marker,"runtime":"PASS"})
        print("PASS · JM native room",name,"COLD" if i==0 else "WARM")
    # An untrusted explicit ACTION_VIEW cannot choose or mutate project state.
    bad=adb("shell","am","start","-W","-n",MAIN,
            "-a","android.intent.action.VIEW",
            "-d","jmfoldultra://open/games?select=other-project").decode(errors="replace")
    (OUT/"CONTACT003_NEGATIVE_START.txt").write_text(bad)
    assert_room("recovery_after_rejected_input","JM / RETURN POINT",None)
    finish=snapshot_prefs()
    differences={k:[start.get(k),finish.get(k)] for k in PROTECTED
                 if start.get(k)!=finish.get(k)}
    assert not differences,"Public voice/navigation changed native JM data: "+repr(differences)
    (OUT/"JM_BIXBY_CONTACT003_MULTIROOM_RECEIPT.json").write_text(json.dumps({
       "schema":"JM.FoldUltra.BixbyNavigationProof/0.3",
       "context":"generic Android emulator, NOT owner Samsung or Bixby recognition",
       "tested":proof,"unknown_uri":"HOLD",
       "protected_state_unchanged":True,
       "device_owner_acceptance":"HOLD","bixby_spoken_route_acceptance":"HOLD",
       "runtime":"PASS"},indent=2))
    print("CONTACT 003 PASS · 7 real native UI routes + unknown hold; protected JM prefs unchanged")

if __name__=="__main__":
    main()
