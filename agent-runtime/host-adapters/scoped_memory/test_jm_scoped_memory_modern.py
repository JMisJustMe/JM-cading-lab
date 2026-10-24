#!/usr/bin/env python3
"""Independent MCP 2026-07-28 stateless wire tests using real JM backend."""
from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]
SERVER = ROOT / "agent-runtime/host-adapters/scoped_memory/jm_scoped_memory_mcp.py"
VERSION = "2026-07-28"

def modern(i, method, **params):
    return {"jsonrpc": "2.0", "id": i, "method": method,
            "params": {**params, "_meta": {
                "io.modelcontextprotocol/protocolVersion": VERSION,
                "io.modelcontextprotocol/clientCapabilities": {},
                "io.modelcontextprotocol/clientInfo": {"name": "JM modern independent probe", "version": "0.1"}}}}

def tool(i, name, args=None):
    return modern(i, "tools/call", name=name, arguments=args or {})

class ModernMCPContact(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.env = os.environ.copy()
        self.env["XDG_STATE_HOME"] = self.temp.name
        self.env.pop("JM_SCOPED_MEMORY_MCP_ALLOW_WRITES", None)

    def send(self, messages, write=False, cwd=ROOT):
        env = self.env.copy()
        if write:
            env["JM_SCOPED_MEMORY_MCP_ALLOW_WRITES"] = "1"
        p = subprocess.run([sys.executable, str(SERVER)],
            input="\n".join(json.dumps(x) for x in messages)+"\n",
            text=True, capture_output=True, cwd=cwd, env=env, timeout=30)
        self.assertEqual(p.returncode, 0, p.stderr)
        try:
            outputs=[json.loads(line) for line in p.stdout.splitlines()]
        except ValueError:
            self.fail("Invalid stdout framing")
        self.assertEqual(len(outputs),len(messages))
        return outputs

    def test_modern_discovery_without_handshake(self):
        a = self.send([modern(1,"server/discover")])[0]
        r=a["result"]
        self.assertEqual(r["resultType"], "complete")
        self.assertEqual(r["_meta"]["io.modelcontextprotocol/serverInfo"]["name"],"jm-scoped-memory")
        self.assertIn(VERSION,r["supportedVersions"])
        self.assertEqual(r["cacheScope"],"private")
        self.assertEqual(r["ttlMs"],0)

    def test_stateless_direct_tool_list_with_server_info(self):
        r=self.send([modern(1,"tools/list")])[0]["result"]
        self.assertEqual([t["name"] for t in r["tools"]],["jm_memory_list","jm_memory_read"])
        self.assertEqual(r["resultType"],"complete")
        self.assertIn("io.modelcontextprotocol/serverInfo",r["_meta"])

    def test_modern_local_memory_operation_and_restart(self):
        s=self.send([tool(1,"jm_memory_write",{"name":"modern","body":"live local MCP protocol"})],write=True)[0]
        self.assertFalse(s["result"]["isError"])
        self.assertEqual(s["result"]["structuredContent"]["consequence"]["status"],"COMMITTED_AND_READ_BACK")
        self.assertEqual(s["result"]["resultType"],"complete")
        r=self.send([tool(2,"jm_memory_read",{"name":"modern"})])[0]
        self.assertEqual(r["result"]["structuredContent"]["consequence"]["body"],"live local MCP protocol")
        self.assertFalse(r["result"]["structuredContent"]["provider_contact"])
        self.assertEqual(r["result"]["resultType"],"complete")

    def test_readonly_tool_hidden_and_cannot_be_invoked(self):
        l=self.send([modern(1,"tools/list"),tool(2,"jm_memory_write",{"name":"no","body":"no"})])
        self.assertEqual(len(l[0]["result"]["tools"]),2)
        self.assertEqual(l[1]["error"]["code"],-32602)

    def test_per_request_version_and_capabilities_required(self):
        bad=modern(1,"tools/list")
        bad["params"]["_meta"]["io.modelcontextprotocol/protocolVersion"]="2026-01-01"
        missing=modern(2,"tools/list")
        del missing["params"]["_meta"]["io.modelcontextprotocol/clientCapabilities"]
        r=self.send([bad,missing])
        self.assertEqual(r[0]["error"]["code"],-32022)
        self.assertIn(VERSION,r[0]["error"]["data"]["supportedVersions"])
        self.assertEqual(r[1]["error"]["code"],-32602)

    def test_removed_legacy_methods_fail_modern(self):
        r=self.send([modern(1,"ping"), modern(2,"initialize",protocolVersion="2025-11-25"),
                     modern(3,"logging/setLevel",level="debug")])
        self.assertTrue(all(x["error"]["code"]==-32601 for x in r))

    def test_isolation_no_scope_override(self):
        x=self.send([tool(1,"jm_memory_write",{"name":"foo","body":"value","owner":"injected"})],write=True)
        self.assertTrue(x[0]["result"]["isError"])
        target=Path(self.temp.name)/"other"
        target.mkdir()
        subprocess.run(["git","init","-q"],cwd=target,check=True)
        orig=self.send([tool(1,"jm_memory_write",{"name":"scope","body":"first"})],write=True)
        self.assertFalse(orig[0]["result"]["isError"])
        alt=self.send([tool(1,"jm_memory_list")],cwd=target)
        self.assertEqual(alt[0]["result"]["structuredContent"]["consequence"]["note_keys"],[])

    def test_two_parallel_modern_mcp_clients_serialized(self):
        def write(i):
            return self.send([tool(1,"jm_memory_write",{"name":"m"+str(i),"body":"same workspace"})],write=True)
        with ThreadPoolExecutor(max_workers=4) as pool:
            results=list(pool.map(write,range(4)))
        self.assertTrue(all(not r[0]["result"]["isError"] for r in results))
        s=self.send([tool(10,"jm_memory_list")])
        self.assertEqual(s[0]["result"]["structuredContent"]["consequence"]["note_keys"],["m0","m1","m2","m3"])

if __name__=="__main__":
    unittest.main()
