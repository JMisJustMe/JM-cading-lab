#!/usr/bin/env python3
"""MCP protocol-level subprocess contact for JM's existing sovereign sidecar."""
from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]
MCP = ROOT / "agent-runtime/host-adapters/scoped_memory/jm_scoped_memory_mcp.py"

def req(i, method, params=None):
    message = {"jsonrpc": "2.0", "id": i, "method": method}
    if params is not None:
        message["params"] = params
    return message

def init(version="2025-11-25"):
    return req(1, "initialize", {"protocolVersion": version,
                                 "capabilities": {},
                                 "clientInfo": {"name": "JM independent test client", "version": "0.1"}})

READY = {"jsonrpc": "2.0", "method": "notifications/initialized"}

def call(i, name, arguments=None):
    return req(i, "tools/call", {"name": name, "arguments": arguments or {}})

class MCPContact(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.env = os.environ.copy()
        self.env["XDG_STATE_HOME"] = self.temp.name
        self.env.pop("JM_SCOPED_MEMORY_MCP_ALLOW_WRITES", None)

    def send(self, messages, *, write=False, cwd=ROOT):
        env = self.env.copy()
        if write:
            env["JM_SCOPED_MEMORY_MCP_ALLOW_WRITES"] = "1"
        payload = "\n".join(json.dumps(m, ensure_ascii=True) for m in messages) + "\n"
        run = subprocess.run([sys.executable, str(MCP)], input=payload, cwd=cwd,
                             capture_output=True, text=True, env=env, timeout=30, check=False)
        self.assertEqual(run.returncode, 0, run.stderr)
        try:
            responses = [json.loads(line) for line in run.stdout.splitlines()]
        except ValueError:
            self.fail("MCP stdio contaminated: " + run.stdout[:300])
        self.assertTrue(all(x.get("jsonrpc") == "2.0" for x in responses))
        return responses

    def test_real_legacy_handshake_ping_and_readonly_tools(self):
        data = self.send([init(), READY, req(2, "ping"), req(3, "tools/list")])
        self.assertEqual(data[0]["result"]["protocolVersion"], "2025-11-25")
        self.assertEqual(data[1]["result"], {})
        self.assertEqual([t["name"] for t in data[2]["result"]["tools"]],
                         ["jm_memory_list", "jm_memory_read"])
        self.assertEqual(data[0]["result"]["capabilities"]["tools"]["listChanged"], False)

    def test_protocol_legacy_negotiation_and_modern_boundary(self):
        for version in ("2025-06-18", "2025-03-26", "2026-07-28"):
            data = self.send([init(version)])
            expect = version if version != "2026-07-28" else "2025-11-25"
            self.assertEqual(data[0]["result"]["protocolVersion"], expect)

    def test_handshake_required_and_method_errors(self):
        data = self.send([req(2, "tools/list"), init(), req(3, "tools/list"),
                          READY, req(4, "unsupported"), req(5, "tools/list")])
        self.assertEqual(data[0]["error"]["code"], -32002)
        self.assertEqual(data[2]["error"]["code"], -32002)
        self.assertEqual(data[3]["error"]["code"], -32601)
        self.assertEqual(data[4]["result"]["tools"][0]["name"], "jm_memory_list")

    def test_readonly_default_rejects_write_even_direct_call(self):
        data = self.send([init(), READY, call(2, "jm_memory_write",
                         {"name": "note", "body": "must not commit"})])
        self.assertTrue(data[-1]["result"]["isError"])
        self.assertEqual(data[-1]["result"]["structuredContent"]["status"], "HOLD")
        self.assertEqual(list(Path(self.temp.name).glob("**/*.json")), [])

    def test_opt_in_write_read_list_real_core_through_mcp(self):
        data = self.send([init(), READY, req(2, "tools/list"),
            call(3, "jm_memory_write", {"name": "route", "body": "use original JM core"}),
            call(4, "jm_memory_read", {"name": "route"}),
            call(5, "jm_memory_list")], write=True)
        self.assertEqual(len(data), 5)
        self.assertEqual(len(data[1]["result"]["tools"]), 3)
        saved = data[2]["result"]["structuredContent"]
        self.assertFalse(data[2]["result"]["isError"])
        self.assertEqual(saved["consequence"]["status"], "COMMITTED_AND_READ_BACK")
        self.assertEqual(saved["provider_contact"], False)
        self.assertEqual(saved["original_adapter"], "jm_codex_repository_adapter.py")
        returned = data[3]["result"]["structuredContent"]
        self.assertEqual(returned["consequence"]["body"], "use original JM core")
        self.assertEqual(returned["consequence"]["digest"], saved["consequence"]["digest"])
        self.assertEqual(data[4]["result"]["structuredContent"]["consequence"]["note_keys"], ["route"])

    def test_independent_mcp_server_reentry_and_update(self):
        start = self.send([init(), READY, call(2, "jm_memory_write",
                   {"name": "project", "body": "v1"})], write=True)
        self.assertFalse(start[-1]["result"]["isError"])
        end = self.send([init(), READY, call(2, "jm_memory_read", {"name": "project"}),
                         call(3, "jm_memory_write",
                              {"name": "project", "body": "v2", "mode": "update"})], write=True)
        self.assertEqual(end[1]["result"]["structuredContent"]["consequence"]["body"], "v1")
        self.assertEqual(end[2]["result"]["structuredContent"]["consequence"]["revision"], 2)
        final = self.send([init(), READY, call(2, "jm_memory_read", {"name": "project"})])
        self.assertEqual(final[1]["result"]["structuredContent"]["consequence"]["body"], "v2")

    def test_mcp_correction_digest_guard_and_reentry(self):
        first = self.send([init(), READY, call(2, "jm_memory_write",
                          {"name": "observed", "body": "Initial Notion connection unknown"})], write=True)
        initial = first[-1]["result"]["structuredContent"]["consequence"]
        note_digest = initial["digest"]
        updated = self.send([init(), READY, call(2, "jm_memory_write",
                            {"name": "observed", "body": "Notion direct read verified",
                             "mode": "correct", "expected_digest": note_digest})], write=True)
        self.assertFalse(updated[-1]["result"]["isError"])
        corrected_digest = updated[-1]["result"]["structuredContent"]["consequence"]["digest"]
        self.assertNotEqual(note_digest, corrected_digest)
        stale = self.send([init(), READY, call(2, "jm_memory_write",
                          {"name": "observed", "body": "outdated mistaken state",
                           "mode": "correct", "expected_digest": note_digest})], write=True)
        self.assertTrue(stale[-1]["result"]["isError"])
        self.assertEqual(stale[-1]["result"]["structuredContent"]["status"], "HOLD")
        missing = self.send([init(), READY, call(2, "jm_memory_write",
                            {"name": "observed", "body": "no observed digest", "mode": "correct"})], write=True)
        self.assertTrue(missing[-1]["result"]["isError"])
        read = self.send([init(), READY, call(2, "jm_memory_read",
                         {"name": "observed"})])
        final = read[-1]["result"]["structuredContent"]["consequence"]
        self.assertEqual(final["body"], "Notion direct read verified")
        self.assertEqual(final["previous"], note_digest)
        self.assertEqual(final["digest"], corrected_digest)

    def test_no_owner_workspace_override_or_invented_proof(self):
        x = self.send([init(), READY, call(2, "jm_memory_write",
                   {"name": "x", "body": "text", "owner": "other"})], write=True)
        self.assertTrue(x[-1]["result"]["isError"])
        y = self.send([init(), READY, call(3, "jm_memory_list", {"workspace": "/tmp"})])
        self.assertTrue(y[-1]["result"]["isError"])
        z = self.send([init(), READY, call(4, "jm_memory_list")])
        self.assertFalse(z[-1]["result"]["isError"])
        self.assertEqual(z[-1]["result"]["structuredContent"]["provider_contact"], False)

    def test_malformed_and_oversized_and_bad_unicode_hold(self):
        request = call(2, "jm_memory_write", {"name": "x", "body": "\ud800"})
        x = self.send([init(), READY, request], write=True)
        self.assertTrue(x[-1]["result"]["isError"])
        self.assertEqual(x[-1]["result"]["structuredContent"]["status"], "HOLD")
        y = self.send([init(), READY, call(2, "jm_memory_write",
                      {"name": "x", "body": "a"*8193})], write=True)
        self.assertTrue(y[-1]["result"]["isError"])

    def test_two_independent_mcp_processes_concurrent_safely(self):
        def each(i):
            return self.send([init(), READY, call(2, "jm_memory_write",
                     {"name": "p" + str(i), "body": "parallel-" + str(i)})], write=True)
        with ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(each, range(4)))
        self.assertTrue(all(not x[-1]["result"]["isError"] for x in results))
        listed = self.send([init(), READY, call(3, "jm_memory_list")])
        self.assertEqual(listed[-1]["result"]["structuredContent"]["consequence"]["note_keys"],
                         ["p0", "p1", "p2", "p3"])

    def test_separate_git_workspaces_do_not_share_memory(self):
        other = Path(self.temp.name) / "other"
        other.mkdir()
        subprocess.run(["git", "init", "-q"], cwd=other, check=True)
        self.send([init(), READY, call(2, "jm_memory_write",
                   {"name": "only_here", "body": "private workspace"})], write=True)
        result = self.send([init(), READY, call(2, "jm_memory_list")], cwd=other)
        self.assertEqual(result[-1]["result"]["structuredContent"]["consequence"]["note_keys"], [])

    def test_unknown_jsonrpc_cannot_call_memory_and_no_batch(self):
        proc = subprocess.run([sys.executable, str(MCP)],
              input='{"jsonrpc":"2.0","id":1,"method":"tools/list"}\n' +
                    '{"jsonrpc":"2.0","id":false,"method":"initialize"}\n' +
                    '[{"jsonrpc":"2.0","id":3,"method":"initialize"}]\n',
              text=True,cwd=ROOT,capture_output=True,env=self.env,timeout=15)
        self.assertEqual(proc.returncode,0,proc.stderr)
        data=[json.loads(x) for x in proc.stdout.splitlines()]
        self.assertEqual([x["error"]["code"] for x in data], [-32002,-32600,-32600])

if __name__ == "__main__":
    unittest.main()
