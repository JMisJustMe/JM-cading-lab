#!/usr/bin/env python3
"""Black-box native control regression on a disposable Android emulator.

This tests the ACTUAL touch UI after the existing USB/ADB state-change test.
It never touches the physical Samsung device or claims hinge proof.
Failure produces an unambiguous HOLD and leaves an evidence trail.
"""
import json
from pathlib import Path
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from emulator_dialog import clear_overlay_and_read

PACKAGE="com.jmisjustme.foldultra"
MAIN=f"{PACKAGE}/.MainActivity"
OUT=Path("emulator-proof")
OUT.mkdir(exist_ok=True)
RECEIPTS=[]


def adb(*args: str, timeout=40)->bytes:
    process=subprocess.run(["adb",*args],capture_output=True,timeout=timeout)
    if process.returncode:
        raise AssertionError(f"ADB {args[:3]} failed: {process.stderr.decode(errors='replace')[-260:]}")
    return process.stdout


def capture(name: str):
    (OUT/f"UI_{name}.png").write_bytes(adb("exec-out","screencap","-p"))
    if (OUT/f"UI_{name}.png").stat().st_size<=10000:
        raise AssertionError(f"{name} screenshot too small")


def dump(name:str)->list[dict]:
    # Inspects the real UI and records any transient Pixel Launcher overlay.
    # Never treats an obscured screen as a passing JM control.
    return clear_overlay_and_read("UI_"+name)


def match(nodes,fragment:str):
    return [n for n in nodes if fragment.lower() in n.get("text","").lower()]


def has(fragment:str,label:str)->None:
    nodes=dump("check_"+label)
    if not match(nodes,fragment):
        capture("FAIL_"+label)
        raise AssertionError(f"Missing live UI text {fragment!r} during {label}")
    RECEIPTS.append({"check":label,"result":"PASS","evidence":fragment})


def swipe(direction="up"):
    if direction=="up":
        adb("shell","input","swipe","360","1350","360","400","310")
    else:
        adb("shell","input","swipe","360","400","360","1350","310")
    time.sleep(.4)


def tap(fragment:str,label:str):
    # Start each control search at the current scroll offset, then scroll
    # down through the real screen. Never tap guessed coordinates.
    for index in range(12):
        nodes=dump("find_"+label+"_"+str(index))
        found=match(nodes,fragment)
        # Favor exact or prefix text and visible Button nodes.
        found=sorted(found,key=lambda n:(
            0 if n.get("text","").startswith(fragment) else 1,
            0 if n.get("class")=="android.widget.Button" else 1))
        if found:
            text=found[0].get("text","")
            bounds=found[0].get("bounds","")
            m=re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]",bounds)
            if not m:raise AssertionError(f"Control lacks bounds {label}: {text}")
            x1,y1,x2,y2=map(int,m.groups())
            adb("shell","input","tap",str((x1+x2)//2),str((y1+y2)//2))
            time.sleep(.55)
            RECEIPTS.append({"check":label,"result":"PASS","control":text})
            return
        swipe()
    capture("FAIL_"+label)
    raise AssertionError(f"Couldn't find visible touch control {fragment!r} for {label}")


def pref_values():
    data=adb("exec-out","run-as",PACKAGE,"cat","shared_prefs/jm.fold.ultra.prelaunch.v0.2.xml")
    root=ET.fromstring(data)
    return {n.get("name"):n.get("value",n.text) for n in root}


def main():
    # Previous emulator gate leaves the disposable installation in 'ready=false'
    # even though its USB plans and session history have been tested.
    # Prove the five-stage opening instead of modifying 'ready' through ADB.
    adb("shell","wm","size","720x1600")
    adb("shell","wm","density","320")
    adb("shell","am","force-stop",PACKAGE)
    adb("shell","am","start","-W","-n",MAIN)
    time.sleep(2)
    has("INITIAL OPENING","arrival")
    tap("Begin the opening","advance_arrival")
    has("YOUR PRIORITY","priority")
    tap("Continue","advance_priority")
    has("SAME ROOT","paired_fields")
    tap("Continue","advance_pair")
    has("GALAXY + JM","galaxy_discovery")
    tap("Continue","advance_galaxy")
    # The hosted emulator sometimes registers a visible tap during a Pixel
    # Launcher ANR transition without committing navigation. Verify the real
    # native stage and retry ONE visible owner control if still at Galaxy.
    n=dump("owner_stage_contact")
    if not match(n,"READY / USER AUTHORITY"):
        if match(n,"After entering JM") or match(n,"GALAXY + JM"):
            RECEIPTS.append({"check":"galaxy_navigation_interference",
                             "result":"RETRY","reason":"still on visible Galaxy stage"})
            tap("Continue","advance_galaxy_retry")
        else:
            raise AssertionError("Owner entry not visible and earlier Galaxy stage not proven")
    has("READY / USER AUTHORITY","owner_entry")
    tap("ENTER JM FOLD ULTRA","enter_owner_workfield")
    has("JM PAIRED ROOT","native_root")
    p=pref_values()
    assert p.get("ready")=="true",("Entry did not persist ready",p.get("ready"))
    RECEIPTS.append({"check":"owner_entry_persisted","result":"PASS"})

    # One-touch resume uses the real UI and previously USB-committed session.
    tap("RESUME PROJECT","resume_project_touch")
    has("JM / SESSION CONTACT","actual_session_room")
    has("Revision 3","session_revision_3")
    has("JM Games House","named_project")
    capture("COMPACT_SESSION")

    # Switching width must not replace the project or revision.
    adb("shell","wm","size","1400x1800")
    adb("shell","wm","density","280")
    time.sleep(2)
    has("JM / SESSION CONTACT","expanded_session_room")
    has("Revision 3","expanded_revision_preserved")
    capture("EXPANDED_SESSION")

    # Return-point screen: deliberately cancel. Verify no hidden mutation.
    tap("Capture or recover a JM Return Point","reentry_touch")
    has("JM / RETURN POINT","reentry_room")
    has("Captured from revision 2","return_state_visible")
    tap("RETURN → new revision","open_return_confirmation")
    has("Return without rewriting history?","return_confirmation")
    tap("Keep current","cancel_return")
    after=pref_values()
    deck=json.loads(after["session.deck"])
    current=next(x for x in deck if x["project_id"]=="jm-games-house")
    marks=json.loads(after["reentry.points"])
    point=next(x for x in marks if x["project_id"]=="jm-games-house")
    assert current["revision"]==3 and point["source_revision"]==2
    RECEIPTS.append({"check":"cancel_keeps_history","result":"PASS"})

    # OS pause → app process stop → reopen must retain last JM room.
    adb("shell","input","keyevent","3")
    time.sleep(1.2)
    adb("shell","am","force-stop",PACKAGE)
    adb("shell","am","start","-W","-n",MAIN)
    time.sleep(2)
    has("JM / RETURN POINT","room_reentered_after_restart")
    has("Captured from revision 2","reentry_point_survived_restart")
    capture("AFTER_RESTART")
    RECEIPTS.append({"check":"actual_native_ui_regression","result":"PASS",
                     "physical_fold_tested":False})
    (OUT/"FULLBODY_UI_RECEIPT.json").write_text(json.dumps(RECEIPTS,indent=2))
    print("JM v0.9 OWNER-UI BLACKBOX PASS: 5-stage opening, project room, paired layout, cancelled return, cold continuation.")


if __name__=="__main__":
    try:
        main()
    finally:
        (OUT/"FULLBODY_UI_PROGRESS.json").write_text(json.dumps(RECEIPTS,indent=2))
