#!/usr/bin/env python3
"""CP03: prove native JM checkpoint -> owner-previewed Android Sharesheet.

Disposable Android emulator only. Opening the chooser is not provider receipt.
"""
import json
import time
from pathlib import Path
from audit_ui_flow import adb,tap,has,pref_values,capture,scroll_header
from probe_companion_return import touch_safe

OUT=Path("emulator-proof")
PKG="com.jmisjustme.foldultra"
MAIN=PKG+"/.MainActivity"

def receipts(p):return json.loads(p.get("jm.contact.receipts","[]"))

def main():
    has("Owner-selected originals.","cp03_start_in_native_intake")
    adb("shell","input","keyevent","4")
    time.sleep(.5)
    has("JM PAIRED ROOT","cp03_root")
    tap("JM COMPANIONS","cp03_open_companions")
    has("One working field. Many independent doors.","cp03_companions")
    before=pref_values()
    touch_safe("Share saved JM checkpoint","cp03_preview_open")
    has("PRIVATE SOURCE LEAVES JM ONLY IF YOU APPROVE.","cp03_private_preview")
    has("JM ECOSTATE","cp03_checkpoint_provenance")
    capture("COMPANION_CP03_SAVED_PREVIEW")
    tap("Keep inside JM","cp03_cancel")
    assert receipts(before)==receipts(pref_values()),"cancel wrote a receipt"
    touch_safe("Share saved JM checkpoint","cp03_second_preview")
    has("PRIVATE SOURCE LEAVES JM ONLY IF YOU APPROVE.","cp03_second_privacy_warning")
    tap("Choose recipient","cp03_open_native_chooser")
    time.sleep(2)
    after=pref_values()
    rows=receipts(after)
    assert rows and rows[-1]["name"]=="COMPANION_SHARE",rows[-1] if rows else None
    assert rows[-1]["kind"]=="ANDROID_SHARE_REQUEST",rows[-1]
    assert rows[-1]["physical_verified"] is False
    assert "recipient/data receipt unverified" in rows[-1]["proof"],rows[-1]
    assert "Arena test pass" not in rows[-1]["proof"],"private note leaked to receipt"
    protected=("root","project.shelf","session.deck","reentry.points",
               "project.active","ready","cloud.return.pending","cloud.return.applied")
    for key in protected:assert before.get(key)==after.get(key),(key,"mutated by chooser")
    # The Android-owned Sharesheet remains in the foreground. A bare
    # am start while it is open does NOT prove native JM recovery: on
    # Android 15 it can leave the chooser sheet covering the Activity.
    has("Sharing text","cp03_android_sharesheet_visible")
    adb("shell","input","keyevent","4")
    time.sleep(.8)
    # Owner returns to JM explicitly; no recipient was selected and no
    # external provider/data-delivery claim is made by this test.
    adb("shell","am","start","-W","-n",MAIN)
    time.sleep(1.2)
    # The returned JM room can retain its prior ScrollView offset. Prove
    # the actual heading by scrolling back into the visible Android field.
    # This never writes stage, nav or session prefs or bypasses assertions.
    scroll_header("JM / COMPANION CONTACT","cp03_after_owner_cancel")
    # Only now test JM process death and restart in absence of OS overlay.
    adb("shell","am","force-stop",PKG)
    adb("shell","am","start","-W","-n",MAIN)
    time.sleep(2)
    has("JM / COMPANION CONTACT","cp03_reopen_companion")
    capture("COMPANION_CP03_REOPEN")
    (OUT/"COMPANION_CP03_RECEIPT.json").write_text(json.dumps({
        "status":"PASS","scope":"generic Android emulator",
        "share_preview_visible":True,"share_cancel_unchanged":True,
        "sharesheet_requested_by_owner":True,"sharesheet_visible":True,
        "sharesheet_cancelled_without_recipient":True,
        "provider_selected":False,"content_delivery_proven":False,
        "bounded_own_ledger":True,"project_history_unchanged":True,
        "cold_return":True,"owner_device":"NOT_TESTED"
    },indent=2))
    print("PASS · CP03 private checkpoint preview/cancel/Android chooser request; recipient delivery untested")

if __name__=="__main__":
    main()
