#!/usr/bin/env python3
"""Real generic-emulator touch proof for the original JM-owned workroom.
No emulator injection of saved JM state; all mutations originate from real UI.
Never identifies generic Android as an actual Fold or an authenticated provider.
"""
import json
import time
from pathlib import Path
from audit_ui_flow import adb,has,tap,pref_values,capture,dump,scroll_header
from emulator_dialog import tap_node

OUT=Path("emulator-proof")
PKG="com.jmisjustme.foldultra"
MAIN=PKG+"/.MainActivity"
def equal_before_after(before,after,keys):
    for key in keys:
        assert before.get(key)==after.get(key),(key,"unexpected non-JM-Structure mutation")

def main():
    # Match the bounded physical touch coordinate field of the inherited
    # auditor: 720x1600 / 320 dpi. On the runner default 1080x2400,
    # its safety rule refuses buttons beyond y=1500, even when visible.
    # Device screen-size change applies ONLY to this disposable emulator.
    adb("shell","wm","size","720x1600")
    adb("shell","wm","density","320")
    # Fresh standalone or inherited mode: enter through genuine native UI.
    adb("shell","am","force-stop",PKG)
    adb("shell","am","start","-W","-n",MAIN)
    time.sleep(1.5)
    current=pref_values()
    if current.get("ready")!="true":
        # Fresh installation: earn real first-run consent; no ADB state injection.
        from audit_ui_flow import advance_stage
        has("INITIAL OPENING","original_fresh_opening")
        advance_stage("Begin the opening","YOUR PRIORITY","original_priority","INITIAL OPENING",1)
        advance_stage("Continue","SAME ROOT","original_pairing","YOUR PRIORITY",2)
        advance_stage("Continue","GALAXY + JM","original_galaxy","SAME ROOT",3)
        advance_stage("Continue","READY / USER AUTHORITY","original_owner","GALAXY + JM",4)
        tap("ENTER JM FOLD ULTRA","original_owner_enters")
        assert pref_values().get("ready")=="true","Fresh owner-entry did not persist"
    else:
        if not any("JM PAIRED ROOT" in n.get("text","") for n in dump("original_initial")):
            adb("shell","input","keyevent","4")
            time.sleep(.5)
    # After CP03 companion flow the persistent JM masthead is still visible,
    # but the active room can remain COMPANION. Go through the actual ROOT
    # button before searching for the Original Structures tool.
    # This must be a real Android control touch, not tab/state injection.
    tap("ROOT","original_explicit_root_tab")
    scroll_header("JM PAIRED ROOT","original_root_return")
    before=pref_values()
    tap("JM ORIGINAL STRUCTURES","original_enter")
    has("Build from the mechanism.","original_room_native")
    capture("ORIGINAL_LAB_BEFORE")
    # The editor lives BELOW the native header and engine card. Locate it
    # through real ScrollView movement rather than assuming first viewport.
    from audit_ui_flow import swipe
    editor=None
    for attempt in range(12):
        nodes=dump("original_editor_visible_"+str(attempt))
        edits=[n for n in nodes if n.get("class")=="android.widget.EditText"]
        if len(edits)>1:
            raise AssertionError("HOLD: multiple native JM editors; ambiguous source")
        if edits:
            import re
            bounds=edits[0].get("bounds","")
            m=re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]",bounds)
            if not m:raise AssertionError("HOLD: native editor lacks bounds")
            x1,y1,x2,y2=map(int,m.groups())
            if 110<=y1 and y2<=1500:
                editor=edits[0]
                break
            # The first upward movement can leave the editor underneath
            # Android's status bar (observed y=70..307). Reverse direction
            # until its actual touch bounds are safe, rather than overscrolling.
            if y1<110:
                swipe("down")
                continue
        swipe("up")
    if editor is None:
        capture("FAIL_ORIGINAL_EDITOR_NOT_VISIBLE")
        raise AssertionError("HOLD: no safe visible native JM source editor after 12 bounded swipes")
    tap_node(editor)
    adb("shell","input","text","JM%soriginal%sstructure")
    time.sleep(.6)
    adb("shell","input","keyevent","4")
    time.sleep(.4)
    live=pref_values()
    assert live.get("jm.original.v0.1.draft")=="JM original structure",live.get("jm.original.v0.1.draft")
    equal_before_after(before,live,("root","project.shelf","session.deck","reentry.points","project.active","ready"))
    tap("INSPECT STRUCTURE","original_inspect_touch")
    has("JM structure / live analysis","original_actual_analysis_dialog")
    has("SHA-256","original_actual_digest_visible")
    capture("ORIGINAL_LAB_INSPECT")
    tap("Return to work","original_analysis_close")
    tap("PREVIEW","original_snapshot_preview")
    has("Preserve JM snapshot 1?","original_snapshot_consent")
    tap("SAVE SNAPSHOT","original_snapshot_owner_commit")
    saved=pref_values()
    assert saved.get("jm.original.v0.1.snapshot")=="JM original structure"
    assert saved.get("jm.original.v0.1.revision")=="1"
    assert saved.get("jm.original.v0.1.previous","")==""
    equal_before_after(before,saved,("root","project.shelf","session.deck","reentry.points","project.active","ready"))
    tap("EXACT DIFF","original_diff_touch")
    has("JM line comparison","original_diff_dialog")
    has("unchanged 1","original_exact_same_line")
    tap("Return to work","original_diff_close")
    tap("REVIEW → add analysis","original_project_preview")
    has("Stage local JM analysis?","original_project_consent")
    tap("ADD TO JM PROJECT DRAFT","original_project_approved")
    after=pref_values()
    active=after.get("project.active","jm-ecostate")
    draft=after.get("session.draft."+active+".note","")
    assert "[JM ORIGINAL STRUCTURES · LOCAL]" in draft,("JM project draft not staged",active)
    equal_before_after(before,after,("root","project.shelf","session.deck","reentry.points","project.active","ready"))
    has("JM / SESSION CONTACT","original_session_room_after_handoff")
    capture("ORIGINAL_LAB_PROJECT_DRAFT")
    # Reopen without writing phantom revision; real preferences remain.
    adb("shell","am","force-stop",PKG)
    adb("shell","am","start","-W","-n",MAIN)
    time.sleep(1.5)
    replay=pref_values()
    assert replay.get("jm.original.v0.1.revision")=="1"
    assert replay.get("jm.original.v0.1.snapshot")=="JM original structure"
    assert replay.get("session.draft."+active+".note")==draft
    assert replay.get("session.deck")==before.get("session.deck")
    receipt={"schema":"JM.OriginalStructures.AndroidProof/0.1","status":"PASS",
      "environment":"generic Android emulator; NOT Samsung Fold",
      "source_edit_real_touch":True,"digest_dialog_native":True,
      "snapshot_owner_confirmed":True,"snapshot_revision":1,
      "exact_diff_dialog_native":True,"cross_body_draft_actual":True,
      "saved_project_checkpoint_unchanged":True,"cold_reopen_draft_persisted":True,
      "external_provider_authenticated":False,"physical_fold_tested":False}
    (OUT/"JM_ORIGINAL_STRUCTURES_ANDROID_RECEIPT.json").write_text(json.dumps(receipt,indent=2))
    print("JM ORIGINAL STRUCTURES CP01 · REAL ANDROID TOUCH + SNAPSHOT + DIFF + SESSIONDECK DRAFT + COLD REOPEN PASS")

if __name__=="__main__":
    main()
