#!/usr/bin/env python3
"""CP06 native OPENBOX/Creations owner-tap proof on disposable generic Android only."""
import json
import re
import time
from pathlib import Path
from audit_ui_flow import adb, capture, dump, has, tap, pref_values
from probe_home_lab import ready_fixture

PKG="com.jmisjustme.foldultra"
OUT=Path("emulator-proof")
APK="emulator-input/JM_FOLD_ULTRA_CREATIONS_v1_1_DEBUG.apk"

def tap_search_input():
    nodes=dump("CP06_CREATIONS_EDIT_FIELD")
    fields=[n for n in nodes if n.get("class")=="android.widget.EditText"
            and "Find OPENBOX" in n.get("text","")]
    if len(fields)!=1:raise AssertionError("Unique native search field not visible")
    bounds=[int(v) for v in re.findall(r"\d+",fields[0].get("bounds",""))]
    if len(bounds)!=4:raise AssertionError("No actual search field bounds")
    width,height=[int(v) for v in re.findall(r"\d+",adb("shell","wm","size").decode())[-2:]]
    x1,y1,x2,y2=bounds
    if not (0<=x1<x2<=width and 110<=y1<y2<height-90):
        raise AssertionError("Search field is outside safe touch viewport")
    adb("shell","input","tap",str((x1+x2)//2),str((y1+y2)//2))
    adb("shell","input","text","OPENBOX")
    time.sleep(.6)
    adb("shell","input","keyevent","KEYCODE_BACK")
    time.sleep(.4)

def main():
    OUT.mkdir(exist_ok=True)
    adb("install",APK,timeout=90)
    adb("shell","wm","size","720x1600")
    adb("shell","wm","density","320")
    ready_fixture()
    before=pref_values()
    tap("JM CREATIONS / OPENBOX","cp06_root_creations_button")
    has("My Creations","cp06_native_creations_screen")
    capture("CP06_CREATIONS_ROOT")
    tap_search_input()
    has("JM OPENBOX","cp06_search_original_editor")
    has("v2.0 CP10","cp06_openbox_version_source")
    capture("CP06_OPENBOX_FILTERED")
    tap("JM OPENBOX","cp06_explicit_openbox_preview")
    has("Open JM OPENBOX","cp06_external_launch_confirmation")
    has("This opens an external original route","cp06_boundary_visible")
    tap("Stay","cp06_cancel_external_open")
    assert pref_values()==before,"Search or cancelled link changed original project preferences"
    adb("shell","input","keyevent","KEYCODE_BACK")
    has("JM FOLD ULTRA","cp06_return_original_root")
    receipt={
      "status":"PASS","scope":"generic Android API35 native UI / not Fold8 touch",
      "new_creations_screen":True,"source_sections":9,
      "openbox_v2_cp10_visible":True,"native_search_filter":True,
      "explicit_open_confirmation":True,"cancel_preserves_original_app_data":True,
      "android_home_replaced":False,"physical_device_checked":False,
      "owner_acceptance":"OPEN"
    }
    (OUT/"JM_FOLD_CREATIONS_CP06_EMULATOR_RECEIPT.json").write_text(
        json.dumps(receipt,indent=2),encoding="utf-8")
    print(json.dumps(receipt))

if __name__=="__main__":
    main()
