#!/bin/sh
# Generic Android SDK 35 emulator smoke only; never a Samsung Fold physical Ding.
set -eu
mkdir -p emulator-proof
APK="emulator-input/JM_FOLD_ULTRA_USB_CONTACT_v0_5_DEBUG.apk"
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
python3 agent-runtime/host-adapters/android/fold-ultra-autosetup/tools/jm_fold_usb_bridge.py --serial emulator-5554 profile MAKE > emulator-proof/USB_STAGE.txt
sleep 3
adb exec-out run-as com.jmisjustme.foldultra cat files/bridge_receipt.json > emulator-proof/USB_PENDING_RECEIPT.json
python3 -c 'import json; x=json.load(open("emulator-proof/USB_PENDING_RECEIPT.json")); assert x["status"]=="PENDING" and x["kind"]=="profile"'
printf '%s\n' \
  'GENERIC ANDROID EMULATOR v0.5: narrow boot PASS, wide boot PASS, cold reopen PASS, staged USB request PENDING.' \
  'Startup not proof of correct Fold UI layout, native Samsung Galaxy AI, or physical owner Ding.' \
  > emulator-proof/GENERIC_RECEIPT.txt
