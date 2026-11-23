#!/usr/bin/env python3
"""Disposable-emulator owner-dialog driver with obstruction receipts.

Never run on a physical phone. The caller must already verify that a JM
request is PENDING; this module only taps a real, uniquely visible control.
Known emulator Android launcher ANRs are recorded and cleared, not ignored.
"""
import json
from pathlib import Path
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

OUT=Path("emulator-proof")
OUT.mkdir(exist_ok=True)


def adb(*args,timeout=40):
    p=subprocess.run(["adb",*args],capture_output=True,timeout=timeout)
    if p.returncode:
        raise AssertionError("ADB failed: "+p.stderr.decode(errors="replace")[-300:])
    return p.stdout


def require_emulator():
    serial=adb("get-serialno").decode().strip()
    if not serial.startswith("emulator-") or adb("shell","getprop","ro.kernel.qemu").decode().strip()!="1":
        raise AssertionError("Refusing to simulate touches on any physical owner device")


def xml(tag):
    adb("shell","uiautomator","dump","/sdcard/jm_ui_audit.xml")
    contents=adb("exec-out","cat","/sdcard/jm_ui_audit.xml")
    if not contents.startswith(b"<?xml"):
        raise AssertionError("Android UI hierarchy unavailable")
    (OUT/f"{tag}.xml").write_bytes(contents)
    return [n.attrib for n in ET.fromstring(contents).iter("node")]


def tap_node(node):
    m=re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]",node.get("bounds",""))
    if not m:
        raise AssertionError("No valid UI control bounds")
    x1,y1,x2,y2=map(int,m.groups())
    if x2<=x1 or y2<=y1:raise AssertionError("Invalid UI control area")
    adb("shell","input","tap",str((x1+x2)//2),str((y1+y2)//2))


def clear_overlay_and_read(tag):
    require_emulator()
    events=[]
    for attempt in range(7):
        nodes=xml(f"{tag}_{attempt}")
        # Both Android 15 system images present their OWN launcher ANR; only
        # these exact observed labels qualify. Never classify a JM app crash
        # or unknown dialog as an OS overlay or count it as a JM PASS.
        launchers=("Pixel Launcher isn't responding","Quickstep isn't responding")
        visible={n.get("text","") for n in nodes}
        blockers=[name for name in launchers if name in visible]
        if not blockers:
            if events:
                (OUT/f"{tag}_ENVIRONMENT.json").write_text(json.dumps(events,indent=2))
            return nodes
        if len(blockers)!=1:raise AssertionError("Ambiguous Android launcher obstruction")
        button="Wait" if attempt<3 else "Close app"
        choices=[n for n in nodes if n.get("text")==button and n.get("class")=="android.widget.Button"]
        if len(choices)!=1:raise AssertionError("Android launcher obstruction cannot be cleared safely")
        events.append({"obstruction":blockers[0],"attempt":attempt,"action":button,
                       "status":"environmental","jm_execution_proven":False})
        tap_node(choices[0])
        time.sleep(1)
    (OUT/f"{tag}_ENVIRONMENT.json").write_text(json.dumps(events,indent=2))
    raise AssertionError("HOLD: Android launcher obstructed real JM touch after bounded retries")


def press_approval(label,decision="APPLY"):
    nodes=clear_overlay_and_read(label)
    matches=[n for n in nodes if n.get("text")==decision
             and n.get("class")=="android.widget.Button"]
    if len(matches)!=1:
        raise AssertionError(f"HOLD: real JM {decision} button absent or ambiguous")
    # Application dialog title must prove this is JM's own bounded request.
    if not any("JM USB CONTACT" in n.get("text","") for n in nodes):
        raise AssertionError("HOLD: visible decision does not belong to JM USB CONTACT")
    tap_node(matches[0])
    (OUT/f"{label}_ACTUAL_BUTTON.json").write_text(json.dumps(
        {"control":decision,"visible_dialog":"JM USB CONTACT",
         "environment":"disposable emulator","physical_owner_contact":False},indent=2))
    print(f"{label}: real JM {decision} control tapped on disposable emulator")


if __name__=="__main__":
    if len(sys.argv) not in (2,3) or not re.fullmatch(r"[A-Z_]{2,40}",sys.argv[1]):
        raise SystemExit("Usage: emulator_dialog.py TEST_LABEL [APPLY|REJECT]")
    decision=sys.argv[2] if len(sys.argv)==3 else "APPLY"
    if decision not in {"APPLY","REJECT"}:
        raise SystemExit("Only APPLY or REJECT supported")
    press_approval(sys.argv[1],decision)
