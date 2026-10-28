"""CP10 additive modern MCP request envelope for existing independent OAuth seats.

This module is a transport adapter ONLY. OAuth owner admission and native MCP
tool execution stay with the existing sovereign gateways/recipient engines.
No version is advertised until modern header, metadata, discovery and
complete-result compatibility are implemented for the bounded tools surface.
"""
MODERN = "2026-07-28"
LEGACY = ("2025-11-25", "2025-06-18", "2025-03-26")
VERSION_KEY = "io.modelcontextprotocol/protocolVersion"
INFO_KEY = "io.modelcontextprotocol/clientInfo"
CAPS_KEY = "io.modelcontextprotocol/clientCapabilities"

class CP10ProtocolError(Exception):
    def __init__(self, status, code, message, data=None):
        super().__init__(message)
        self.status, self.code, self.message, self.data = status, code, message, data

    def rpc(self, request_id):
        err = {"code": self.code, "message": self.message}
        if self.data is not None:
            err["data"] = self.data
        return {"jsonrpc": "2.0", "id": request_id, "error": err}

def prepare(request, headers):
    """Classify/validate modern messages; keep legacy messages unchanged.

    Must run AFTER checking OAuth bearer and its scope.  This never grants
    anonymous discovery or forwards modern metadata to a legacy engine.
    """
    params = request.get("params", {})
    if not isinstance(params, dict):
        raise CP10ProtocolError(400, -32602, "Invalid request params")
    meta = params.get("_meta")
    meta_version = meta.get(VERSION_KEY) if isinstance(meta, dict) else None
    header_version = headers.get("MCP-Protocol-Version")
    modern_intent = (
        header_version == MODERN or meta_version == MODERN or
        (header_version not in (None, "", *LEGACY) and meta_version == header_version)
    )
    if not modern_intent:
        return False, request

    if not isinstance(meta, dict) or not header_version or header_version != meta_version:
        raise CP10ProtocolError(400, -32020, "Header mismatch: MCP protocol version")
    if header_version != MODERN:
        raise CP10ProtocolError(400, -32022, "Unsupported protocol version",
            {"supported": [MODERN, LEGACY[0]], "requested": header_version})
    method = request.get("method")
    if not isinstance(method, str) or headers.get("Mcp-Method") != method:
        raise CP10ProtocolError(400, -32020, "Header mismatch: Mcp-Method")
    if not isinstance(meta.get(INFO_KEY), dict) or not isinstance(meta.get(CAPS_KEY), dict):
        raise CP10ProtocolError(400, -32602, "Modern MCP client metadata required")
    if "id" not in request or request["id"] is None:
        raise CP10ProtocolError(400, -32600, "Modern MCP request id required")
    if method == "tools/call":
        name = params.get("name")
        if not isinstance(name, str) or headers.get("Mcp-Name") != name:
            raise CP10ProtocolError(400, -32020, "Header mismatch: Mcp-Name")
        if "inputResponses" in params or "requestState" in params:
            raise CP10ProtocolError(400, -32602,
                "Input-required continuation unsupported by this bounded native tool bridge")
    elif headers.get("Mcp-Name"):
        raise CP10ProtocolError(400, -32020, "Unexpected Mcp-Name")
    if method not in ("server/discover", "tools/list", "tools/call"):
        raise CP10ProtocolError(404, -32601, "Method not found")
    # Never introduce new capability/authority into the original recipient.
    clean = {key: value for key, value in params.items() if key != "_meta"}
    return True, {**request, "params": clean}

def discover(request_id, name, version):
    return {"jsonrpc": "2.0", "id": request_id,
        "result": {"resultType": "complete",
                   "supportedVersions": [MODERN, LEGACY[0]],
                   "capabilities": {"tools": {}},
                   "_meta": {"io.modelcontextprotocol/serverInfo":
                             {"name": name, "version": version}},
                   "instructions": "Owner-authorised JM OAuth relay to a protected independent original tool engine; no new engine."}}

def adapt_response(response, modern):
    if modern and isinstance(response.get("result"), dict):
        response["result"] = {"resultType": "complete", **response["result"]}
    return response
