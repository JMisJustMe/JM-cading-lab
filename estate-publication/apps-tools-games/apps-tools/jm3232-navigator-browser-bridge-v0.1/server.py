#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from bridge.core import BRIDGE, ROOT, WIDGET_URI, as_tool_result

APP_VERSION = "0.1.0"
SUPPORTED_PROTOCOLS = {"2025-06-18", "2025-03-26"}
DEFAULT_PROTOCOL = "2025-06-18"
PUBLIC = ROOT / "public"

app = FastAPI(title="JM3232 Navigator Browser Bridge", version=APP_VERSION)
app.mount("/assets", StaticFiles(directory=str(PUBLIC)), name="assets")


def allowed_origins() -> set[str]:
    configured = os.environ.get("JM_ALLOWED_ORIGINS", "")
    values = {v.strip().rstrip("/") for v in configured.split(",") if v.strip()}
    values.update({
        "http://localhost:3000", "http://127.0.0.1:3000",
        "http://localhost:5173", "http://127.0.0.1:5173",
        "https://chatgpt.com", "https://chat.openai.com",
    })
    return values


def origin_permitted(request: Request) -> bool:
    origin = request.headers.get("origin")
    if not origin:
        return True
    return origin.rstrip("/") in allowed_origins()


def rpc_result(request_id: Any, result: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": request_id, "result": result}


def rpc_error(request_id: Any, code: int, message: str, data: Any = None) -> dict[str, Any]:
    value: dict[str, Any] = {"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}}
    if data is not None:
        value["error"]["data"] = data
    return value


def tool_meta(widget: bool = False) -> dict[str, Any]:
    value = {
        "openai/toolInvocation/invoking": "Routing through JM3232 Navigator…",
        "openai/toolInvocation/invoked": "Stringreceipt returned",
    }
    if widget:
        value.update({"ui.resourceUri": WIDGET_URI, "openai/outputTemplate": WIDGET_URI})
    return value


TOOLS: list[dict[str, Any]] = [
    {
        "name": "search",
        "title": "Search the JM Estate",
        "description": "Use this when the user wants to find JM Estate bodies, Navigator routes, Radius Lexicon terms, receipts, public doors, or source records. Returns stable IDs for fetch.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "minLength": 1, "description": "Meaning, body name, RootWord, route, capability, or source to find."},
                "limit": {"type": "integer", "minimum": 1, "maximum": 25, "default": 8},
                "sources": {"type": "array", "items": {"type": "string"}, "description": "Optional source_kind filters."},
            },
            "required": ["query"],
            "additionalProperties": False,
        },
        "annotations": {"readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False},
        "_meta": tool_meta(True),
    },
    {
        "name": "fetch",
        "title": "Fetch an Estate source",
        "description": "Use this when a prior search returned a stable ID and the user needs the full source record, route, relationships, flags, and preserved metadata.",
        "inputSchema": {"type": "object", "properties": {"id": {"type": "string", "minLength": 1}}, "required": ["id"], "additionalProperties": False},
        "annotations": {"readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False},
        "_meta": tool_meta(True),
    },
    {
        "name": "navigator_open_stringdoor",
        "title": "Open a Stringdoor",
        "description": "Use this when a JM body or route should be resolved into a user-approved external navigation plan. Navigator governs identity and receipt; the host browser performs navigation.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "target": {"type": "string", "minLength": 1, "description": "Stable body ID, body name, RootWord, or route description."},
                "create_receipt": {"type": "boolean", "default": True},
            },
            "required": ["target"],
            "additionalProperties": False,
        },
        "annotations": {"readOnlyHint": False, "destructiveHint": False, "idempotentHint": False, "openWorldHint": True},
        "_meta": tool_meta(True),
    },
    {
        "name": "navigator_resolve_rootword",
        "title": "Resolve a RootWord",
        "description": "Use this when the user wants Radius Lexicon meaning, good stretches, misuse edges, source boundaries, Visualang route, or wordplay face for a JM term.",
        "inputSchema": {"type": "object", "properties": {"term": {"type": "string", "minLength": 1}}, "required": ["term"], "additionalProperties": False},
        "annotations": {"readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False},
        "_meta": tool_meta(True),
    },
    {
        "name": "navigator_return_lineage",
        "title": "Return source lineage",
        "description": "Use this when the user needs the preserved source, authority, lineage, connections, and claim boundary for a known Estate or Radius record.",
        "inputSchema": {"type": "object", "properties": {"id": {"type": "string", "minLength": 1}}, "required": ["id"], "additionalProperties": False},
        "annotations": {"readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False},
        "_meta": tool_meta(False),
    },
    {
        "name": "navigator_create_stringmark",
        "title": "Create a Stringmark",
        "description": "Use this when the user explicitly wants to bookmark or mark a resolved Estate body or Stringdoor inside the Navigator bridge.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "target_id": {"type": "string", "minLength": 1},
                "label": {"type": "string", "default": ""},
                "note": {"type": "string", "default": ""},
            },
            "required": ["target_id"],
            "additionalProperties": False,
        },
        "annotations": {"readOnlyHint": False, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False},
        "_meta": tool_meta(True),
    },
    {
        "name": "navigator_register_body",
        "title": "Register a sovereign body",
        "description": "Use this when the user explicitly wants to register a new or external body with its identity, route, source, lineage, capabilities, and claim boundary. Registration is not proof.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "body": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"}, "name": {"type": "string", "minLength": 1},
                        "version": {"type": "string"}, "kind": {"type": "string"},
                        "route": {"type": "string"}, "source": {"type": "string"},
                        "lineage": {"type": "array", "items": {}},
                        "capabilities": {"type": "array", "items": {"type": "string"}},
                        "claim_boundary": {"type": "string"},
                    },
                    "required": ["name"],
                    "additionalProperties": False,
                }
            },
            "required": ["body"],
            "additionalProperties": False,
        },
        "annotations": {"readOnlyHint": False, "destructiveHint": False, "idempotentHint": False, "openWorldHint": False},
        "_meta": tool_meta(False),
    },
    {
        "name": "navigator_create_stringreceipt",
        "title": "Create a Stringreceipt",
        "description": "Use this when the user explicitly wants an action, result, and evidence appended to the local hash-chained Navigator receipt log.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "action": {"type": "string", "minLength": 1},
                "target_id": {"type": "string", "minLength": 1},
                "outcome": {"type": "string", "minLength": 1},
                "evidence": {"type": "object", "default": {}},
            },
            "required": ["action", "target_id", "outcome"],
            "additionalProperties": False,
        },
        "annotations": {"readOnlyHint": False, "destructiveHint": False, "idempotentHint": False, "openWorldHint": False},
        "_meta": tool_meta(False),
    },
    {
        "name": "navigator_export_savepack",
        "title": "Export a Navigator SavePack",
        "description": "Use this when the user explicitly asks to preserve current Stringmarks, registered bodies, and receipts as a portable JSON SavePack.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "default": "JM3232_NAVIGATOR_SAVEPACK"},
                "include_receipts": {"type": "boolean", "default": True},
            },
            "additionalProperties": False,
        },
        "annotations": {"readOnlyHint": False, "destructiveHint": False, "idempotentHint": False, "openWorldHint": False},
        "_meta": tool_meta(False),
    },
    {
        "name": "navigator_bridge_status",
        "title": "Inspect bridge status",
        "description": "Use this when the user asks what source bodies are mounted, what the local runtime contains, or which deployment and browser-authorisation gates remain open.",
        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
        "annotations": {"readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": False},
        "_meta": tool_meta(False),
    },
]


async def invoke_tool(name: str, args: dict[str, Any]) -> dict[str, Any]:
    if name == "search":
        value = BRIDGE.search(args["query"], args.get("limit", 8), args.get("sources"))
        return as_tool_result(value, f"Found {value['count']} Stringdoor candidates for “{value['query']}”.")
    if name == "fetch":
        value = BRIDGE.fetch(args["id"])
        return as_tool_result(value, f"Fetched {value['title']} from {value['metadata']['source_file']}.")
    if name == "navigator_open_stringdoor":
        value = BRIDGE.open_stringdoor(args["target"], args.get("create_receipt", True))
        return as_tool_result(value, f"Stringdoor resolved for {value['title']}; navigation remains user/host approved.")
    if name == "navigator_resolve_rootword":
        value = BRIDGE.resolve_rootword(args["term"])
        return as_tool_result(value, f"Resolved the Radius entry for {value['entry']['title']}.")
    if name == "navigator_return_lineage":
        value = BRIDGE.return_lineage(args["id"])
        return as_tool_result(value, f"Returned preserved lineage for {value['title']}.", widget=False)
    if name == "navigator_create_stringmark":
        value = BRIDGE.create_stringmark(args["target_id"], args.get("label", ""), args.get("note", ""))
        return as_tool_result(value, f"Stringmark {value['stringmark']['id']} preserved.")
    if name == "navigator_register_body":
        value = BRIDGE.register_body(args["body"])
        return as_tool_result(value, f"Registered {value['body']['name']} without claiming proof.", widget=False)
    if name == "navigator_create_stringreceipt":
        value = BRIDGE.create_stringreceipt(args["action"], args["target_id"], args["outcome"], args.get("evidence"))
        return as_tool_result(value, f"Stringreceipt {value['id']} appended to the hash chain.", widget=False)
    if name == "navigator_export_savepack":
        value = BRIDGE.export_savepack(args.get("name", "JM3232_NAVIGATOR_SAVEPACK"), args.get("include_receipts", True))
        return as_tool_result(value, f"SavePack exported with SHA-256 {value['sha256']}.", widget=False)
    if name == "navigator_bridge_status":
        value = BRIDGE.bridge_status()
        return as_tool_result(value, f"Bridge state: {value['state']}.", widget=False)
    raise KeyError(f"Unknown tool: {name}")


@app.get("/health")
async def health() -> dict[str, Any]:
    return {"ok": True, "name": "JM3232 Navigator Browser Bridge", "version": APP_VERSION, "chain": BRIDGE.validate_receipt_chain()}


@app.get("/", response_class=HTMLResponse)
async def root() -> str:
    return (ROOT / "00_OPEN_FIRST.html").read_text(encoding="utf-8")


@app.get("/widget", response_class=HTMLResponse)
async def widget() -> Response:
    return HTMLResponse((PUBLIC / "navigator-stringdoor-v0.1.html").read_text(encoding="utf-8"), media_type="text/html;profile=mcp-app")


@app.get("/bridge/search")
async def demo_search(q: str, limit: int = 8) -> dict[str, Any]:
    return BRIDGE.search(q, limit)


@app.get("/bridge/fetch/{record_id:path}")
async def demo_fetch(record_id: str) -> dict[str, Any]:
    return BRIDGE.fetch(record_id)


@app.post("/bridge/tool/{tool_name}")
async def demo_tool(tool_name: str, request: Request) -> dict[str, Any]:
    args = await request.json()
    return await invoke_tool(tool_name, args if isinstance(args, dict) else {})


@app.api_route("/mcp", methods=["GET", "DELETE"])
async def mcp_get_delete() -> Response:
    return JSONResponse(rpc_error(None, -32000, "This bridge does not advertise a server-to-client SSE stream."), status_code=405)


@app.post("/mcp")
async def mcp(request: Request) -> Response:
    if not origin_permitted(request):
        return JSONResponse(rpc_error(None, -32001, "Origin rejected by JM PermissionGate."), status_code=403)
    accept = request.headers.get("accept", "")
    if accept and "application/json" not in accept and "*/*" not in accept and "text/event-stream" not in accept:
        return JSONResponse(rpc_error(None, -32002, "Accept must allow application/json or text/event-stream."), status_code=406)
    try:
        payload = await request.json()
    except Exception:
        return JSONResponse(rpc_error(None, -32700, "Parse error"), status_code=400)
    if not isinstance(payload, dict) or payload.get("jsonrpc") != "2.0" or "method" not in payload:
        return JSONResponse(rpc_error(payload.get("id") if isinstance(payload, dict) else None, -32600, "Invalid Request"), status_code=400)
    request_id = payload.get("id")
    method = payload["method"]
    params = payload.get("params") or {}

    if request_id is None:
        return Response(status_code=202)

    try:
        if method == "initialize":
            requested = params.get("protocolVersion", DEFAULT_PROTOCOL)
            protocol = requested if requested in SUPPORTED_PROTOCOLS else DEFAULT_PROTOCOL
            result = {
                "protocolVersion": protocol,
                "capabilities": {"tools": {"listChanged": False}, "resources": {"subscribe": False, "listChanged": False}},
                "serverInfo": {"name": "JM3232 Navigator Browser Bridge", "version": APP_VERSION},
                "instructions": "Search before fetch. Preserve source identity. Use Stringdoor for navigation plans, Stringmark for explicit bookmarks, Stringreceipt for trace, and SavePack for portable custody. Registration is not proof.",
            }
            return JSONResponse(rpc_result(request_id, result))
        if method == "ping":
            return JSONResponse(rpc_result(request_id, {}))
        if method == "tools/list":
            return JSONResponse(rpc_result(request_id, {"tools": TOOLS}))
        if method == "tools/call":
            name = params.get("name", "")
            args = params.get("arguments") or {}
            result = await invoke_tool(name, args)
            return JSONResponse(rpc_result(request_id, result))
        if method == "resources/list":
            resources = [{
                "uri": WIDGET_URI,
                "name": "JM3232 Stringdoor v0.1",
                "title": "JM3232 Navigator Stringdoor",
                "description": "Compact Stringline-governed search, route, mark, lineage, and receipt field.",
                "mimeType": "text/html;profile=mcp-app",
                "_meta": {
                    "ui.prefersBorder": False,
                    "openai/widgetPrefersBorder": False,
                    "ui.csp": {"connectDomains": [], "resourceDomains": []},
                    "openai/widgetCSP": {"connect_domains": [], "resource_domains": [], "redirect_domains": ["https://jmisjustme-estate.pages.dev", "https://jmisjustme.github.io"]},
                    "openai/widgetDescription": "A compact interactive JM3232 Stringdoor field that searches Estate bodies, resolves RootWords, preserves marks, and returns traceable routes.",
                },
            }]
            return JSONResponse(rpc_result(request_id, {"resources": resources}))
        if method == "resources/read":
            uri = params.get("uri")
            if uri != WIDGET_URI:
                return JSONResponse(rpc_error(request_id, -32004, f"Unknown resource: {uri}"), status_code=404)
            html = (PUBLIC / "navigator-stringdoor-v0.1.html").read_text(encoding="utf-8")
            result = {"contents": [{
                "uri": WIDGET_URI,
                "mimeType": "text/html;profile=mcp-app",
                "text": html,
                "_meta": {
                    "ui.prefersBorder": False,
                    "ui.csp": {"connectDomains": [], "resourceDomains": []},
                    "openai/widgetDescription": "JM3232 Navigator Stringdoor field.",
                },
            }]}
            return JSONResponse(rpc_result(request_id, result))
        return JSONResponse(rpc_error(request_id, -32601, f"Method not found: {method}"), status_code=404)
    except (ValueError, KeyError) as exc:
        return JSONResponse(rpc_error(request_id, -32602, str(exc)), status_code=400)
    except Exception as exc:
        return JSONResponse(rpc_error(request_id, -32603, "Internal error", {"type": type(exc).__name__, "message": str(exc)}), status_code=500)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host=os.environ.get("JM_HOST", "127.0.0.1"), port=int(os.environ.get("JM_PORT", "3000")), reload=False)
