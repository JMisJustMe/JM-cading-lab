#!/usr/bin/env python3
"""CP03 candidate regression checks: additive native MCP contract, no external writes."""
import http.client
import json
import pathlib
import sys
import threading
import unittest
from http.server import ThreadingHTTPServer
from unittest.mock import patch

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import server
import cross_client as c


class NativeCrossClientCP03(unittest.TestCase):
    def setUp(self):
        self.challenge = "JM-CP03-REPO-VERIFY"
        self.a = {"client": "ChatGPT", "challenge": self.challenge}
        self.b = {"client": "Gemini", "challenge": self.challenge}

    def test_server_version_and_legacy_tools(self):
        self.assertEqual(server.VERSION, "0.8.6")
        self.assertEqual(len(c.TOOLS), 4)
        self.assertEqual(len(set(t["name"] for t in server.TOOLS)), len(server.TOOLS))
        self.assertEqual(set(c.HANDLERS), {t["name"] for t in c.TOOLS})
        for name in ("build_mesh_status", "search_builds", "resolve_current_head",
                     "build_sync_contract", "prepare_operation_gate", "plan_artifact_route"):
            self.assertIn(name, server.HANDLERS)
        for name in c.HANDLERS:
            self.assertIn(name, server.HANDLERS)

    def test_issue_and_matching_distinct_claims(self):
        a = c.cross_client_issue_receipt(self.a)["receipt_token"]
        b = c.cross_client_issue_receipt(self.b)["receipt_token"]
        result = c.cross_client_verify_pair({"receipt_a": a, "receipt_b": b})
        self.assertTrue(result["pass"])
        self.assertEqual(result["state"], "MATCHED_SERVER_ISSUED_DISTINCT_CLIENT_LABELS")
        self.assertFalse(result["mutation_performed"])

    def test_same_claim_is_not_two_clients(self):
        a = c.cross_client_issue_receipt(self.a)["receipt_token"]
        b = c.cross_client_issue_receipt(self.a)["receipt_token"]
        result = c.cross_client_verify_pair({"receipt_a": a, "receipt_b": b})
        self.assertFalse(result["pass"])

    def test_invalid_input_fails_closed(self):
        with self.assertRaises(ValueError):
            c.cross_client_issue_receipt({**self.a, "unsafe": "injected"})
        with self.assertRaises(ValueError):
            c.handoff_task_capsule({**self.a, "task_kind": "RUN_SHELL"})

    def test_tampered_receipt_fails(self):
        token = c.cross_client_issue_receipt(self.a)["receipt_token"]
        a, b = token.split(".")
        altered = a + "." + ("A" if b[0] != "A" else "B") + b[1:]
        with self.assertRaises(ValueError):
            c._verify_token(altered)

    def test_capsule_signed_and_target_checked(self):
        token = c.handoff_task_capsule({
            "origin_client": "ChatGPT", "target_client": "Gemini",
            "challenge": self.challenge, "body_ref": "JM-BUILD-MESH",
            "task_kind": "AUDIT_MCP_CONTRACT",
        })["capsule_token"]
        ok = c.verify_carrier_receipt({"capsule_token": token, "expected_target_client": "Gemini"})
        self.assertTrue(ok["valid"])
        hold = c.verify_carrier_receipt({"capsule_token": token, "expected_target_client": "ChatGPT"})
        self.assertFalse(hold["valid"])

    def test_runtime_key_rotation_invalidates_receipts(self):
        token = c.cross_client_issue_receipt(self.a)["receipt_token"]
        with patch.object(c, "_KEY", b"X" * 32):
            with self.assertRaises(ValueError):
                c._verify_token(token)

    def test_no_remote_side_effect(self):
        self.assertNotIn("write", " ".join(c.HANDLERS).lower())
        self.assertNotIn("mailbox", " ".join(c.HANDLERS).lower())
        self.assertEqual(len(c.HANDLERS), 4)

    def test_http_initialize_list_call(self):
        httpd = ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        try:
            def rpc(num, method, params):
                conn = http.client.HTTPConnection("127.0.0.1", httpd.server_port, timeout=4)
                body = json.dumps({"jsonrpc": "2.0", "id": num, "method": method, "params": params})
                conn.request("POST", "/mcp", body=body, headers={
                    "Accept": "application/json", "Content-Type": "application/json",
                })
                response = conn.getresponse()
                value = json.loads(response.read())
                self.assertEqual(response.status, 200)
                conn.close()
                return value["result"]
            init = rpc(1, "initialize", {"protocolVersion": "2025-06-18"})
            self.assertEqual(init["serverInfo"]["version"], "0.8.6")
            tools = rpc(2, "tools/list", {})["tools"]
            self.assertTrue({t["name"] for t in c.TOOLS}.issubset({t["name"] for t in tools}))
            result = rpc(3, "tools/call", {
                "name": "cross_client_issue_receipt", "arguments": self.a,
            })
            self.assertFalse(result["isError"])
            self.assertEqual(json.loads(result["content"][0]["text"]), result["structuredContent"])
        finally:
            httpd.shutdown()
            httpd.server_close()
            thread.join(timeout=5)


if __name__ == "__main__":
    unittest.main()
