#!/usr/bin/env python3
"""CP04 isolated real-Android UI: external Share -> owner choice -> JM saved draft.

Disposable Android emulator, no provider login or owner Samsung device.
"""
import json
import time
from pathlib import Path
from audit_ui_flow import adb,has,tap,capture,pref_values

PKG="com.jmisjustme.foldultra"
MAIN=f"{PKG}/.MainActivity"
OUT=Path("emulator-proof")
OUT.mkdir(parents=True,exist_ok=True)
INPUT="JM_CP04_OWNER_SHARED_SOURCE_UNVERIFIED"

def inject(value):
    adb("shell","am","start","-W","-n",MAIN,
        "-a","android.intent.action.SEND","-t","text/plain",
        "--es","android.intent.extra.TEXT",value)
    time.sleep(1.3)

def main():
    apk=Path("emulator-input/JM_FOLD_ULTRA_LIVING_CONTACT_v1_0_DEBUG.apk")
    assert apk.is_file(),("missing audited APK",apk)
    adb("install",str(apk),timeout=80)
    adb("shell","wm","size","720x1600")
    adb("shell","wm","density","320")
    before=pref_values()
    inject(INPUT)
    has("SOURCE CONTACT / Android Share","cp04_owner_share_review")
    has("UNVERIFIED text","cp04_external_identity_not_claimed")
    has("Draft in JM project","cp04_project_option")
    capture("COMPANION_INBOX_REVIEW")
    tap("Draft in JM project","cp04_owner_accept_draft")
    time.sleep(.9)
    after=pref_values()
    key="session.draft.jm-ecostate.note"
    assert key in after,("native JM SessionDeck draft missing",list(after))
    text=after[key]
    assert "SHARED SOURCE" in text and "UNVERIFIED" in text and INPUT in text,text
    assert after.get("root")==before.get("root"),"root note mutated"
    assert after.get("session.deck")==before.get("session.deck"),"saved checkpoint mutated"
    assert after.get("project.active")==before.get("project.active"),"project selection changed"
    has("JM / SESSION CONTACT","cp04_native_session_room")
    capture("COMPANION_INBOX_SESSION_DRAFT")
    # Android activity re-entry without another ACTION_SEND must not replay
    # the original text, append a duplicate or commit a session checkpoint.
    adb("shell","am","force-stop",PKG)
    adb("shell","am","start","-W","-n",MAIN)
    time.sleep(1.3)
    reopened=pref_values()
    assert reopened.get(key)==text,"unsaved JM draft failed cold resume"
    assert reopened.get("session.deck")==before.get("session.deck")
    # Oversized adversarial share is explicitly refused rather than truncated
    # into root note or native project draft.
    inject("X"*2501)
    time.sleep(.8)
    negative=pref_values()
    assert negative.get(key)==text and negative.get("root")==before.get("root")
    assert negative.get("session.deck")==before.get("session.deck")
    receipt={"status":"PASS","scope":"generic Android isolated UI",
             "external_app_authenticated":False,
             "physical_samsung_tested":False,
             "share_review_rendered":True,"owner_draft_touch":True,
             "project_draft_persisted":True,"checkpoint_unchanged":True,
             "cold_resume_no_replay":True,"oversized_input_refused":True}
    (OUT/"JM_COMPANION_CP04_ISOLATED_INBOX.json").write_text(json.dumps(receipt,indent=2))
    print("PASS: CP04 native owner Share review -> real JM project draft -> cold resume, no session commit and oversized refusal")

if __name__=="__main__":main()
