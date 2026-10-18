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
            "schema": bridge.CONFIG_SCHEMA, "root": "Example owner's JM root",
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
            return b""
        with mock.patch.object(bridge, "ensure_debug") as gate, \
             mock.patch.object(bridge, "adb_run", side_effect=fake):
            identity = bridge.stage_payload("adb", "test-device", request)
        gate.assert_called_once_with("adb", "test-device")
        self.assertEqual(identity, request["request_id"])
        self.assertEqual(calls[0][0][0], "exec-in")
        self.assertIn(b'"kind":"profile"', calls[0][1])
        self.assertEqual(calls[1][0][:3], ("shell", "am", "start"))
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

    def test_no_device_is_not_treated_as_contact(self):
        with mock.patch.object(bridge.subprocess, "run") as run:
            run.return_value = mock.Mock(returncode=0, stdout="List of devices attached\n\n")
            with self.assertRaises(bridge.BridgeError):
                bridge.connected("adb", None)


if __name__ == "__main__":
    unittest.main()
