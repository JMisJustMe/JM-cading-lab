#!/usr/bin/env python3
"""Actual native Android emulator check for ECDSA-signed, independently pinned
Living Home return. No production keys, server, user device or owner credentials.
Requires preceding legacy CP07 import emulator pass (revision 4).
"""
import json, subprocess, time, shlex, xml.etree.ElementTree as ET
from pathlib import Path
from emulator_dialog import require_emulator,clear_overlay_and_read,tap_node
from audit_ui_flow import tap
OUT=Path("emulator-proof")
PKG="com.jmisjustme.foldultra"
PREFS="shared_prefs/jm.fold.ultra.prelaunch.v0.2.xml"
def adb(*args):
    p=subprocess.run(["adb",*args],capture_output=True,timeout=55)
    if p.returncode:raise AssertionError(p.stderr.decode(errors="replace")[-350:])
    return p.stdout
def prefs():
    xml=adb("exec-out","run-as",PKG,"cat",PREFS)
    return {x.get("name"):(x.get("value") if x.get("value") is not None else x.text)
            for x in ET.fromstring(xml)}
def entry(p):
    return next(x for x in json.loads(p["session.deck"]) if x["project_id"]=="jm-games-house")
def share(doc):
    value=json.dumps(doc,separators=(",",":"))
    assert len(value)<24000,"Android Share text cap"
    cmd=("am start -W -n "+PKG+"/.MainActivity -a android.intent.action.SEND -t text/plain "
         +"--es android.intent.extra.TEXT "+shlex.quote(value))
    adb("shell",cmd);time.sleep(1.5)
def inspect_dialog(label,phrase):
    nodes=clear_overlay_and_read(label)
    found=any(phrase.lower() in x.get("text","").lower() for x in nodes)
    if not found:
        texts=[x.get("text","") for x in nodes if x.get("text","")]
        raise AssertionError("Missing dialog "+phrase+"; "+repr(texts[:20]))
    return nodes
def tap_button(label,phrase):
    nodes=inspect_dialog(label,phrase)
    buttons=[n for n in nodes if n.get("class")=="android.widget.Button"
             and phrase.lower() in n.get("text","").lower()]
    if len(buttons)!=1:raise AssertionError("Expected one button: "+repr([n.get("text") for n in buttons]))
    tap_node(buttons[0]);time.sleep(1)
def run():
    require_emulator()
    baseline=prefs()
    assert entry(baseline)["revision"]==4,entry(baseline)
    points=baseline.get("reentry.points")
    path=OUT/"JM_SIGNED_NATIVE_BUNDLE_QA.json"
    signed=json.loads(path.read_text())
    pin=(OUT/"JM_SIGNED_NATIVE_PIN_QA.txt").read_text().strip()
    assert len(pin)==24
    assert baseline.get("livinghome.return.pinnedKeyId","")==""
    # Before independently pinning a key: a signed-looking fixture MUST HOLD.
    share(signed)
    inspect_dialog("SIGNED_WITHOUT_PIN","Living Home return refused")
    assert entry(prefs())==entry(baseline)
    assert prefs().get("livinghome.return.pinnedKeyId","")==""
    adb("shell","input","keyevent","4")
    # Owner pins independently presented key via the existing native UI.
    adb("shell","am","start","-W","-n",PKG+"/.MainActivity")
    time.sleep(.7)
    tap("ROOT","signed_root")
    tap("LIVING HOME / Pin independent server signing key","signed_owner_pin_open")
    nodes=inspect_dialog("SIGNED_PIN_DIALOG","Independent server signing key")
    fields=[n for n in nodes if n.get("class")=="android.widget.EditText"]
    assert len(fields)==1,"Missing editable owner key field"
    tap_node(fields[0])
    adb("shell","input","text",pin)
    time.sleep(.5)
    tap_button("SIGNED_PIN_COMMIT","pin id")
    assert prefs().get("livinghome.return.pinnedKeyId")==pin,"Owner pin did not commit"
    # Actual Android Share -> cryptographic verifier -> pending -> owner approval.
    share(signed)
    nodes=inspect_dialog("SIGNED_ACCEPTANCE_PREVIEW","SERVER-SIGNED SIGNAL")
    staged=prefs()
    pending=json.loads(staged["livinghome.return.pending"])
    assert pending["evidence_state"]=="SERVER_RETURN_SIGNATURE_VERIFIED"
    assert pending["server_key_id"]==pin
    assert pending["server_receipt_hash"]==signed["signedReceipt"]["receiptHash"]
    assert entry(staged)==entry(baseline),"Signed return changed native state before approval"
    tap_button("SIGNED_OWNER_APPROVE","Approve new JM")
    accepted=prefs()
    checkpoint=entry(accepted)
    assert checkpoint["revision"]==5,checkpoint
    assert "SERVER-SIGNED CONTACT" in checkpoint["note"]
    assert "external task unverified" in checkpoint["note"]
    assert accepted.get("reentry.points")==points,"Return Point overwritten"
    assert accepted.get("livinghome.return.pending") is None
    # Wrong signed payload and source ID must fail without another revision.
    for label,name in [
      ("SIGNED_TAMPER","JM_SIGNED_NATIVE_TAMPER_QA.json"),
      ("SIGNED_SOURCE","JM_SIGNED_NATIVE_SOURCE_QA.json")]:
        share(json.loads((OUT/name).read_text()))
        inspect_dialog(label,"Living Home return refused")
        assert entry(prefs())==checkpoint,label+" mutated JM SessionDeck"
        adb("shell","input","keyevent","4")
    # Replay the *same* valid receipt; approval must HOLD.
    share(signed)
    inspect_dialog("SIGNED_REPLAY_PREVIEW","SERVER-SIGNED SIGNAL")
    tap_button("SIGNED_REPLAY_SUBMIT","Approve new JM")
    inspect_dialog("SIGNED_REPLAY_REFUSED","No project state changed")
    assert entry(prefs())==checkpoint
    adb("shell","input","keyevent","4")
    # Cold process restart preserves approved revision, signer pin and Return Point.
    adb("shell","am","force-stop",PKG)
    adb("shell","am","start","-W","-n",PKG+"/.MainActivity")
    time.sleep(1.1)
    end=prefs()
    assert entry(end)==checkpoint
    assert end.get("livinghome.return.pinnedKeyId")==pin
    assert end.get("reentry.points")==points
    result={"schema":"JM.FoldSignedReturn.NativeEmulatorQA/1",
      "status":"PASS","source":"synthetic locally generated ECDSA key",
      "pinRequired":True,"pinViaActualUi":True,"actualAndroidECDSAVerification":True,
      "revision":5,"previousReturnPointPreserved":True,
      "tamperAndWrongSourceRejected":True,"replayRejected":True,
      "coldRestartPersisted":True,"physicalFoldTested":False,
      "hostedServerContacted":False}
    (OUT/"FOLD_NATIVE_SIGNED_RETURN_PROOF.json").write_text(json.dumps(result,indent=2))
    print("JM NATIVE SIGNED RETURN PASS: owner pin + ECDSA + signed checkpoint revision 5 + tamper/replay/restart.")
if __name__=="__main__":run()
