#!/usr/bin/env python3
"""CP01 actual touch navigation on disposable Android emulator. Never owner phone."""
import json
import time
from pathlib import Path
from audit_ui_flow import adb,tap,has,pref_values,capture

OUT=Path("emulator-proof")
PKG="com.jmisjustme.foldultra"

def main():
    # Reopen known existing navigational route; route cannot alter project state.
    adb("shell","wm","size","720x1600")
    adb("shell","wm","density","320")
    adb("shell","am","force-stop",PKG)
    adb("shell","am","start","-W","-a","android.intent.action.VIEW",
        "-c","android.intent.category.BROWSABLE",
        "-d","jmfoldultra://open/continue")
    time.sleep(2)
    has("JM / RETURN POINT","companions_return_screen")
    adb("shell","input","keyevent","4")
    time.sleep(.8)
    has("JM PAIRED ROOT","companions_root_before")
    before=pref_values()
    tap("JM COMPANIONS","companions_touch_entry")
    has("One working field. Many independent doors.","companions_native_room")
    has("No passwords, tokens","companions_privacy_message")
    capture("COMPANIONS_COMPACT")
    tap("Open GitHub","companions_open_github_confirmation")
    has("Open GitHub outside JM?","companions_approval_gate")
    capture("COMPANIONS_APPROVAL_DIALOG")
    tap("Stay in JM","companions_cancel_launch")
    has("One working field. Many independent doors.","companions_cancel_returns")
    after=pref_values()
    protected=["root","project.shelf","session.deck","reentry.points",
               "project.active","ready","cloud.return.pending","cloud.return.applied"]
    for key in protected:
        assert before.get(key)==after.get(key),(key,"mutated by contact")
    (OUT/"COMPANION_CP01_RECEIPT.json").write_text(json.dumps({
        "status":"PASS","source":"generic Android emulator", "owner_fold_tested":False,
        "touch_entry":True,"screen_rendered":True,"confirmation_rendered":True,
        "external_launch_cancelled":True,"protected_state_unchanged":True
    },indent=2))
    print("PASS: native companion touch entry, confirmation, cancelled external route; protected state unchanged")

if __name__=="__main__":
    main()
