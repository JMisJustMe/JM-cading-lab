"""Offline mock tests for the USB bridge CLI. No ADB/device required."""
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest import mock

import jm_fold_usb_bridge as bridge


class BridgeContractTests(unittest.TestCase):
    def test_profile_whitelist_and_request_identity(self):
        for session, focus in bridge.VALID_SESSIONS.items():
            request = bridge.new_profile_request(session)
            self.assertEqual(request["kind"], "profile")
            self.assertEqual(request["schema"], bridge.REQUEST_SCHEMA)
            self.assertEqual(request["focus"], focus)
            self.assertRegex(request["request_id"], r"^[0-9a-f]{32}$")
            self.assertLess(len(bridge.document_bytes(request)), bridge.MAX_SIZE)
        for bad in ("DROP-ALL", "", "ROOT", "HIDE"):
            with self.assertRaises(bridge.BridgeError):
                bridge.new_profile_request(bad)

    def test_reject_invalid_schemas_and_nonguarded_values(self):
        good = {
            "schema": "JM.FoldUltraSetup/0.5", "root": "Example owner's JM root",
            "focus": "CREATE", "session": "MAKE", "stage": 3,
            "native_group": "ASSIST",
        }
        self.assertEqual(bridge.validate_config(good), good)
        for field, invalid in [
            ("schema", "unknown"), ("root", ["list"]), ("focus", "DROP"),
            ("session", "OTHER"), ("stage", 900), ("stage", True),
            ("native_group", "NONE"), ("native_owner_marks", [1]),
        ]:
            payload = good.copy()
            payload[field] = invalid
            with self.subTest(field=field), self.assertRaises(bridge.BridgeError):
                bridge.validate_config(payload)

    def test_protected_snapshot_never_overwrites(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "owner" / "JM_snapshot.json"
            bridge.protected_write(path, b'{"schema":"TEST"}')
            self.assertEqual(path.read_bytes(), b'{"schema":"TEST"}')
            if os.name == "posix":
                self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            with self.assertRaises(FileExistsError):
                bridge.protected_write(path, b'{"schema":"NEW"}')
            self.assertEqual(path.read_bytes(), b'{"schema":"TEST"}')

    def test_staged_data_does_not_claim_applied(self):
        request = bridge.new_profile_request("PLAYTEST")
        calls = []
        def fake(adb, serial, *args, stdin=None, timeout=25):
            calls.append((args, stdin))
            if args[0] == "exec-out":
                return calls[0][1]
            return b""
        with mock.patch.object(bridge, "ensure_debug") as gate, \
             mock.patch.object(bridge, "adb_run", side_effect=fake):
            identity = bridge.stage_payload("adb", "test-device", request)
        gate.assert_called_once_with("adb", "test-device")
        self.assertEqual(identity, request["request_id"])
        self.assertEqual(calls[0][0][0], "exec-in")
        self.assertIn(b'"kind":"profile"', calls[0][1])
        self.assertEqual(calls[1][0][:3], ("exec-out", "run-as", bridge.PACKAGE))
        self.assertEqual(calls[2][0][:3], ("shell", "am", "start"))
        self.assertNotIn(b'"status":"ACCEPTED"', calls[0][1])

    def test_no_large_payload_and_sensitive_root_not_echoed(self):
        root = "DONT_ECHO_THIS_PRIVATE_ROOT"
        request = bridge.new_restore_request({
            "schema": "JM.FoldUltraSetup/0.4", "root": root,
        })
        self.assertIn(root, bridge.document_bytes(request).decode())
        self.assertNotIn(root, bridge.new_profile_request("MAKE").values())
        with self.assertRaises(bridge.BridgeError):
            bridge.document_bytes({"large": "a" * 66000})


    def test_project_catalog_validation(self):
        known = [
            {"id": "five-flip", "title": "FIVE//FLIP", "family": "GAMES", "url": ""},
            {"id": "jm-source", "title": "JM Source", "family": "BUILD",
             "url": "https://github.com/JMisJustMe/JM-cading-lab"},
        ]
        self.assertEqual(len(bridge.validate_project_shelf(known, "jm-source")), 2)
        with self.assertRaises(bridge.BridgeError):
            bridge.validate_project_shelf(known + [known[0]], "jm-source")
        with self.assertRaises(bridge.BridgeError):
            bridge.validate_project_shelf(known, "unknown-project")
        with self.assertRaises(bridge.BridgeError):
            bridge.validate_project_shelf([], "jm-source")

    def test_project_requests_are_staged_not_applied(self):
        item = bridge.project_bind_request("jm-beatmaker", "JM Beatmaker", "MUSIC",
                                           "https://jmisjustme.github.io/JM-cading-lab/")
        self.assertEqual(item["kind"], "project_bind")
        self.assertEqual(item["project"]["id"], "jm-beatmaker")
        self.assertRegex(item["request_id"], r"^[0-9a-f]{32}$")
        selected = bridge.project_select_request("five-flip")
        self.assertEqual(selected["kind"], "project_select")
        self.assertEqual(selected["project_id"], "five-flip")
        self.assertNotIn("status", selected)
        with self.assertRaises(bridge.BridgeError):
            bridge.project_select_request("../../data")

    def test_reject_untrusted_project_routes(self):
        bad = ["http://example.com", "https://localhost/x",
               "https://127.0.0.1/x", "https://192.168.1.2",
               "https://user:secret@example.com", "https://example.com:8443",
               "https://example.com/x#fragment", "https://example.com/with space"]
        for url in bad:
            with self.subTest(url=url), self.assertRaises(bridge.BridgeError):
                bridge.safe_project_url(url)
        self.assertEqual(bridge.safe_project_url(""), "")
        self.assertEqual(bridge.safe_project_url("https://github.com/JMisJustMe"),
                         "https://github.com/JMisJustMe")

    def test_v06_config_requires_valid_project_shelf(self):
        good = {
            "schema": "JM.FoldUltraSetup/0.6", "root": "JM project holder",
            "focus": "CREATE", "session": "MAKE", "stage": 4,
            "project_shelf": [{"id": "jm-ecostate", "title": "JM Ecostate",
                               "family": "ESTATE", "url": "https://jmisjustme.github.io/JM-cading-lab/"}],
            "active_project": "jm-ecostate",
            "layout_compact": "QUICK", "layout_expanded": "COMFORT",
            "setup_last": "MAKE",
        }
        self.assertEqual(bridge.validate_config(good), good)
        for key, bad in [("active_project", "missing"), ("project_shelf", []),
                         ("project_shelf", [dict(good["project_shelf"][0], id="bad id")])]:
            altered = dict(good)
            altered[key] = bad
            with self.subTest(field=key), self.assertRaises(bridge.BridgeError):
                bridge.validate_config(altered)


    def test_truncated_project_select_gets_bounded_retry(self):
        request = bridge.project_select_request("five-flip")
        trace = []
        payload = bridge.document_bytes(request)
        def fake(adb, serial, *args, stdin=None, timeout=25):
            trace.append(args)
            if args[0] == "exec-out":
                count = sum(1 for x in trace if x[0] == "exec-out")
                return payload[:58] if count == 1 else payload
            return b""
        with mock.patch.object(bridge, "ensure_debug"), \
             mock.patch.object(bridge, "adb_run", side_effect=fake):
            self.assertEqual(bridge.stage_payload("adb", "mock", request),
                             request["request_id"])
        self.assertTrue(any(len(x)>1 and x[:2]==("shell","-T") for x in trace))
        self.assertEqual(trace[-1][:3], ("shell", "am", "start"))

    def test_truncated_restore_does_not_reveal_root_in_shell(self):
        sensitive = "PRIVATE JM NOTE DO NOT REVEAL"
        request = bridge.new_restore_request({
            "schema": "JM.FoldUltraSetup/0.5", "root": sensitive
        })
        trace = []
        def fake(adb, serial, *args, stdin=None, timeout=25):
            trace.append(args)
            return b"partial" if args[0] == "exec-out" else b""
        with mock.patch.object(bridge, "ensure_debug"), \
             mock.patch.object(bridge, "adb_run", side_effect=fake):
            with self.assertRaises(bridge.BridgeError):
                bridge.stage_payload("adb", "mock", request)
        self.assertFalse(any("base64 -d" in str(x) for x in trace))
        self.assertFalse(any(sensitive in str(x) for x in trace))
        self.assertFalse(any(len(x) >= 3 and x[:3] == ("shell", "am", "start")
                             for x in trace))


    def test_named_jm_setup_plan_is_bounded(self):
        for plan in sorted(bridge.VALID_PLANS):
            payload = bridge.plan_request(plan)
            self.assertEqual(payload["kind"], "plan")
            self.assertEqual(payload["plan_id"], plan)
            self.assertEqual(payload["schema"], bridge.REQUEST_SCHEMA)
            self.assertNotIn("root", payload)
            self.assertNotIn("status", payload)
            self.assertLess(len(bridge.document_bytes(payload)), 512)
        for bad in ("FACTORY_RESET", "SILENT", "APP_PAIR", "ROOT"):
            with self.assertRaises(bridge.BridgeError):
                bridge.plan_request(bad)

    def test_v07_config_rejects_invalid_layout_and_keeps_v06_readable(self):
        project = {"id": "jm-ecostate", "title": "JM Ecostate",
                   "family": "ESTATE", "url": ""}
        config = {"schema": "JM.FoldUltraSetup/0.7", "root": "A stable note",
                  "project_shelf": [project], "active_project": "jm-ecostate",
                  "layout_compact": "QUICK", "layout_expanded": "COMFORT",
                  "setup_last": ""}
        self.assertEqual(bridge.validate_config(config), config)
        for value in ("DENSE", "", "DELETE"):
            bad = dict(config, layout_compact=value)
            with self.assertRaises(bridge.BridgeError):
                bridge.validate_config(bad)
        bad = dict(config, setup_last="ROOT")
        with self.assertRaises(bridge.BridgeError):
            bridge.validate_config(bad)
        prior = dict(config, schema="JM.FoldUltraSetup/0.6")
        prior.pop("layout_compact")
        prior.pop("layout_expanded")
        self.assertEqual(bridge.validate_config(prior), prior)


    def test_session_revision_and_privacy_constraints(self):
        valid=bridge.session_update_request("five-flip",0,"TEST",
                                            "Owner-saved test context","Resume arena match")
        self.assertEqual(valid["kind"],"session_update")
        self.assertEqual(valid["expected_revision"],0)
        self.assertEqual(valid["note"],"Owner-saved test context")
        self.assertNotIn("status",valid)
        for rev in (-1, True, 100000001):
            with self.assertRaises(bridge.BridgeError):
                bridge.session_update_request("five-flip",rev,"TEST","ok","next")
        with self.assertRaises(bridge.BridgeError):
            bridge.session_update_request("five-flip",0,"ERASE","ok","next")
        with self.assertRaises(bridge.BridgeError):
            bridge.session_update_request("five-flip",0,"BUILD","a"*4001,"next")
        with self.assertRaises(bridge.BridgeError):
            bridge.session_update_request("five-flip",0,"TEST","ok","n"*221)

    def test_session_snapshot_requires_valid_joined_project(self):
        proj={"id":"five-flip","title":"FIVE//FLIP","family":"GAMES","url":""}
        session={"project_id":"five-flip","revision":3,"phase":"POLISH","note":"test",
                 "next_action":"re-test camera","updated_epoch_ms":5}
        base={"schema":bridge.CONFIG_SCHEMA,"root":"JM local","project_shelf":[proj],
              "active_project":"five-flip","layout_compact":"QUICK",
              "layout_expanded":"COMFORT","setup_last":"PLAYTEST",
              "session_deck":[session]}
        self.assertEqual(bridge.validate_config(base),base)
        self.assertEqual(bridge.local_session(base,"five-flip")["revision"],3)
        with self.assertRaises(bridge.BridgeError):
            bridge.validate_config(dict(base,session_deck=[dict(session,project_id="orphan")]))
        with self.assertRaises(bridge.BridgeError):
            bridge.validate_config(dict(base,session_deck=[session,session]))
        with self.assertRaises(bridge.BridgeError):
            bridge.validate_config(dict(base,session_deck=[dict(session,revision=-1)]))

    def test_proposed_private_session_note_never_uses_shell_fallback(self):
        note="PRIVATE-JM-SESSION-CONTENT-NOT-COMMAND-LINE"
        request=bridge.session_update_request("five-flip",0,"TEST",note,"next")
        trace=[]
        def fake(adb,serial,*args,stdin=None,timeout=25):
            trace.append((args,stdin))
            return b"partial" if args[0]=="exec-out" else b""
        with mock.patch.object(bridge,"ensure_debug"),mock.patch.object(bridge,"adb_run",side_effect=fake):
            with self.assertRaises(bridge.BridgeError):
                bridge.stage_payload("adb","test-device",request)
        self.assertFalse(any("base64 -d" in str(cmd) for cmd,_ in trace))
        self.assertFalse(any(note in str(cmd) for cmd,_ in trace))
        self.assertFalse(any(cmd[:3]==("shell","am","start") for cmd,_ in trace))


    def test_reentry_request_revision_checks(self):
        capture=bridge.reentry_request("reentry_capture","jm-games-house",1)
        self.assertEqual(capture["kind"],"reentry_capture")
        self.assertEqual(capture["expected_revision"],1)
        self.assertNotIn("point_revision",capture)
        restored=bridge.reentry_request("reentry_return","jm-games-house",3,1)
        self.assertEqual(restored["point_revision"],1)
        self.assertEqual(restored["expected_revision"],3)
        for kind,id_,rev,from_rev in [
            ("delete","jm-games-house",1,None),
            ("reentry_return","../private",1,1),
            ("reentry_return","jm-games-house",-1,1),
            ("reentry_return","jm-games-house",2,None),
            ("reentry_return","jm-games-house",True,1),
        ]:
            with self.subTest(kind=kind,id=id_), self.assertRaises(bridge.BridgeError):
                bridge.reentry_request(kind,id_,rev,from_rev)

    def test_return_point_export_join_and_snapshot_integrity(self):
        p={"id":"five-flip","title":"FIVE//FLIP","family":"GAMES","url":""}
        return_point={"project_id":"five-flip","source_revision":1,"phase":"TEST",
                      "note":"Earlier saved game state","next_action":"Check camera",
                      "recorded_epoch_ms":1234}
        config={"schema":bridge.CONFIG_SCHEMA,"root":"Owner root",
                "focus":"PLAY","session":"PLAYTEST",
                "project_shelf":[p],"active_project":"five-flip",
                "layout_compact":"QUICK","layout_expanded":"COMFORT","setup_last":"PLAYTEST",
                "session_deck":[{"project_id":"five-flip","revision":2,"phase":"POLISH",
                                 "note":"Current work","next_action":"Refine controls",
                                 "updated_epoch_ms":2345}],
                "return_points":[return_point]}
        self.assertEqual(bridge.validate_config(config),config)
        self.assertEqual(bridge.local_return_point(config,"five-flip")["source_revision"],1)
        for altered in [
            dict(config,return_points=[return_point,return_point]),
            dict(config,return_points=[dict(return_point,project_id="missing")]),
            dict(config,return_points=[dict(return_point,source_revision=-3)]),
            dict(config,return_points=[dict(return_point,note="x"*4001)]),
        ]:
            with self.assertRaises(bridge.BridgeError):
                bridge.validate_config(altered)
        previous=dict(config,schema="JM.FoldUltraSetup/0.8")
        previous.pop("return_points")
        self.assertEqual(bridge.validate_config(previous),previous)

    def test_no_device_is_not_treated_as_contact(self):
        with mock.patch.object(bridge.subprocess, "run") as run:
            run.return_value = mock.Mock(returncode=0, stdout="List of devices attached\n\n")
            with self.assertRaises(bridge.BridgeError):
                bridge.connected("adb", None)


if __name__ == "__main__":
    unittest.main()
