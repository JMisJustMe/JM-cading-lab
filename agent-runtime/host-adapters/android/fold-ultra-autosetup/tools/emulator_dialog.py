#!/usr/bin/env python3
"""Disposable-emulator owner-dialog driver with obstruction receipts.

Never run on a physical phone. The caller must already verify that a JM
request is PENDING; this module only taps a real, uniquely visible control.
Known emulator Pixel Launcher ANRs are recorded and cleared, not ignored.
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
        if not any("Pixel Launcher isn't responding" in n.get("text","") for n in nodes):
            if events:
                (OUT/f"{tag}_ENVIRONMENT.json").write_text(json.dumps(events,indent=2))
            return nodes
        # Never misattribute this emulator OS issue to JM, or count it PASS.
        button="Wait" if attempt<3 else "Close app"
        choices=[n for n in nodes if n.get("text")==button and n.get("class")=="android.widget.Button"]
        if len(choices)!=1:raise AssertionError("Pixel Launcher obstruction cannot be cleared safely")
        events.append({"obstruction":"Pixel Launcher ANR","attempt":attempt,"action":button,
                       "status":"environmental"})
        tap_node(choices[0])
        time.sleep(1)
    (OUT/f"{tag}_ENVIRONMENT.json").write_text(json.dumps(events,indent=2))
    raise AssertionError("HOLD: Pixel Launcher obstructed the JM approval after retries")


def press_approval(label):
    nodes=clear_overlay_and_read(label)
    matches=[n for n in nodes if n.get("text")=="APPLY"
             and n.get("class")=="android.widget.Button"]
    if len(matches)!=1:
        raise AssertionError("HOLD: real JM APPLY button absent or ambiguous")
    # Application dialog title must prove this is JM's own bounded request.
    if not any("JM USB CONTACT" in n.get("text","") for n in nodes):
        raise AssertionError("HOLD: visible APPLY does not belong to JM USB CONTACT")
    tap_node(matches[0])
    (OUT/f"{label}_ACTUAL_BUTTON.json").write_text(json.dumps(
        {"control":"APPLY","visible_dialog":"JM USB CONTACT",
         "environment":"disposable emulator","physical_owner_contact":False},indent=2))
    print(f"{label}: real JM APPLY control tapped on disposable emulator")


if __name__=="__main__":
    if len(sys.argv)!=2 or not re.fullmatch(r"[A-Z_]{2,40}",sys.argv[1]):
        raise SystemExit("Usage: emulator_dialog.py TEST_LABEL")
    press_approval(sys.argv[1])
