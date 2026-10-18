#!/usr/bin/env python3
"""Prove invalid and rejected USB proposals never mutate JM's current data."""
import json
from pathlib import Path
import subprocess
import time
import xml.etree.ElementTree as ET

PACKAGE="com.jmisjustme.foldultra"
BRIDGE="agent-runtime/host-adapters/android/fold-ultra-autosetup/tools/jm_fold_usb_bridge.py"
DECIDER="agent-runtime/host-adapters/android/fold-ultra-autosetup/tools/emulator_dialog.py"
OUT=Path("emulator-proof")
FIELDS=("root","focus","session","setup.last","project.active",
        "layout.compact","layout.expanded","session.deck","reentry.points")


def cmd(*args,stdin=None):
    p=subprocess.run(args,input=stdin,capture_output=True,timeout=45)
    if p.returncode:
        raise AssertionError(f"Command {args[:4]} exited {p.returncode}: {p.stderr.decode(errors='replace')[-250:]}")
    return p.stdout


def adb(*args):
    return cmd("adb",*args)


def state():
    root=ET.fromstring(adb("exec-out","run-as",PACKAGE,"cat",
                           "shared_prefs/jm.fold.ultra.prelaunch.v0.2.xml"))
    prefs={entry.get("name"):entry.get("value",entry.text) for entry in root}
    return {key:prefs.get(key) for key in FIELDS}


def receipt(label):
    raw=adb("exec-out","run-as",PACKAGE,"cat","files/bridge_receipt.json")
    parsed=json.loads(raw)
    (OUT/f"{label}_NEGATIVE_RECEIPT.json").write_bytes(raw)
    return parsed


def run():
    assert adb("get-serialno").decode().strip().startswith("emulator-"), "Not an emulator"
    baseline=state()
    # Existing positive QA has reached revision 3.
    entries=json.loads(baseline["session.deck"])
    assert any(p["project_id"]=="jm-games-house" and p["revision"]==3 for p in entries)

    (OUT/"STALE_NOTE.txt").write_text("This stale note MUST NOT overwrite revision 3.\n")
    result=cmd("python3",BRIDGE,"--serial","emulator-5554","session-update",
               "jm-games-house","--expected-revision","1","--phase","TEST",
               "--note-file",str(OUT/"STALE_NOTE.txt"),"--next","Untrusted stale change")
    (OUT/"STALE_STAGE.txt").write_bytes(result)
    time.sleep(3)
    invalid=receipt("STALE")
    assert invalid["kind"]=="session_update" and invalid["status"]=="INVALID",invalid
    assert state()==baseline, "STALE request mutated current JM data"

    result=cmd("python3",BRIDGE,"--serial","emulator-5554","plan","MAKE")
    (OUT/"REJECT_STAGE.txt").write_bytes(result)
    time.sleep(3)
    pending=receipt("REJECT_PENDING")
    assert pending["kind"]=="plan" and pending["status"]=="PENDING",pending
    cmd("python3",DECIDER,"REJECT_PLAN","REJECT")
    time.sleep(2)
    rejected=receipt("REJECT_FINAL")
    assert rejected["kind"]=="plan" and rejected["status"]=="REJECTED",rejected
    assert state()==baseline, "REJECT mutated current JM data"
    report={
        "schema":"JM.FoldUltraFullBodyNegativeTest/0.9",
        "stale_request":{"status":invalid["status"],"state_unchanged":True},
        "owner_rejection":{"status":rejected["status"],"state_unchanged":True},
        "emulator_only":True,
        "physical_fold_tested":False,
        "result":"PASS"
    }
    (OUT/"FULLBODY_NEGATIVE_RECEIPT.json").write_text(json.dumps(report,indent=2))
    print("JM v0.9 NEGATIVE PASS: stale proposal INVALID, owner REJECTED, persisted JM state unchanged.")


if __name__=="__main__":
    run()
