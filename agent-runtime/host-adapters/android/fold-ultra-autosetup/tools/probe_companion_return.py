#!/usr/bin/env python3
"""CP02: native outbound Android intent + JM-owned contact trail on generic emulator.

Proof is dispatch/return-to-JM only; no external service account or API tested.
"""
import json
import time
from pathlib import Path
from audit_ui_flow import adb,tap,has,pref_values,capture,dump,swipe,scroll_header

OUT=Path("emulator-proof")
PKG="com.jmisjustme.foldultra"
MAIN=f"{PKG}/.MainActivity"

def ledger(prefs):
    return json.loads(prefs.get("jm.contact.receipts","[]"))

def touch_safe(prefix,label):
    """Tap an unobstructed native button, not one partly under Android bars."""
    import re
    for attempt in range(16):
        nodes=dump("safe_"+label+"_"+str(attempt))
        found=[n for n in nodes
               if n.get("class")=="android.widget.Button"
               and n.get("text","").startswith(prefix)]
        if found:
            m=re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]",found[0].get("bounds",""))
            if not m:raise AssertionError("Missing Android button bounds: "+prefix)
            x1,y1,x2,y2=map(int,m.groups())
            if y1<150:
                # Move it down into touchable content, away from status icons.
                adb("shell","input","swipe","360","360","360","830","260")
                time.sleep(.45)
                continue
            if y2>1460:
                adb("shell","input","swipe","360","1240","360","850","260")
                time.sleep(.45)
                continue
            adb("shell","input","tap",str((x1+x2)//2),str((y1+y2)//2))
            time.sleep(.75)
            return
        swipe("up")
    capture("FAIL_SAFE_"+label)
    raise AssertionError("No fully touchable Android button found: "+prefix)

def main():
    # CP01 cancels an owner-approved dialog and remains on the companions room.
    has("One working field. Many independent doors.","cp02_start")
    before=pref_values()
    count=len(ledger(before))
    touch_safe("Open GitHub","cp02_choose_source")
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
    nodes=dump("cp02_cold_reentry_overlay_check")
    # Some generic Android restorations retain the PREVIOUS JM-owned
    # confirmation dialog, obscuring the correctly restored Companion screen.
    # Only the exact, verified GitHub owner dialog may be dismissed here;
    # never tap an unknown provider prompt or count an obscured screen PASS.
    if any(n.get("text")=="Open GitHub outside JM?" for n in nodes):
        assert any(n.get("class")=="android.widget.Button" and
                   n.get("text","").upper()=="STAY IN JM" for n in nodes),\
               "HOLD: owner GitHub dialog has no safe cancel control"
        tap("STAY IN JM","cp02_dismiss_restored_owner_dialog")
        nodes=dump("cp02_after_owner_dialog_cancel")
    assert not any(n.get("text")=="Open GitHub outside JM?" for n in nodes),\
        "HOLD: owner confirmation still obstructs native JM return"
    scroll_header("JM / COMPANION CONTACT","cp02_cold_return_to_jm")
    capture("COMPANION_CP02_REOPEN")
    recovered=pref_values()
    for key in protected:
        assert before.get(key)==recovered.get(key),(key,"mutated by restored owner dialog")
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
