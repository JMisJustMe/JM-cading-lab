#!/usr/bin/env python3
"""Assert a native GALAXY screen from Android UI, tolerating one system-launcher ANR.

Recovery only targets Pixel Launcher dialog's "Wait" button. An actual JM app
error, unmatched UI text, or repeated launcher ANR remains a failing test.
"""
from pathlib import Path
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

def adb(*args):
    return subprocess.check_output(["adb", *args], timeout=45, stderr=subprocess.STDOUT)

def snapshot(path):
    adb("shell", "uiautomator", "dump", "/sdcard/jm_galaxy_dump.xml")
    data=adb("shell", "cat", "/sdcard/jm_galaxy_dump.xml")
    path.write_bytes(data)
    return list(ET.fromstring(data).iter("node"))

def label(node):
    return node.attrib.get("text", "")

def centre(rect):
    vals=[int(v) for v in re.findall(r"\d+", rect)]
    if len(vals)!=4:
        raise AssertionError("Malformed Android UI bounds")
    return str((vals[0]+vals[2])//2),str((vals[1]+vals[3])//2)

def main():
    if len(sys.argv) not in (3,4) or sys.argv[1] not in ("COLD","WARM","PROJECTS","CONTINUE","CAPTURE"):
        raise SystemExit("Usage: probe_galaxy_screen.py COLD|WARM|PROJECTS|CONTINUE|CAPTURE output.xml [expected-text]")
    phase=sys.argv[1]
    path=Path(sys.argv[2])
    expected=sys.argv[3] if len(sys.argv)==4 else "Your Fold already has tools."
    recovered=False
    for attempt in range(3):
        nodes=snapshot(path)
        texts=[label(n) for n in nodes]
        if any(expected in x for x in texts) and any(
             n.attrib.get("package")=="com.jmisjustme.foldultra" for n in nodes):
            print(f"JM ROUTE {phase} PASS · native screen visible · expected={expected} · system-recovery={recovered}")
            return
        if "Pixel Launcher isn't responding" in texts:
            if recovered:
                raise AssertionError("Pixel Launcher system ANR persisted after one recovery")
            wait=next((n for n in nodes if label(n)=="Wait" and
                      n.attrib.get("resource-id")=="android:id/aerr_wait"),None)
            if wait is None:
                raise AssertionError("Pixel Launcher ANR without recognised Wait action")
            x,y=centre(wait.attrib.get("bounds",""))
            adb("shell","input","tap",x,y)
            recovered=True
            (path.parent/(f"GALAXY_{phase}_ENVIRONMENT.txt")).write_text(
               "Transient Pixel Launcher ANR blocked UI hierarchy; pressed system Wait once. "
               "Not counted as JM app failure or proof.\n")
            time.sleep(4)
        else:
            if attempt==2:
                raise AssertionError(f"JM GALAXY {phase} not visible in Android UI: "+repr(texts[:12]))
            time.sleep(2)
    raise AssertionError("Unreachable GALAXY probe exit")

if __name__=="__main__":
    main()
