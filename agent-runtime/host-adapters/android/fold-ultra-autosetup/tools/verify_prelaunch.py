#!/usr/bin/env python3
"""Source/manifest conformance only. Never substitutes for owner-device proof."""
from pathlib import Path
import re
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
src = (root / "app/src/main/java/com/jmisjustme/foldultra/MainActivity.java").read_text(encoding="utf-8")
diagnostics = (root / "app/src/main/java/com/jmisjustme/foldultra/DevicePreflight.java").read_text(encoding="utf-8")
manifest = (root / "app/src/main/AndroidManifest.xml").read_text(encoding="utf-8")
gradle = (root / "app/build.gradle").read_text(encoding="utf-8")
tree = ET.fromstring(manifest)
assert tree.tag == "manifest"
ns = "{http://schemas.android.com/apk/res/android}"

def require(condition, label):
    if not condition:
        raise AssertionError(label)
    print("PASS", label)

require("JM.FoldUltraSetup/0.5" in src, "current export schema")
for old in ["JM.FoldUltraSetup/0.4", "JM.FoldUltraSetup/0.3", "JM.FoldUltraSetup/0.2", "JM.FoldUltraRoot/0.1"]:
    require(old in src, "schema migration guard "+old)
require("JM.FoldUltraPreflight/0.4" in diagnostics, "preflight JSON contract")
require("versionCode 5" in gradle and "versionName '0.5.0'" in gradle, "version code/name")
require("targetSdk 35" in gradle and "compileSdk 36" in gradle, "Android SDK context")
require('android.intent.action.SEND' in manifest and 'text/plain' in manifest, "explicit Android Share intake")
require('android:launchMode="singleTop"' in manifest, "share handoff activity")
require("<uses-permission" not in manifest, "no requested Android permissions")
require('android:allowBackup="false"' in manifest, "no unmanaged Android backup")
require("inspectIncoming" in src and "Append to your local root note?" in src, "explicit share approval")
require("getCharSequenceExtra(Intent.EXTRA_TEXT)" in src, "Android text-only share intake")
require("2500" in src and "10000" in src, "text and note input bounds")
require("new AlertDialog.Builder" in src and "Apply" not in manifest, "user choices remain in app")
require("DevicePreflight.inspect" in src and "preflight.last" in src, "owner-triggered local preflight")
require("owner_device_pass_claimed" in diagnostics and 'out.put("owner_device_pass_claimed",false)' in diagnostics, "owner device never claimed PASS")
require("hinge_state_measured" in diagnostics and 'out.put("hinge_state_measured",false)' in diagnostics, "no fabricated hinge sensor")
require('out.put("note_text_included",false)' in diagnostics and "note_sha256" in diagnostics, "diagnostic excludes root plaintext")
require('nativeHub()' in src and 'void session(String kind)' in src, "inherited native routes and bounded macros")
require('getPackageInfo(a.getPackageName(),PackageManager.GET_PERMISSIONS)' in diagnostics,
        "on-device permission inspection")
require('PREFLIGHT_EXPORT' in src and 'ACTION_CREATE_DOCUMENT' in src, "explicit receipt export")
require("JM_FOLD_ULTRA_SETUP_v0_5.json" in src, "correctly named configuration export")
require(len(re.findall(r'capability\("',src))==8, "eight native capability records")
require("COMPACT_OWNER" in diagnostics and "EXPANDED_OWNER" in diagnostics and "REOPEN_OWNER" in diagnostics,
        "owner-gated physical contact marks")
require("No background reading" in src, "share privacy notice")
bridge = (root / "app/src/main/java/com/jmisjustme/foldultra/UsbBridge.java").read_text(encoding="utf-8")
cli = (root / "tools/jm_fold_usb_bridge.py").read_text(encoding="utf-8")
require("JM.FoldBridgeRequest/0.5" in bridge and "JM.FoldBridgeRequest/0.5" in cli, "matched USB request contract")
require("UsbBridge.offer(this,sp" in src and "void usbRoom()" in src, "USB contact reachable in native UI")
require('setPositiveButton("APPLY"' in bridge and 'setNegativeButton("REJECT"' in bridge, "phone owner approval and rejection")
require("prepareSnapshot" in bridge and "bridge_snapshot.json" in bridge, "owner-prepared USB snapshot")
require("validateConfig" in bridge and "ROLLBACK" in bridge, "validated reversible JM-only restore")
require("run-as" in cli and "exec-in" in cli, "USB debug staging mechanism")
require("socket" not in bridge and "INTERNET" not in bridge, "no bridge web server or network permission")
print("JM FOLD ULTRA v0.5: STATIC PRELAUNCH + USB CONTRACT PASS")
