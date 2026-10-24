#!/usr/bin/env python3
"""Simulate the five *visible* prelaunch controls on a disposable Android emulator.

Never touches a physical device. Refuses to forge app readiness in SharedPrefs.
"""
import re
import subprocess
import time
import xml.etree.ElementTree as ET

def adb(*args):
    return subprocess.check_output(["adb", *args],timeout=45,stderr=subprocess.STDOUT)

def centre(bounds):
    x=[int(n) for n in re.findall(r"\d+",bounds)]
    if len(x)!=4:
        raise AssertionError("Bad Android button bounds")
    return str((x[0]+x[2])//2),str((x[1]+x[3])//2)

def snapshot():
    adb("shell","uiautomator","dump","/sdcard/jm_prelaunch_dump.xml")
    xml=adb("shell","cat","/sdcard/jm_prelaunch_dump.xml")
    return list(ET.fromstring(xml).iter("node"))

def tap_visible(substring):
    for attempt in range(14):
        nodes=snapshot()
        button=next((n for n in nodes if substring in n.attrib.get("text","")
            and n.attrib.get("class")=="android.widget.Button"
            and n.attrib.get("clickable")=="true"),None)
        if button is not None:
            x,y=centre(button.attrib.get("bounds",""))
            adb("shell","input","tap",x,y)
            time.sleep(1)
            print("Owner-simulated visible JM control:",substring)
            return
        if any(n.attrib.get("text","")=="Pixel Launcher isn't responding" for n in nodes):
            raise AssertionError("Emulator Pixel Launcher ANR while doing JM prelaunch")
        adb("shell","input","swipe","700","1480","700","460","360")
        time.sleep(0.5)
    raise AssertionError("Unable to reach visible JM prelaunch control: "+substring)

for label in ["Begin the opening","Continue","Continue","Continue","ENTER JM FOLD ULTRA"]:
    tap_visible(label)
print("PASS · Five owner-simulated native setup controls touched")
