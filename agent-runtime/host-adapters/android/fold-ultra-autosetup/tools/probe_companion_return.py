#!/usr/bin/env python3
"""CP02: native outbound Android intent + JM-owned contact trail on generic emulator.

Proof is dispatch/return-to-JM only; no external service account or API tested.
"""
import json
import time
from pathlib import Path
from audit_ui_flow import adb,tap,has,pref_values,capture

OUT=Path("emulator-proof")
PKG="com.jmisjustme.foldultra"
MAIN=f"{PKG}/.MainActivity"

def ledger(prefs):
    return json.loads(prefs.get("jm.contact.receipts","[]"))

def main():
    # CP01 cancels an owner-approved dialog and remains on the companions room.
    has("One working field. Many independent doors.","cp02_start")
    before=pref_values()
    count=len(ledger(before))
    tap("Open GitHub","cp02_choose_source")
    has("Open GitHub outside JM?","cp02_android_confirmation")
    tap("Open external door","cp02_explicit_approve")
    time.sleep(3)
    after=pref_values()
    rec=ledger(after)
    assert len(rec)>=count,("missing/invalid contact ledger",count,len(rec))
    assert len(rec)>0
    assert rec[-1]["name"]=="COMPANION_GITHUB",rec[-1]
    assert rec[-1]["kind"]=="ANDROID_VIEW_DISPATCH",rec[-1]
    assert rec[-1]["physical_verified"] is False,rec[-1]
    assert "UNVERIFIED" in rec[-1]["proof"],rec[-1]
    protected=("root","project.shelf","session.deck","reentry.points",
               "project.active","ready","cloud.return.pending","cloud.return.applied")
    for k in protected:
        assert before.get(k)==after.get(k),(k,"changed during owner-approved outbound dispatch")
    # This proves Android accepted ACTION_VIEW, not successful GitHub login/load.
    # Cold-launch after outward route must return to the same JM room.
    adb("shell","am","force-stop",PKG)
    adb("shell","am","start","-W","-n",MAIN)
    time.sleep(2)
    has("JM / COMPANION CONTACT","cp02_cold_return_to_jm")
    capture("COMPANION_CP02_REOPEN")
    tap("Open JM source intake","cp02_existing_jm_source_route")
    has("Owner-selected originals.","cp02_original_intake_inherited")
    (OUT/"COMPANION_CP02_RECEIPT.json").write_text(json.dumps({
        "status":"PASS","scope":"generic Android emulator only",
        "provider_authentication":"NOT_TESTED","owner_samsung":"NOT_TESTED",
        "owner_approved_dispatch":True,"bounded_jm_ledger":True,
        "protected_project_state_unchanged":True,
        "cold_reopen_same_room":True,"existing_intake_navigation":True
    },indent=2))
    print("PASS · CP02 approved Android dispatch, bounded local contact, cold companion return and intake contact; no provider/API claim")

if __name__=="__main__":
    main()
