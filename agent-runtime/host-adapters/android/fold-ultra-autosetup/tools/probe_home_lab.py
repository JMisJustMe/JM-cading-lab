#!/usr/bin/env python3
"""JM Home Lab CP01: real native UI taps on disposable generic Android API35.

Temporary ready-state fixture is ONLY for this isolated test; prelaunch
onboarding has its own CI gate. Never a Fold8/OPPO/device-pairing claim.
"""
import json
import time
from pathlib import Path
import xml.etree.ElementTree as ET
from audit_ui_flow import adb, capture, dump, has, tap, pref_values

PKG="com.jmisjustme.foldultra"
MAIN=PKG+"/.MainActivity"
OUT=Path("emulator-proof")

def ready_fixture():
    adb("shell","am","start","-W","-n",MAIN)
    adb("shell","am","force-stop",PKG)
    raw=adb("exec-out","run-as",PKG,"cat",
            "shared_prefs/jm.fold.ultra.prelaunch.v0.2.xml")
    tree=ET.fromstring(raw)
    for existing in list(tree):
        if existing.get("name") in ("ready","nav.last"):tree.remove(existing)
    ET.SubElement(tree,"boolean",{"name":"ready","value":"true"})
    ET.SubElement(tree,"int",{"name":"nav.last","value":"0"})
    path=OUT/"CP01_DISPOSABLE_READY_FIXTURE.xml"
    path.write_bytes(ET.tostring(tree,encoding="utf-8",xml_declaration=True))
    adb("push",str(path),"/data/local/tmp/jm-home-lab-ready.xml")
    adb("shell","run-as",PKG,"cp","/data/local/tmp/jm-home-lab-ready.xml",
        "shared_prefs/jm.fold.ultra.prelaunch.v0.2.xml")
    adb("shell","am","start","-W","-n",MAIN)
    time.sleep(1.5)

def open_lab():
    tap("JM HOME LAB","cp01_original_root_entry")
    has("Your JM home, your layout","cp01_real_native_home")

def preference_mode():
    xml=adb("exec-out","run-as",PKG,"cat",
            "shared_prefs/jm.fold.ultra.home.lab.cp01.xml")
    tree=ET.fromstring(xml)
    return next((x.text for x in tree if x.get("name")=="layout.mode"),None)

def main():
    OUT.mkdir(exist_ok=True)
    adb("install","emulator-input/JM_FOLD_ULTRA_LIVING_CONTACT_v1_0_DEBUG.apk",timeout=90)
    adb("shell","wm","size","720x1600")
    adb("shell","wm","density","320")
    ready_fixture()
    before=pref_values()

    open_lab()
    has("2 columns","cp01_auto_compact")
    capture("CP01_HOME_COMPACT")
    # The home TILE also contains APP DRAWER text. Do not mistake it for
    # the drawer screen; require a distinct help sentence plus an EditText.
    tap("APP DRAWER","cp01_drawer_tile")
    for attempt in range(2):
        nodes=dump("cp01_drawer_search_input_"+str(attempt))
        correct=(any("Launch installed, discoverable Android apps only by tapping one."
                     in n.get("text","") for n in nodes)
                 and any(n.get("class")=="android.widget.EditText" for n in nodes))
        if correct: break
        capture("CP01_DRAWER_NOT_REACHED_"+str(attempt))
        if attempt==0 and any(n.get("text","")=="APP DRAWER" and
                              n.get("class")=="android.widget.Button" for n in nodes):
            tap("APP DRAWER","cp01_drawer_tile_bounded_retry")
        else:
            raise AssertionError("Home tile failed to open native searchable drawer")
    else:
        raise AssertionError("No real app drawer after two owner-style taps")
    has("Launch installed, discoverable Android apps only by tapping one.",
        "cp01_drawer_actual_screen")
    capture("CP01_NATIVE_DRAWER_SEARCH")
    tap("DEVICES","cp01_device_panel")
    has("OPPO · NOT CONTACTED","cp01_oppo_not_contacted")
    has("EXISTING DONOR / JM PHONE","cp01_original_phone_laptop_donor")
    tap("Prepare OPPO handoff text","cp01_explicit_handoff_dialog")
    has("Share a request-only template?","cp01_request_only_warning")
    tap("Cancel","cp01_owner_cancels_request")
    assert pref_values()==before,"Canceled handoff changed protected Fold state"

    tap("LAYOUT","cp01_layout_panel")
    tap("EXPANDED / 4 columns","cp01_select_expanded")
    has("4 columns","cp01_user_selected_four_columns")
    assert preference_mode()=="EXPANDED","Layout preference was not saved"
    capture("CP01_HOME_EXPANDED_NARROW")
    adb("shell","am","force-stop",PKG)
    adb("shell","am","start","-W","-n",MAIN)
    time.sleep(1)
    open_lab()
    has("4 columns","cp01_cold_layout_persistence")
    tap("LAYOUT","cp01_auto_layout_button")
    tap("AUTO / 2 compact","cp01_reset_auto")
    assert preference_mode()=="AUTO"

    adb("shell","wm","size","1400x1800")
    adb("shell","wm","density","280")
    adb("shell","am","force-stop",PKG)
    adb("shell","am","start","-W","-n",MAIN)
    time.sleep(1.5)
    open_lab()
    has("4 columns","cp01_auto_expanded")
    capture("CP01_HOME_AUTO_EXPANDED")
    assert pref_values()==before,"Home Lab mutated original JM app state"
    # The two Android handsets keep independent local profiles, even offline.
    tap("DEVICES","cp01_wide_devices")
    tap("Use OPPO profile","cp01_choose_oppo_profile")
    has("Use OPPO layout profile?","cp01_role_confirmation")
    tap("Use this profile","cp01_approve_local_role")
    has("Selected LOCAL profile · OPPO","cp01_oppo_local_profile")
    has("Fold8 Ultra · NOT CONTACTED","cp01_fold_peer_unpaired")
    tap("Prepare Fold8 Ultra handoff text","cp01_oppo_to_fold_request")
    has("Share a request-only template?","cp01_oppo_to_fold_is_request_only")
    tap("Cancel","cp01_cancel_second_device_share")
    tap("Use Fold8 profile","cp01_restore_fold_profile_choice")
    tap("Use this profile","cp01_restore_fold_profile")
    has("Selected LOCAL profile · Fold8 Ultra","cp01_fold_profile_restored")
    assert pref_values()==before,"Role choices changed original JM sessions"
    receipt={
      "status":"PASS","scope":"generic Android emulator CP01 real native taps",
      "inherited_disposable_ready_fixture":True,
      "owner_installed_app":False,"real_phone":False,"remote_peer_paired":False,
      "root_entry":True,"app_drawer":True,"search_input":True,
      "oppo_independent_profile":True,"fold_profile_restored":True,
      "oppo_not_contacted":True,"owner_handoff_cancellation":True,
      "layout_switch":True,"cold_preference":True,"compact_and_expanded":True,
      "original_state_unchanged":True,"android_default_home":"NOT_CHANGED"
    }
    (OUT/"JM_HOME_LAB_CP01_EMULATOR_RECEIPT.json").write_text(
        json.dumps(receipt,indent=2),encoding="utf-8")
    print(json.dumps(receipt))

if __name__=="__main__":
    main()
