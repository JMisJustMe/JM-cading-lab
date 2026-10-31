#!/usr/bin/env python3
"""JM Scoped Memory MCP stdio plug v0.3 — legacy handshake protocol.

This process is a host *adapter*, not a new agent/core. Each tool executes the
original JM repository adapter via jm_scoped_memory_host.py and consumes its
returned consequence. No network listener, credential storage or production
owner memory migration. Explicit host write opt-in required.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys

from jm_scoped_memory_host import git_workspace, stable

MODERN = "2026-07-28"
PROTOCOL = "2025-11-25"
SUPPORTED = {PROTOCOL, "2025-06-18", "2025-03-26"}
SERVER = {"name": "jm-scoped-memory", "version": "0.3.0"}
HOST = Path(__file__).with_name("jm_scoped_memory_host.py")
MAX_LINE_BYTES = 65536
MAX_NAME = 64
MAX_BODY_BYTES = 8192

def tool(name, desc, props=None, required=None):
    return {"name": name, "description": desc,
            "inputSchema": {"type": "object", "properties": props or {},
                            "required": required or [], "additionalProperties": False}}

NOTE = {"type": "string", "minLength": 1, "maxLength": MAX_NAME,
        "pattern": "^[a-z0-9_-]{1,64}$"}

def tool_defs(writes):
    tools = [
        tool("jm_memory_list", "List non-secret note keys for the current authenticated local OS user and Git workspace."),
        tool("jm_memory_read", "Read one project note in the host-bound JM workspace.", {"name": NOTE}, ["name"]),
    ]
    if writes:
        tools.append(tool("jm_memory_write",
                          "Write one non-secret project note, create or update; commits and reads back before success.",
                          {"name": NOTE,
                           "body": {"type": "string", "minLength": 1, "maxLength": MAX_BODY_BYTES},
                           "mode": {"type": "string", "enum": ["create", "update", "correct"]},
                           "expected_digest": {"type": "string", "pattern": "^[0-9a-f]{64}$"}}, ["name", "body"]))
    return tools

def success(id_, result):
    return {"jsonrpc": "2.0", "id": id_, "result": result}

def rpc_error(id_, code, message):
    return {"jsonrpc": "2.0", "id": id_,
            "error": {"code": code, "message": message}}

def tool_result(data, error=False):
    if not isinstance(data, dict):
        data = {"status": "HOLD", "reason": "invalid host response"}
        error = True
    return {"content": [{"type": "text", "text": stable(data)}],
            "structuredContent": data, "isError": bool(error)}

class JMScopedMCP:
    def __init__(self):
        # Bind once at process startup: no client-provided owner or workspace.
        self.workspace = git_workspace()
        self.writes = os.environ.get("JM_SCOPED_MEMORY_MCP_ALLOW_WRITES") == "1"
        self.ready = False
        self.initialized = False
        self.protocol = PROTOCOL

    def call(self, name, args):
        declared = {item["name"]: item for item in tool_defs(self.writes)}
        if name not in declared:
            return tool_result({"status": "HOLD", "reason": "unsupported or disabled tool"}, True)
        if not isinstance(args, dict):
            return tool_result({"status": "HOLD", "reason": "arguments must be object"}, True)
        definition = declared[name]["inputSchema"]
        keys = set(definition["properties"])
        if set(args) - keys or set(definition["required"]) - set(args):
            return tool_result({"status": "HOLD", "reason": "unknown or missing argument"}, True)
        action = {"jm_memory_list": "list", "jm_memory_read": "read",
                  "jm_memory_write": "write"}[name]
        note_name = args.get("name")
        if action in ("read", "write") and (not isinstance(note_name, str)
                or len(note_name) > MAX_NAME or not note_name
                or not all(c in "abcdefghijklmnopqrstuvwxyz0123456789_-" for c in note_name)):
            return tool_result({"status": "HOLD", "reason": "invalid note name"}, True)
        body = args.get("body")
        if action == "write":
            if not isinstance(body, str):
                return tool_result({"status": "HOLD", "reason": "invalid note body"}, True)
            try:
                body_bytes = len(body.encode("utf-8"))
            except UnicodeError:
                return tool_result({"status": "HOLD", "reason": "invalid Unicode body"}, True)
            if not 0 < body_bytes <= MAX_BODY_BYTES:
                return tool_result({"status": "HOLD", "reason": "invalid note body"}, True)
        mode = args.get("mode", "create")
        if action == "write" and mode not in ("create", "update", "correct"):
            return tool_result({"status": "HOLD", "reason": "invalid write mode"}, True)
        expected_digest = args.get("expected_digest")
        if action == "write":
            if mode == "correct":
                if (not isinstance(expected_digest, str) or len(expected_digest) != 64
                        or any(c not in "0123456789abcdef" for c in expected_digest)):
                    return tool_result({"status": "HOLD", "reason": "correct requires current note digest"}, True)
            elif expected_digest is not None:
                return tool_result({"status": "HOLD", "reason": "digest only permitted for correct"}, True)
        argv = [sys.executable, str(HOST), action, "--harness", "mcp-stdio"]
        if action in ("read", "write"):
            argv.extend(["--name", note_name])
        if action == "write":
            argv.extend(["--mode", mode])
            if mode == "correct":
                argv.extend(["--expected-digest", expected_digest])
        try:
            # No network; no executable path, owner, workspace or core supplied by tool client.
            proc = subprocess.run(argv, input=body if action == "write" else "",
                                  cwd=self.workspace, text=True, capture_output=True,
                                  timeout=25, check=False)
            if proc.returncode == 0:
                result = json.loads(proc.stdout)
                if (result.get("schema") != "JM.ScopedMemoryRepositoryContact/0.2"
                        or result.get("provider_contact") is not False
                        or result.get("workspace") != self.workspace
                        or result.get("authority") != "POSIX_REPOSITORY_PROCESS_NOT_SOVEREIGN_BODY"
                        or not isinstance(result.get("consequence"), dict)):
                    raise ValueError("JM source/host consequence mismatch")
                # Return the exact consequence and boundary, not an assumed success.
                return tool_result(result)
            try:
                error = json.loads(proc.stderr)
                return tool_result({"status": "HOLD", "error_type": error.get("error_type", "HostError"),
                                    "reason": error.get("error", "host refused operation")}, True)
            except ValueError:
                return tool_result({"status": "HOLD", "reason": "host operation failed"}, True)
        except (ValueError, OSError, subprocess.SubprocessError) as exc:
            return tool_result({"status": "HOLD", "reason": type(exc).__name__}, True)

    def modern(self, ident, method, params):
        """Stateless 2026-07-28 MCP era. No legacy handshake or owner override."""
        if not isinstance(params, dict):
            return rpc_error(ident, -32602, "Modern request parameters required")
        meta = params.get("_meta")
        if not isinstance(meta, dict):
            return rpc_error(ident, -32602, "Modern protocol metadata required")
        version = meta.get("io.modelcontextprotocol/protocolVersion")
        allowed = [MODERN, PROTOCOL, "2025-06-18", "2025-03-26"]
        if version != MODERN:
            return {"jsonrpc": "2.0", "id": ident,
                    "error": {"code": -32022, "message": "Unsupported protocol version",
                              "data": {"supportedVersions": allowed}}}
        if not isinstance(meta.get("io.modelcontextprotocol/clientCapabilities"), dict):
            return rpc_error(ident, -32602, "Modern clientCapabilities required")
        def complete(result):
            return success(ident, {**result, "resultType": "complete",
                "_meta": {"io.modelcontextprotocol/serverInfo": SERVER}})
        if method == "server/discover":
            return complete({"supportedVersions": allowed,
                             "capabilities": {"tools": {"listChanged": False}},
                             "instructions": "Local OS/Git scope is host-bound. Write tool disabled by default. No live provider/device proof.",
                             "ttlMs": 0, "cacheScope": "private"})
        if method == "tools/list":
            if params.get("cursor") not in (None, ""):
                return rpc_error(ident, -32602, "Invalid modern cursor")
            return complete({"tools": tool_defs(self.writes)})
        if method == "tools/call":
            name = params.get("name")
            if not isinstance(name, str):
                return rpc_error(ident, -32602, "Missing tool name")
            if name not in {tool["name"] for tool in tool_defs(self.writes)}:
                return rpc_error(ident, -32602, "Unknown or disabled tool")
            return complete(self.call(name, params.get("arguments", {})))
        # Modern removes ping and the 2025 lifecycle; do not accidentally fall back.
        return rpc_error(ident, -32601, "Method not supported in 2026-07-28")

    def handle(self, value):
        if not isinstance(value, dict) or value.get("jsonrpc") != "2.0":
            return rpc_error(None, -32600, "Invalid Request")
        method = value.get("method")
        request = "id" in value
        ident = value.get("id")
        if request and (not isinstance(ident, (str, int)) or isinstance(ident, bool)):
            return rpc_error(None, -32600, "Invalid request id")
        if not isinstance(method, str):
            return rpc_error(ident, -32600, "Missing method")
        params = value.get("params", {})
        if method == "server/discover" or (isinstance(params, dict)
                and isinstance(params.get("_meta"), dict)
                and "io.modelcontextprotocol/protocolVersion" in params["_meta"]):
            if not request:
                return None
            return self.modern(ident, method, params)
        if method == "initialize":
            if not request or not isinstance(params, dict):
                return rpc_error(ident, -32602, "Invalid initialize")
            supplied = params.get("protocolVersion")
            self.protocol = supplied if isinstance(supplied, str) and supplied in SUPPORTED else PROTOCOL
            self.initialized = True
            self.ready = False
            return success(ident, {"protocolVersion": self.protocol,
                                   "capabilities": {"tools": {"listChanged": False}},
                                   "serverInfo": SERVER,
                                   "instructions": "Owner and workspace are bound by local host; writes off until host opt-in. Local MCP transport contact is not live AI provider or owner-device proof."})
        if method == "notifications/initialized":
            if self.initialized:
                self.ready = True
            return None
        if method.startswith("notifications/"):
            return None
        if not request:
            return None
        if not self.ready:
            return rpc_error(ident, -32002, "Initialize handshake required")
        if method == "ping":
            return success(ident, {})
        if method == "tools/list":
            if not isinstance(params, dict) or params.get("cursor") not in (None, ""):
                return rpc_error(ident, -32602, "Invalid list cursor")
            return success(ident, {"tools": tool_defs(self.writes)})
        if method == "tools/call":
            if not isinstance(params, dict):
                return rpc_error(ident, -32602, "Invalid tool request")
            name = params.get("name")
            if not isinstance(name, str):
                return rpc_error(ident, -32602, "Missing tool name")
            return success(ident, self.call(name, params.get("arguments", {})))
        return rpc_error(ident, -32601, "Method not found")

def main():
    try:
        server = JMScopedMCP()
    except (OSError, RuntimeError, ValueError) as ex:
        print("JM MCP HOLD: startup without trusted Git workspace: " + type(ex).__name__, file=sys.stderr)
        return 2
    for raw in sys.stdin.buffer:
        if len(raw) > MAX_LINE_BYTES:
            sys.stdout.write(stable(rpc_error(None, -32600, "Message too large")) + "\n")
            sys.stdout.flush()
            continue
        try:
            msg = json.loads(raw)
            result = server.handle(msg)
        except (ValueError, UnicodeError, TypeError):
            result = rpc_error(None, -32700, "Parse error")
        if result is not None:
            sys.stdout.write(stable(result) + "\n")
            sys.stdout.flush()
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
