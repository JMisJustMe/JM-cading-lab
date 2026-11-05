#!/usr/bin/env python3
"""Bounded actual MCP/byte checks for JM M001 CP34.1 (synthetic fixtures only)."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).with_name("JM_M001_STORAGE_LIBRARY_MCP_CP34.py")
spec = importlib.util.spec_from_file_location("jm_m001_cp34", SCRIPT)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class StorageMCPTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.a = Path(self.tmp.name) / "library"
        self.b = Path(self.tmp.name) / "recovery"
        self.a.mkdir()
        self.b.mkdir()
        self.source = b'{"source":"JM","version":1}\n'
        (self.a / "item.json").write_bytes(self.source)
        (self.b / "item.json").write_bytes(self.source)
        self.roots = {"library": str(self.a), "recovery": str(self.b)}
        self.args = {"library_file": "item.json", "recovery_file": "item.json", "format": "json"}

    def test_real_two_root_bytes_equal(self):
        x = m.compare(self.roots, self.args)
        self.assertEqual(x["state"], "EXACT_BYTES_MATCH")
        self.assertTrue(x["same_bytes"])
        self.assertEqual(x["library"]["sha256"], hashlib.sha256(self.source).hexdigest())
        self.assertEqual(x["native_mutations"], 0)
        self.assertFalse(x["retirement_authorised"])
        self.assertFalse(x["independent_restore_proven"])

    def test_authoritative_digest_and_dropbox_content_hash(self):
        x = dict(self.args, expected_sha256=hashlib.sha256(self.source).hexdigest(),
                 recovery_dropbox_content_hash=m.dropbox_content_hash(self.source))
        self.assertEqual(m.compare(self.roots, x)["state"], "EXACT_BYTES_MATCH")
        self.assertTrue(m.compare(self.roots, x)["dropbox_content_hash_matches"])

    def test_tampered_provider_digest_hold(self):
        x = dict(self.args, recovery_dropbox_content_hash="0" * 64)
        self.assertEqual(m.compare(self.roots, x)["state"], "PROVIDER_DIGEST_HOLD")

    def test_wrong_expected_source_digest_hold(self):
        x = dict(self.args, expected_sha256="0" * 64)
        self.assertEqual(m.compare(self.roots, x)["state"], "EXPECTED_DIGEST_HOLD")

    def test_different_same_length_is_not_duplicate(self):
        changed = self.source.replace(b"JM", b"NX")
        (self.b / "item.json").write_bytes(changed)
        self.assertEqual(len(changed), len(self.source))
        self.assertEqual(m.compare(self.roots, self.args)["state"], "DIFFERENT_BYTES_HOLD")

    def test_stored_serverbusy_error_detected_even_when_same_bytes(self):
        xml = b'\xef\xbb\xbf<?xml version="1.0"?><Error><Code>ServerBusy</Code></Error>{"valid":true}'
        (self.a / "item.json").write_bytes(xml)
        (self.b / "item.json").write_bytes(xml)
        x = m.compare(self.roots, self.args)
        self.assertTrue(x["same_bytes"])
        self.assertEqual(x["state"], "FORMAT_HOLD")
        self.assertEqual(x["library"]["format_state"], "STORED_SERVER_ERROR_HOLD")

    def test_json_named_identical_serverbusy_default_format_still_holds(self):
        xml = b'<?xml version="1.0"?><Error><Code>ServerBusy</Code></Error>'
        (self.a / "item.json").write_bytes(xml)
        (self.b / "item.json").write_bytes(xml)
        for args in (
            {"library_file":"item.json","recovery_file":"item.json"},
            {"library_file":"item.json","recovery_file":"item.json","format":"any"},
        ):
            with self.subTest(args=args):
                result = m.compare(self.roots, args)
                self.assertEqual(result["state"], "FORMAT_HOLD")
                self.assertEqual(result["recovery"]["format_state"], "STORED_SERVER_ERROR_HOLD")
                self.assertTrue(m.dispatch({"jsonrpc":"2.0","id":99,"method":"tools/call",
                    "params":{"name":"custody_compare","arguments":args}},
                    self.roots)["result"]["isError"])

    def test_valid_named_json_omitted_format_passes(self):
        args = {"library_file":"item.json","recovery_file":"item.json"}
        self.assertEqual(m.compare(self.roots, args)["state"], "EXACT_BYTES_MATCH")

    def test_json_one_side_named_is_still_checked(self):
        (self.b / "file.txt").write_bytes(b'<?xml version="1.0"?><Error><Code>ServerBusy</Code></Error>')
        (self.a / "item.json").write_bytes((self.b / "file.txt").read_bytes())
        args = {"library_file":"item.json","recovery_file":"file.txt"}
        self.assertEqual(m.compare(self.roots, args)["state"], "FORMAT_HOLD")

    def test_non_json_file_retains_opt_in_json_parse(self):
        (self.a / "first.txt").write_bytes(b"not-json")
        (self.b / "second.txt").write_bytes(b"not-json")
        args = {"library_file":"first.txt","recovery_file":"second.txt"}
        self.assertEqual(m.compare(self.roots, args)["state"], "EXACT_BYTES_MATCH")
        self.assertEqual(m.compare(self.roots, dict(args, format="json"))["state"], "FORMAT_HOLD")

    def test_bad_json_hold(self):
        (self.b / "item.json").write_bytes(b"not JSON")
        self.assertEqual(m.compare(self.roots, self.args)["state"], "FORMAT_HOLD")

    def test_traversal_and_absolute_paths_hold(self):
        for path in ("../elsewhere", "/etc/passwd", "~/notes", ".secret/a", "sub/../../escape", "a\\b"):
            with self.subTest(path=path):
                with self.assertRaises(m.Hold):
                    m.compare(self.roots, dict(self.args, library_file=path))

    def test_symlink_and_missing_hold(self):
        (self.b / "alias.json").symlink_to(self.a / "item.json")
        with self.assertRaises(m.Hold):
            m.compare(self.roots, dict(self.args, recovery_file="alias.json"))
        with self.assertRaises(m.Hold):
            m.compare(self.roots, dict(self.args, recovery_file="not_here.json"))

    def test_not_same_root(self):
        with self.assertRaises(m.Hold):
            m.compare({"library": str(self.a), "recovery": str(self.a)}, self.args)

    def test_hard_link_is_not_independent_recovery(self):
        (self.b / "item.json").unlink()
        os.link(self.a / "item.json", self.b / "item.json")
        with self.assertRaisesRegex(m.Hold, "INDEPENDENT_FILE_OBJECTS_REQUIRED"):
            m.compare(self.roots, self.args)

    def test_overlapping_roots_same_file_is_not_recovery(self):
        roots = {"library": self.tmp.name, "recovery": str(self.a)}
        args = dict(self.args, library_file="library/item.json")
        with self.assertRaisesRegex(m.Hold, "INDEPENDENT_FILE_OBJECTS_REQUIRED"):
            m.compare(roots, args)

    def test_malformed_method_does_not_crash_dispatch(self):
        for method in (None, 17, True, [], {}, ""):
            with self.subTest(method=method):
                result = m.dispatch({"jsonrpc":"2.0", "id":7, "method":method}, self.roots)
                self.assertEqual(result["error"]["code"], -32600)

    def test_stdio_recovers_after_malformed_method(self):
        messages = [{"jsonrpc":"2.0","id":1,"method":17},
                    {"jsonrpc":"2.0","id":2,"method":"ping"}]
        cp = subprocess.run([sys.executable, str(SCRIPT)],
                            input="\n".join(map(json.dumps, messages))+"\n",
                            text=True, capture_output=True, timeout=10, check=True)
        replies = [json.loads(line) for line in cp.stdout.splitlines()]
        self.assertEqual(replies[0]["error"]["code"], -32600)
        self.assertEqual(replies[1], {"jsonrpc":"2.0","id":2,"result":{}})
        self.assertEqual(cp.stderr, "")

    def test_large_file_hold(self):
        with (self.b / "item.json").open("wb") as f:
            f.truncate(m.MAX_BYTES + 1)
        with self.assertRaises(m.Hold):
            m.compare(self.roots, self.args)

    def test_tool_dispatch_never_returns_file_contents(self):
        request = {"jsonrpc":"2.0","id":7,"method":"tools/call",
                   "params":{"name":"custody_compare","arguments":self.args}}
        reply = m.dispatch(request, self.roots)
        self.assertEqual(reply["result"]["structuredContent"]["state"], "EXACT_BYTES_MATCH")
        self.assertNotIn('"source":"JM"', json.dumps(reply))
        self.assertEqual(m.dispatch({"jsonrpc":"2.0","id":4,"method":"tools/list"},self.roots)["result"]["tools"][1]["name"],"custody_compare")
        self.assertIsNone(m.dispatch({"jsonrpc":"2.0","method":"notifications/initialized"},self.roots))
        self.assertEqual(m.dispatch({"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"delete"}} ,self.roots)["error"]["code"],-32601)

    def test_stdin_stdout_jsonrpc_process(self):
        messages = [
            {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"fixture","version":"1"}}},
            {"jsonrpc":"2.0","id":2,"method":"tools/list"},
            {"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"custody_compare","arguments":self.args}},
            {"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"storage_contact_status"}},
        ]
        cp = subprocess.run([sys.executable, str(SCRIPT), "--library-root",str(self.a),
                             "--recovery-root", str(self.b)], input="\n".join(map(json.dumps,messages))+"\n",
                             text=True,capture_output=True,timeout=10,check=True)
        responses = [json.loads(line) for line in cp.stdout.splitlines()]
        self.assertEqual(len(responses),4)
        self.assertEqual(responses[0]["result"]["serverInfo"]["name"],"JM M001 Storage Steward Local Contact")
        self.assertEqual(responses[2]["result"]["structuredContent"]["state"],"EXACT_BYTES_MATCH")
        self.assertEqual(responses[3]["result"]["structuredContent"]["native_mutations"],0)
        self.assertEqual(cp.stderr, "")

    def test_mcp_hold_is_error_not_green_result(self):
        req = {"jsonrpc":"2.0","id":22,"method":"tools/call",
               "params":{"name":"custody_compare","arguments":self.args}}
        self.assertFalse(m.dispatch(req, self.roots)["result"]["isError"])
        (self.b / "item.json").write_bytes(b"not JSON")
        bad = m.dispatch(req, self.roots)["result"]
        self.assertTrue(bad["isError"])
        self.assertEqual(bad["structuredContent"]["state"], "FORMAT_HOLD")
        (self.b / "item.json").write_bytes(b'{"source":"NX","version":1}\n')
        different = m.dispatch(req, self.roots)["result"]
        self.assertTrue(different["isError"])
        self.assertEqual(different["structuredContent"]["state"], "DIFFERENT_BYTES_HOLD")

    def test_same_size_source_change_during_read_holds(self):
        target = self.a / "item.json"
        stamp = target.stat()
        real_fdopen = os.fdopen

        class ChangingReader:
            def __init__(self, handle): self.handle = handle
            def __enter__(self): self.handle.__enter__(); return self
            def __exit__(self, *args): return self.handle.__exit__(*args)
            def fileno(self): return self.handle.fileno()
            def read(self, limit):
                data = self.handle.read(limit)
                target.write_bytes(data.replace(b"JM", b"NX"))
                os.utime(target, ns=(stamp.st_atime_ns, stamp.st_mtime_ns + 1_000_000_000))
                return data

        with patch.object(m.os, "fdopen", side_effect=lambda *a, **kw: ChangingReader(real_fdopen(*a, **kw))):
            with self.assertRaisesRegex(m.Hold, "SOURCE_CHANGED_DURING_READ"):
                m.compare(self.roots, self.args)

    def test_no_mutation_of_snapshot_files(self):
        before = [(p.stat().st_size, hashlib.sha256(p.read_bytes()).hexdigest())
                  for p in (self.a/"item.json",self.b/"item.json")]
        for _ in range(3):
            m.compare(self.roots,self.args)
        after = [(p.stat().st_size, hashlib.sha256(p.read_bytes()).hexdigest())
                 for p in (self.a/"item.json",self.b/"item.json")]
        self.assertEqual(before,after)

    def test_invalid_arguments_fail_closed(self):
        for args in ({}, None, {"library_file":"item.json","recovery_file":"item.json","format":"xml"},
                     dict(self.args, expected_sha256="bad")):
            reply = m.dispatch({"jsonrpc":"2.0","id":1,"method":"tools/call",
                     "params":{"name":"custody_compare","arguments":args}}, self.roots)
            self.assertEqual(reply["result"]["structuredContent"]["state"],"HOLD")


if __name__ == "__main__":
    unittest.main(verbosity=2)
