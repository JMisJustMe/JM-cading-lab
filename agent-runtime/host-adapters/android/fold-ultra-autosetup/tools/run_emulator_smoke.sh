#!/bin/sh
# Generic Android SDK 35 emulator smoke only; never a Samsung Fold physical Ding.
set -eu
mkdir -p emulator-proof
APK="emulator-input/JM_FOLD_ULTRA_LIVING_CONTACT_v1_0_DEBUG.apk"
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
python3 agent-runtime/host-adapters/android/fold-ultra-autosetup/tools/emulator_dialog.py OWNER
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
python3 agent-runtime/host-adapters/android/fold-ultra-autosetup/tools/emulator_dialog.py SESSION
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
# Return-point proof on disposable emulator, not owner Fold.
approve_dialog() {
  python3 agent-runtime/host-adapters/android/fold-ultra-autosetup/tools/emulator_dialog.py "$1"
  sleep 3
}
BRIDGE=agent-runtime/host-adapters/android/fold-ultra-autosetup/tools/jm_fold_usb_bridge.py
python3 "$BRIDGE" --serial emulator-5554 reentry-capture jm-games-house --expected-revision 1 > emulator-proof/CAPTURE_STAGE.txt
sleep 3
adb exec-out run-as com.jmisjustme.foldultra cat files/bridge_receipt.json > emulator-proof/CAPTURE_PENDING.json
python3 -c 'import json;d=json.load(open("emulator-proof/CAPTURE_PENDING.json"));assert d["kind"]=="reentry_capture" and d["status"]=="PENDING"'
approve_dialog CAPTURE
adb exec-out run-as com.jmisjustme.foldultra cat files/bridge_receipt.json > emulator-proof/CAPTURE_ACCEPTED.json
python3 -c 'import json;d=json.load(open("emulator-proof/CAPTURE_ACCEPTED.json"));assert d["kind"]=="reentry_capture" and d["status"]=="ACCEPTED"'
printf 'Newer camera polish work, preserve on return.\n' > emulator-proof/NEW_NOTE.txt
python3 "$BRIDGE" --serial emulator-5554 session-update jm-games-house --expected-revision 1 --phase POLISH --note-file emulator-proof/NEW_NOTE.txt --next "Test polish again" > emulator-proof/NEW_STAGE.txt
sleep 3
adb exec-out run-as com.jmisjustme.foldultra cat files/bridge_receipt.json > emulator-proof/NEW_PENDING.json
python3 -c 'import json;d=json.load(open("emulator-proof/NEW_PENDING.json"));assert d["kind"]=="session_update" and d["status"]=="PENDING"'
approve_dialog NEW
adb exec-out run-as com.jmisjustme.foldultra cat files/bridge_receipt.json > emulator-proof/NEW_ACCEPTED.json
python3 -c 'import json;d=json.load(open("emulator-proof/NEW_ACCEPTED.json"));assert d["status"]=="ACCEPTED"'
python3 "$BRIDGE" --serial emulator-5554 reentry-return jm-games-house --expected-revision 2 --point-revision 1 > emulator-proof/RETURN_STAGE.txt
sleep 3
adb exec-out run-as com.jmisjustme.foldultra cat files/bridge_receipt.json > emulator-proof/RETURN_PENDING.json
python3 -c 'import json;d=json.load(open("emulator-proof/RETURN_PENDING.json"));assert d["kind"]=="reentry_return" and d["status"]=="PENDING"'
approve_dialog RETURN
adb exec-out run-as com.jmisjustme.foldultra cat files/bridge_receipt.json > emulator-proof/RETURN_ACCEPTED.json
python3 -c 'import json;d=json.load(open("emulator-proof/RETURN_ACCEPTED.json"));assert d["kind"]=="reentry_return" and d["status"]=="ACCEPTED"'
adb exec-out run-as com.jmisjustme.foldultra cat shared_prefs/jm.fold.ultra.prelaunch.v0.2.xml > emulator-proof/REENTRY_PREFS.xml
python3 - <<'PY' > emulator-proof/RETURN_PROOF.txt
import json,xml.etree.ElementTree as ET
p={x.get("name"):x.text for x in ET.parse("emulator-proof/REENTRY_PREFS.xml").getroot()}
current=next(x for x in json.loads(p["session.deck"]) if x["project_id"]=="jm-games-house")
previous=next(x for x in json.loads(p["reentry.points"]) if x["project_id"]=="jm-games-house")
assert current["revision"]==3 and current["phase"]=="TEST"
assert "Arena test pass" in current["note"]
assert previous["source_revision"]==2 and previous["phase"]=="POLISH"
assert "Newer camera polish" in previous["note"]
print("JM v0.9 PASS: return created revision 3 and preserved former revision 2")
PY
printf '%s\n' \
  'GENERIC ANDROID EMULATOR v0.9: narrow boot PASS, wide boot PASS, cold reopen PASS, owner-approved reversible return point and stored history' \
  'Startup not proof of correct Fold UI layout, native Samsung Galaxy AI, or physical owner Ding.' \
  > emulator-proof/GENERIC_RECEIPT.txt

# Separate full-body gate: touch the actual native controls rather than relying
# solely on ADB-injected state changes. This can legitimately HOLD.
python3 agent-runtime/host-adapters/android/fold-ultra-autosetup/tools/audit_ui_flow.py

# The existing UI audit has just completed all five native prelaunch stages and checked ready=true.
# JM × Bixby Contact 002: prove a real implicit Android VIEW dispatch,
# cold/reentry and onNewIntent path, with no protected project/session mutation.
adb exec-out run-as com.jmisjustme.foldultra cat shared_prefs/jm.fold.ultra.prelaunch.v0.2.xml > emulator-proof/GALAXY_BEFORE_PREFS.xml
adb shell am force-stop com.jmisjustme.foldultra
adb shell am start -W -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d 'jmfoldultra://open/galaxy' > emulator-proof/GALAXY_COLD_VIEW.txt
sleep 3
# Recover at most once from a known *Pixel Launcher* system ANR overlay,
# without treating app invocation alone as a GALAXY screen PASS.
python3 agent-runtime/host-adapters/android/fold-ultra-autosetup/tools/probe_galaxy_screen.py COLD emulator-proof/GALAXY_COLD_UI.xml
# Warm dispatch must reach the existing Activity through onNewIntent.
adb shell am start -W -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d 'jmfoldultra://open/galaxy' > emulator-proof/GALAXY_WARM_VIEW.txt
sleep 2
python3 agent-runtime/host-adapters/android/fold-ultra-autosetup/tools/probe_galaxy_screen.py WARM emulator-proof/GALAXY_WARM_UI.xml
# New v1.0 routes must reach actual native rooms, not just resolve an Intent.
for ROUTE in projects continue capture; do
  adb shell am start -W -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d "jmfoldultra://open/$ROUTE" > "emulator-proof/CONTACT_V1_$ROUTE.txt"
  sleep 2
  case "$ROUTE" in
    projects) EXPECT="Actual JM bodies." ; PHASE=PROJECTS ;;
    continue) EXPECT="JM / RETURN POINT" ; PHASE=CONTINUE ;;
    capture) EXPECT="Owner-selected originals." ; PHASE=CAPTURE ;;
  esac
  python3 agent-runtime/host-adapters/android/fold-ultra-autosetup/tools/probe_galaxy_screen.py "$PHASE" "emulator-proof/CONTACT_V1_$ROUTE.xml" "$EXPECT"
done
adb exec-out run-as com.jmisjustme.foldultra cat shared_prefs/jm.fold.ultra.prelaunch.v0.2.xml > emulator-proof/GALAXY_AFTER_PREFS.xml
python3 - <<'PY' > emulator-proof/GALAXY_CONTACT_RECEIPT.txt
import xml.etree.ElementTree as ET
def values(path):
    return {node.get("name"):(node.get("value") if node.get("value") is not None else node.text)
            for node in ET.parse(path).getroot()}
a=values("emulator-proof/GALAXY_BEFORE_PREFS.xml")
b=values("emulator-proof/GALAXY_AFTER_PREFS.xml")
for field in ["root","project.shelf","session.deck","reentry.points","project.active","ready"]:
    assert a.get(field)==b.get(field),(field,a.get(field),b.get(field))
print("PASS · Android implicit deep link → native GALAXY screen, cold and warm; protected state unchanged")
print("NOT CLAIMED · Bixby understands the spoken section name, physical Samsung device test, Galaxy AI API access")
PY

# Negative proof follows positive native UI checks, leaving revision 3 in place.
python3 agent-runtime/host-adapters/android/fold-ultra-autosetup/tools/audit_negative_flows.py

# The CP07 cloud-return native intake is a distinct synthetic-on-emulator gate.
python3 agent-runtime/host-adapters/android/fold-ultra-autosetup/tools/audit_living_home_share.py
