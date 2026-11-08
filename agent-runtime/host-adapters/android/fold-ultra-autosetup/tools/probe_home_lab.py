#!/usr/bin/env python3
"""JM Home Lab CP01: real native UI taps on disposable generic Android API35.

Temporary ready-state fixture is ONLY for this isolated test; prelaunch
onboarding has its own CI gate. Never a Fold8/OPPO/device-pairing claim.
"""
import json
import re
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

def request_dialog_with_verified_touch(button,label):
    """Only pass after real emulator UI shows JM's actual owner-consent dialog.

    The stock API35 Quickstep ANR can swallow a touch even after its system
    overlay is dismissed. A bounded second touch is permissible ONLY while
    the original DEVICES page and the exact native Button remain visible.
    Never infer modal confirmation from a tap command returning exit 0.
    """
    for attempt in range(2):
        nodes=dump("cp08_pre_request_"+label+"_"+str(attempt))
        if any("Share a request-only template?" in n.get("text","") for n in nodes):
            return
        original_page=any(n.get("text","")=="Device contact" for n in nodes)
        still_button=any(n.get("class")=="android.widget.Button" and
            button in n.get("text","") for n in nodes)
        if not (original_page and still_button):
            capture("HOLD_cp08_request_"+label+"_"+str(attempt))
            raise AssertionError("HOLD: cannot confirm original DEVICES button after system overlay")
        tap(button,label+("_bounded_retry" if attempt else "_initial_touch"))
        nodes=dump("cp08_post_request_"+label+"_"+str(attempt))
        if any("Share a request-only template?" in n.get("text","") for n in nodes):
            return
        capture("CP08_TOUCH_WITHOUT_VISIBLE_DIALOG_"+label+"_"+str(attempt))
    raise AssertionError("HOLD: two real owner-style touches never displayed JM request dialog")


def preference_mode():
    xml=adb("exec-out","run-as",PKG,"cat",
            "shared_prefs/jm.fold.ultra.home.lab.cp01.xml")
    tree=ET.fromstring(xml)
    return next((x.text for x in tree if x.get("name")=="layout.mode"),None)

def tap_with_actual_viewport(fragment,label):
    """Scoped Home Lab touch: use real active emulator size, not 1500px constant.

    Never infer a pass merely from visible text. Touch only an actual Button
    above the system navigation area, then the caller checks the resulting UI.
    """
    raw=adb("shell","wm","size").decode(errors="replace")
    sizes=re.findall(r"(\d+)x(\d+)",raw)
    assert sizes,("Cannot read active Android display dimensions",raw)
    width,height=map(int,sizes[-1])
    safe_bottom=height-90
    for attempt in range(9):
        nodes=dump("find_"+label+"_"+str(attempt))
        for n in nodes:
            if n.get("text")!=fragment or n.get("class")!="android.widget.Button":
                continue
            bounds=[int(x) for x in re.findall(r"\d+",n.get("bounds",""))]
            if len(bounds)!=4:continue
            x1,y1,x2,y2=bounds
            if x1<0 or x2>width or y1<100 or y2>safe_bottom:
                continue
            adb("shell","input","tap",str((x1+x2)//2),str((y1+y2)//2))
            time.sleep(.65)
            return
        adb("shell","input","swipe",str(width//2),str(height-180),
            str(width//2),str(height//4),"260")
        time.sleep(.35)
    capture("FAIL_"+label)
    raise AssertionError("No genuinely safe native button contact: "+fragment)

def main():
    OUT.mkdir(exist_ok=True)
    adb("install","emulator-input/JM_FOLD_ULTRA_CREATIONS_v1_1_DEBUG.apk",timeout=90)
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
    has("View current Home Lab checks","cp13_devices_github_checks")
    has("View verified baseline CI run","cp13_devices_verified_run")
    request_dialog_with_verified_touch("Prepare OPPO handoff text",
        "cp01_explicit_handoff_dialog")
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
    request_dialog_with_verified_touch("Prepare Fold8 Ultra handoff text",
        "cp01_oppo_to_fold_request")
    has("Share a request-only template?","cp01_oppo_to_fold_is_request_only")
    tap("Cancel","cp01_cancel_second_device_share")
    tap("Use Fold8 profile","cp01_restore_fold_profile_choice")
    tap("Use this profile","cp01_restore_fold_profile")
    has("Selected LOCAL profile · Fold8 Ultra","cp01_fold_profile_restored")
    assert pref_values()==before,"Role choices changed original JM sessions"
    # A real, reversible menu edit. Original JM Workroom and ROOT are untouched.
    tap("LAYOUT","cp02_menu_editor")
    tap("Move DEVICES up","cp02_reorder_device_tile")
    xml=adb("exec-out","run-as",PKG,"cat",
        "shared_prefs/jm.fold.ultra.home.lab.cp01.xml")
    keys={n.get("name"):n.text for n in ET.fromstring(xml)}
    assert keys.get("menu.tiles.FOLD8")=="ROOT,WORKROOM,DEVICES,DRAWER,LAYOUT,BACK",keys
    tap("Hide WORKROOM","cp02_hide_only_menu_tile")
    tap("HOME","cp02_preview_hidden_menu")
    nodes=dump("cp02_hidden_menu_real_ui")
    assert not any(n.get("text")=="WORKROOM" and
                   n.get("class")=="android.widget.Button" for n in nodes)
    has("JM ROOT","cp02_original_root_still_visible")
    tap("LAYOUT","cp02_restore_hidden_menu")
    tap_with_actual_viewport("Show WORKROOM","cp02_show_tile_again")
    tap_with_actual_viewport("Restore default JM tiles","cp02_restore_default_order")
    tap("HOME","cp02_original_order_restored")
    has("WORKROOM","cp02_workroom_tile_visible_again")
    # Different owner-selected profile = separate layout keys on the same emulator.
    tap("DEVICES","cp02_switch_to_oppo_for_layout")
    tap("Use OPPO profile","cp02_oppo_role_button")
    tap("Use this profile","cp02_oppo_role_approved")
    tap("LAYOUT","cp02_oppo_layout_workshop")
    tap("COMPACT / 2 columns","cp02_oppo_compact_independent")
    has("2 columns","cp02_oppo_compact_on_wide_screen")
    capture("CP02_OPPO_PROFILE_COMPACT")
    tap("DEVICES","cp02_switch_back_fold")
    tap("Use Fold8 profile","cp02_fold_role_button")
    tap("Use this profile","cp02_fold_role_approved")
    tap("HOME","cp02_fold_home_separate")
    has("4 columns","cp02_fold_auto_restored")
    assert pref_values()==before,"Menu editor changed protected original JM state"
    # CP13_OWNER_CORRECTION: The owner rejected any 60-minute session.
    # Inspect the new native *owner-tapped entrance* without opening the
    # external GitHub UI or occupying any real handset.
    has("JM HEADLESS · Open current checks","cp13_headless_phone_door")
    headless_nodes=dump("CP13_HEADLESS_PHONE_DOOR")
    assert any(n.get("text")=="JM HEADLESS · Open current checks"
               and n.get("class")=="android.widget.Button"
               for n in headless_nodes), "HEADLESS must be a real native Button"
    assert not any("JM ON MODE" in n.get("text","")
                   for n in headless_nodes), "Rejected wake-timer UI still visible"
    owner_pref=adb("exec-out","run-as",PKG,"cat",
        "shared_prefs/jm.fold.ultra.home.lab.cp01.xml")
    off_tree=ET.fromstring(owner_pref)
    assert not any(n.get("name")=="owner.onmode.foreground_until_ms"
                   for n in off_tree), "Retired timer preference survived app start"
    # The original owner JM layout and session state must remain unchanged.
    assert pref_values()==before, "Phone check door changed original JM state"

    receipt={
      "status":"PASS","scope":"generic Android emulator CP01+CP02 real native taps",
      "inherited_disposable_ready_fixture":True,
      "owner_installed_app":False,"real_phone":False,"remote_peer_paired":False,
      "root_entry":True,"app_drawer":True,"search_input":True,
      "oppo_independent_profile":True,"fold_profile_restored":True,
      "menu_reorder_and_restore":True,"menu_hide_show":True,
      "independent_oppo_layout":True,"protected_root_retained":True,
      "oppo_not_contacted":True,"owner_handoff_cancellation":True,
      "layout_switch":True,"cold_preference":True,"compact_and_expanded":True,
      "original_state_unchanged":True,"android_default_home":"NOT_CHANGED",
      "cp13_owner_headless_github_button":True,
      "cp13_no_timed_wake_button":True,
      "cp13_no_expiry_preference":True,
      "github_external_browser_launched":False,
      "github_job_triggered":False
    }
    (OUT/"JM_HOME_LAB_CP01_EMULATOR_RECEIPT.json").write_text(
        json.dumps(receipt,indent=2),encoding="utf-8")
    print(json.dumps(receipt))

if __name__=="__main__":
    main()
