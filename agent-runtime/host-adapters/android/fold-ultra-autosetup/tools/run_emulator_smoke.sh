#!/bin/sh
# Generic Android SDK 35 emulator smoke only; never a Samsung Fold physical Ding.
set -eu
mkdir -p emulator-proof
APK="emulator-input/JM_FOLD_ULTRA_SESSION_CONTINUITY_v0_8_DEBUG.apk"
if [ ! -s "$APK" ]; then
  echo "HOLD: missing exact build artifact: $APK" >&2
  ls -al emulator-input >&2 || true
  exit 1
fi

adb install "$APK"
adb shell wm size 720x1600
adb shell wm density 320
adb shell am start -W -n com.jmisjustme.foldultra/.MainActivity > emulator-proof/NARROW_START.txt
sleep 4
adb shell pidof com.jmisjustme.foldultra > emulator-proof/NARROW_PID.txt
test -s emulator-proof/NARROW_PID.txt
adb exec-out screencap -p > emulator-proof/NARROW.png
test "$(wc -c < emulator-proof/NARROW.png)" -gt 10000

adb shell am force-stop com.jmisjustme.foldultra
adb shell wm size 1400x1800
adb shell wm density 280
adb shell am start -W -n com.jmisjustme.foldultra/.MainActivity > emulator-proof/WIDE_START.txt
sleep 4
adb shell pidof com.jmisjustme.foldultra > emulator-proof/WIDE_PID.txt
test -s emulator-proof/WIDE_PID.txt
adb exec-out screencap -p > emulator-proof/WIDE.png
test "$(wc -c < emulator-proof/WIDE.png)" -gt 10000

adb shell am force-stop com.jmisjustme.foldultra
adb shell am start -W -n com.jmisjustme.foldultra/.MainActivity > emulator-proof/REOPEN_START.txt
sleep 2
adb shell pidof com.jmisjustme.foldultra > emulator-proof/REOPEN_PID.txt
test -s emulator-proof/REOPEN_PID.txt
# ADB contact is staged, not auto-approved. The app writes PENDING on arrival.
python3 agent-runtime/host-adapters/android/fold-ultra-autosetup/tools/jm_fold_usb_bridge.py --serial emulator-5554 plan PLAYTEST > emulator-proof/USB_STAGE.txt
sleep 3
adb exec-out run-as com.jmisjustme.foldultra cat files/bridge_receipt.json > emulator-proof/USB_PENDING_RECEIPT.json
python3 -c 'import json; x=json.load(open("emulator-proof/USB_PENDING_RECEIPT.json")); assert x["status"]=="PENDING" and x["kind"]=="plan"'
# Simulate a human explicitly pressing APPLY *on the disposable emulator only*.
# This is automated QA, not physical Fold owner approval.
adb shell uiautomator dump /sdcard/jm_owner_ui.xml > emulator-proof/OWNER_UI_DUMP_COMMAND.txt
adb exec-out cat /sdcard/jm_owner_ui.xml > emulator-proof/OWNER_UI_BEFORE.xml
python3 - <<'PY' > emulator-proof/APPLY_COORDS.txt
import re,xml.etree.ElementTree as ET
tree=ET.parse("emulator-proof/OWNER_UI_BEFORE.xml")
candidates=[node for node in tree.iter() if node.attrib.get("text")=="APPLY"]
assert len(candidates)==1, "Expected one explicit on-screen APPLY control"
bounds=candidates[0].attrib["bounds"]
m=re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]",bounds)
assert m, "Missing clickable Android control bounds"
x1,y1,x2,y2=map(int,m.groups())
print((x1+x2)//2,(y1+y2)//2)
PY
read X Y < emulator-proof/APPLY_COORDS.txt
adb shell input tap "$X" "$Y"
sleep 3
adb exec-out run-as com.jmisjustme.foldultra cat files/bridge_receipt.json > emulator-proof/USB_OWNER_SIMULATED_RECEIPT.json
python3 - <<'PY'
import json
d=json.load(open("emulator-proof/USB_OWNER_SIMULATED_RECEIPT.json"))
assert d["status"]=="ACCEPTED" and d["kind"]=="plan",d
PY
adb exec-out run-as com.jmisjustme.foldultra cat shared_prefs/jm.fold.ultra.prelaunch.v0.2.xml > emulator-proof/PLAN_AFTER_APPLY_PREFS.xml
python3 - <<'PY'
import xml.etree.ElementTree as ET
root=ET.parse("emulator-proof/PLAN_AFTER_APPLY_PREFS.xml").getroot()
values={item.get("name"):(item.get("value") if item.get("value") is not None else item.text) for item in root}
required={"setup.last":"PLAYTEST","project.active":"jm-games-house","layout.compact":"QUICK",
          "layout.expanded":"QUICK","focus":"PLAY","session":"PLAYTEST"}
for k,v in required.items():
    assert values.get(k)==v,(k,values.get(k),v)
PY
# One independent project checkpoint, first PENDING then simulated owner approval.
printf 'Arena test pass. Keep active team logic.\n' > emulator-proof/PROJECT_NOTE.txt
python3 agent-runtime/host-adapters/android/fold-ultra-autosetup/tools/jm_fold_usb_bridge.py --serial emulator-5554 session-update jm-games-house --expected-revision 0 --phase TEST --note-file emulator-proof/PROJECT_NOTE.txt --next "Resume symmetry test" > emulator-proof/SESSION_STAGE.txt
sleep 3
adb exec-out run-as com.jmisjustme.foldultra cat files/bridge_receipt.json > emulator-proof/SESSION_PENDING.json
python3 -c 'import json;x=json.load(open("emulator-proof/SESSION_PENDING.json"));assert x["status"]=="PENDING" and x["kind"]=="session_update"'
adb shell uiautomator dump /sdcard/jm_session_approval_ui.xml > emulator-proof/SESSION_UI_COMMAND.txt
adb exec-out cat /sdcard/jm_session_approval_ui.xml > emulator-proof/SESSION_UI.xml
python3 - <<'PY' > emulator-proof/SESSION_APPLY_COORDS.txt
import re,xml.etree.ElementTree as ET
t=ET.parse("emulator-proof/SESSION_UI.xml")
buttons=[e for e in t.iter() if e.attrib.get("text")=="APPLY"]
assert len(buttons)==1, "Expected exactly one session approval button"
m=re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]",buttons[0].attrib["bounds"])
assert m
x1,y1,x2,y2=map(int,m.groups())
print((x1+x2)//2,(y1+y2)//2)
PY
read X Y < emulator-proof/SESSION_APPLY_COORDS.txt
adb shell input tap "$X" "$Y"
sleep 3
adb exec-out run-as com.jmisjustme.foldultra cat files/bridge_receipt.json > emulator-proof/SESSION_ACCEPTED.json
python3 -c 'import json;d=json.load(open("emulator-proof/SESSION_ACCEPTED.json"));assert d["status"]=="ACCEPTED" and d["kind"]=="session_update",d'
adb exec-out run-as com.jmisjustme.foldultra cat shared_prefs/jm.fold.ultra.prelaunch.v0.2.xml > emulator-proof/SESSION_STATE.xml
python3 - <<'PY'
import xml.etree.ElementTree as ET,json
data={x.get("name"):x.text for x in ET.parse("emulator-proof/SESSION_STATE.xml").getroot()}
deck=json.loads(data["session.deck"])
match=[x for x in deck if x["project_id"]=="jm-games-house"]
assert len(match)==1
entry=match[0]
assert entry["revision"]==1 and entry["phase"]=="TEST"
assert "Arena test pass" in entry["note"]
assert entry["next_action"]=="Resume symmetry test"
PY
printf '%s\n' \
  'GENERIC ANDROID EMULATOR v0.8: narrow boot PASS, wide boot PASS, cold reopen PASS, staged USB request PENDING then simulated owner APPLY ACCEPTED with verified JM-only state.' \
  'Startup not proof of correct Fold UI layout, native Samsung Galaxy AI, or physical owner Ding.' \
  > emulator-proof/GENERIC_RECEIPT.txt
