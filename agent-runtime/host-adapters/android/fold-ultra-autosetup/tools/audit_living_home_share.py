#!/usr/bin/env python3
"""CP07 Living Home -> actual Fold Ultra Android Share/native SessionDeck acceptance.
Runs only on disposable emulator; never claims owner Samsung device or real server.
"""
import json,subprocess,time,xml.etree.ElementTree as ET,shlex
from pathlib import Path
from emulator_dialog import clear_overlay_and_read,tap_node,require_emulator
OUT=Path("emulator-proof");OUT.mkdir(exist_ok=True)
PKG="com.jmisjustme.foldultra"
PREFS="shared_prefs/jm.fold.ultra.prelaunch.v0.2.xml"

def adb(*args):
    p=subprocess.run(["adb",*args],capture_output=True,timeout=60)
    if p.returncode:raise AssertionError(p.stderr.decode(errors="replace")[-600:])
    return p.stdout

def prefs():
    xml=adb("exec-out","run-as",PKG,"cat",PREFS)
    return {a.get("name"):(a.get("value") if a.get("value") is not None else a.text)
            for a in ET.fromstring(xml)}

def current(p):
    return next(s for s in json.loads(p["session.deck"]) if s["project_id"]=="jm-games-house")

def receipt(challenge,wrong=False):
    mission="jmlh-native-emulator-qa"
    project="JM Games House"
    return {
      "schema":"JM.LivingHome.CP07.CloudReturn/1.0",
      "missions":[{
        "missionId":mission,"challenge":challenge,"project":project,
        "state":"RETURN_RECEIVED_UNVERIFIED","returnSignalId":123,
        "returnText":"SYNTHETIC_EMULATOR_ONLY: Native JM checkpoint contact",
        "outgoing":{"schema":"JM.LivingHome.CloudMission/1.0",
           "missionId":mission,
           "challenge":"f"*32 if wrong else challenge,
           "project":project,"source":{"id":"jm-games-house"}}
      }]
    }

def share(doc):
    data=json.dumps(doc,separators=(",",":"))
    # Quoting preserves JSON punctuation through adb shell's transport.
    cmd=("am start -W -n "+PKG+"/.MainActivity -a android.intent.action.SEND -t text/plain "
         +"--es android.intent.extra.TEXT "+shlex.quote(data))
    adb("shell",cmd)
    time.sleep(1.5)

def dialog_control(title,button,label):
    nodes=clear_overlay_and_read(label)
    if not any(title in n.get("text","") for n in nodes):
        raise AssertionError("Expected native JM dialog missing: "+title)
    opts=[n for n in nodes if n.get("class")=="android.widget.Button"
          and n.get("text","").strip().casefold().startswith("approve new jm")]
    if len(opts)!=1:
        visible=[(n.get("text",""),n.get("class","")) for n in nodes if n.get("class","")=="android.widget.Button"]
        raise AssertionError("Expected one approve checkpoint button; actual buttons: "+repr(visible))
    tap_node(opts[0])
    time.sleep(1.4)

def run():
    require_emulator()
    baseline=prefs()
    assert baseline.get("project.active")=="jm-games-house"
    rev=current(baseline)["revision"]
    assert rev==3,rev
    original_points=baseline.get("reentry.points")
    challenge="0123456789abcdef0123456789abcdef"
    share(receipt(challenge))
    staged=prefs()
    pending=json.loads(staged.get("livinghome.return.pending","null"))
    assert pending["project_id"]=="jm-games-house"
    assert pending["native_expected_revision"]==3
    assert current(staged)==current(baseline),"Import mutated JM SessionDeck before approval"
    dialog_control("Living Home return","Approve new JM checkpoint","JM_CLOUD_OWNER_APPLY")
    saved=prefs()
    entry=current(saved)
    assert entry["revision"]==4,entry
    assert "SYNTHETIC_EMULATOR_ONLY" in entry["note"]
    assert saved.get("reentry.points")==original_points,"Old Return Point was overwritten"
    assert "livinghome.return.pending" not in saved,"Staged record retained after commit"
    assert len(json.loads(saved["livinghome.return.applied"]))==1
    # Import the identical return again; owner attempts to apply must fail closed.
    share(receipt(challenge))
    dialog_control("Living Home return","Approve new JM checkpoint","JM_CLOUD_REPLAY_BUTTON")
    nodes=clear_overlay_and_read("JM_CLOUD_REPLAY_HOLD")
    assert any("No project state changed" in x.get("text","") for x in nodes),"No replay HOLD"
    assert current(prefs())==entry,"Replay changed JM session"
    # Dismiss replay HOLD before independent malformed-source attempts.
    adb("shell","input","keyevent","4")
    time.sleep(.45)
    frozen=prefs()
    # Negative: wrong outgoing challenge may not stage or mutate a checkpoint.
    share(receipt(challenge,wrong=True))
    nodes=clear_overlay_and_read("JM_CLOUD_TAMPER_CHALLENGE")
    assert any("Living Home return refused" in x.get("text","") for x in nodes),"Tampered challenge not rejected"
    assert current(prefs())==entry,"Challenge tamper mutated checkpoint"
    adb("shell","input","keyevent","4")
    time.sleep(.45)
    # Negative: a matching displayed project name cannot hide a different source ID.
    forged=receipt(challenge)
    forged["missions"][0]["outgoing"]["source"]["id"]="wrong-shelf-project"
    share(forged)
    nodes=clear_overlay_and_read("JM_CLOUD_WRONG_SOURCE")
    assert any("Living Home return refused" in x.get("text","") for x in nodes),"Wrong source ID not rejected"
    assert current(prefs())==entry,"Wrong source mutated checkpoint"
    assert prefs().get("reentry.points")==original_points,"Return Point changed on negative import"
    adb("shell","input","keyevent","4")
    time.sleep(.45)
    # An actual process stop/reopen must retain the committed checkpoint and replay journal.
    adb("shell","am","force-stop",PKG)
    adb("shell","am","start","-W","-n",PKG+"/.MainActivity")
    time.sleep(1.2)
    restored=prefs()
    assert current(restored)==entry,"Native cloud return disappeared after cold restart"
    assert restored.get("livinghome.return.applied")==saved["livinghome.return.applied"]
    report={"schema":"JM.FoldCloudReturn.NativeEmulatorProof/1",
      "result":"PASS","scope":"SYNTHETIC_LEDGER_TO_NATIVE_ANDROID_UI_CHECKPOINT",
      "approved_revision":4,"return_points_unchanged":True,
      "replay_rejected":True,"tampered_challenge_rejected":True,
      "wrong_source_id_rejected":True,"cold_restart_persisted":True,
      "physical_fold_tested":False,"hosted_server_called":False}
    (OUT/"LIVING_HOME_NATIVE_RETURN_RECEIPT.json").write_text(json.dumps(report,indent=2))
    print("JM Living Home -> native PASS: approved revision 4, Return Point preserved, replay/tamper/source rejected, cold restart persisted.")
if __name__=="__main__":run()
