#!/usr/bin/env python3
"""JM M001 Storage Steward: local, read-only MCP custody contact adapter.

This is an additive host adapter, not a replacement Storage Steward, Source
Ledger, Owner Vault, or a direct ChatGPT Library API. The two directories must
be independently mounted by an authorised local host. No network or writes.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import sys

SCHEMA = "JM.M001.StorageLibraryContact/CP34.1"
MAX_BYTES = 16 * 1024 * 1024
DROPBOX_BLOCK = 4 * 1024 * 1024
SHA = re.compile(r"^[a-f0-9]{64}$")


class Hold(Exception):
    pass


def file_bytes(root, relative):
    if not isinstance(relative, str) or not relative or len(relative) > 512:
        raise Hold("INVALID_RELATIVE_PATH")
    if relative.startswith(("/", "~")) or "\\" in relative or "\x00" in relative:
        raise Hold("INVALID_RELATIVE_PATH")
    parts = PurePosixPath(relative).parts
    if not parts or any(p in (".", "..") or p.startswith(".") for p in parts):
        raise Hold("PROTECTED_PATH")
    original_root = Path(root).expanduser()
    if original_root.is_symlink() or not original_root.is_dir():
        raise Hold("AUTHORISED_ROOT_UNAVAILABLE")
    base = original_root.resolve(strict=True)
    target = base
    for component in parts:
        target = target / component
        if target.is_symlink():
            raise Hold("SYMLINK_REFUSED")
    try:
        resolved = target.resolve(strict=True)
        st = target.stat()
    except (OSError, RuntimeError):
        raise Hold("SOURCE_NOT_READABLE")
    if not resolved.is_relative_to(base) or not stat.S_ISREG(st.st_mode):
        raise Hold("NOT_REGULAR_WITHIN_ROOT")
    if st.st_size > MAX_BYTES:
        raise Hold("MAX_BYTES_EXCEEDED")
    # O_NOFOLLOW defends the leaf on platforms supporting it; inode/size are
    # checked again after opening. All data stays in the local process.
    flags = os.O_RDONLY | getattr(os, "O_BINARY", 0) | getattr(os, "O_NOFOLLOW", 0)
    try:
        fd = os.open(str(target), flags)
        with os.fdopen(fd, "rb") as handle:
            opened = os.fstat(handle.fileno())
            if not stat.S_ISREG(opened.st_mode) or (opened.st_dev, opened.st_ino) != (st.st_dev, st.st_ino):
                raise Hold("SOURCE_CHANGED_DURING_READ")
            data = handle.read(MAX_BYTES + 1)
            after = os.fstat(handle.fileno())
    except OSError:
        raise Hold("SOURCE_NOT_READABLE")
    if len(data) > MAX_BYTES or len(data) != after.st_size or st.st_size != after.st_size:
        raise Hold("SOURCE_CHANGED_OR_OVERSIZED")
    return data


def dropbox_content_hash(data):
    parts = bytearray()
    for offset in range(0, len(data), DROPBOX_BLOCK):
        parts.extend(hashlib.sha256(data[offset:offset + DROPBOX_BLOCK]).digest())
    return hashlib.sha256(parts).hexdigest()


def format_state(data, expected):
    if expected == "json":
        try:
            json.loads(data.decode("utf-8-sig"))
        except (UnicodeDecodeError, ValueError):
            if b"<Code>ServerBusy</Code>" in data[:2048]:
                return "STORED_SERVER_ERROR_HOLD"
            return "INVALID_JSON_HOLD"
    return "VALID"


def compare(roots, arguments):
    if not isinstance(arguments, dict):
        raise Hold("ARGUMENT_OBJECT_REQUIRED")
    if not roots.get("library") or not roots.get("recovery"):
        raise Hold("TWO_AUTHORISABLE_LOCAL_ROOTS_REQUIRED")
    left_root = Path(roots["library"]).expanduser().resolve(strict=True)
    right_root = Path(roots["recovery"]).expanduser().resolve(strict=True)
    if left_root == right_root:
        raise Hold("INDEPENDENT_ROOTS_REQUIRED")
    left = file_bytes(roots["library"], arguments.get("library_file"))
    right = file_bytes(roots["recovery"], arguments.get("recovery_file"))
    fmt = arguments.get("format", "any")
    # JSON-named files must be parsed even if the caller omits format or
    # explicitly requests "any". Identical poisoned bytes are not a Ding.
    if fmt == "any" and any(str(arguments.get(key, "")).lower().endswith(".json")
                            for key in ("library_file", "recovery_file")):
        fmt = "json"
    if fmt not in ("any", "json"):
        raise Hold("FORMAT_NOT_SUPPORTED")
    expected = arguments.get("expected_sha256")
    provider = arguments.get("recovery_dropbox_content_hash")
    for field in (expected, provider):
        if field is not None and (not isinstance(field, str) or not SHA.fullmatch(field)):
            raise Hold("INVALID_EXPECTED_DIGEST")
    lsha = hashlib.sha256(left).hexdigest()
    rsha = hashlib.sha256(right).hexdigest()
    lvalid = format_state(left, fmt)
    rvalid = format_state(right, fmt)
    provider_ok = None if provider is None else dropbox_content_hash(right) == provider
    equal = left == right
    if lvalid != "VALID" or rvalid != "VALID":
        state = "FORMAT_HOLD"
    elif provider_ok is False:
        state = "PROVIDER_DIGEST_HOLD"
    elif expected is not None and (lsha != expected or rsha != expected):
        state = "EXPECTED_DIGEST_HOLD"
    elif equal:
        state = "EXACT_BYTES_MATCH"
    else:
        state = "DIFFERENT_BYTES_HOLD"
    return {
        "schema": SCHEMA,
        "state": state,
        "same_bytes": equal,
        "library": {"bytes": len(left), "sha256": lsha, "format_state": lvalid},
        "recovery": {"bytes": len(right), "sha256": rsha, "format_state": rvalid},
        "dropbox_content_hash_matches": provider_ok,
        "source_authority": "HOST_MOUNT_ASSERTION_ONLY",
        "independent_restore_proven": False,
        "native_mutations": 0,
        "retirement_authorised": False,
        "quota_savings_claimed_bytes": 0,
    }


def tool_result(value):
    return {"content": [{"type": "text", "text": json.dumps(value, sort_keys=True)}],
            "structuredContent": value, "isError": value.get("state") not in ("READ_ONLY", "EXACT_BYTES_MATCH")}


def tools_list():
    return [
        {"name": "storage_contact_status",
         "description": "Show configured local snapshot contact, never provider-native authority.",
         "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False}},
        {"name": "custody_compare",
         "description": "Compare independently mounted local Library/cold snapshot bytes; never returns content or mutates files.",
         "inputSchema": {"type": "object",
                         "properties": {
                             "library_file": {"type": "string"},
                             "recovery_file": {"type": "string"},
                             "format": {"type": "string", "enum": ["any", "json"]},
                             "expected_sha256": {"type": "string"},
                             "recovery_dropbox_content_hash": {"type": "string"}},
                         "required": ["library_file", "recovery_file"],
                         "additionalProperties": False}}
    ]


def dispatch(request, roots):
    if not isinstance(request, dict) or request.get("jsonrpc") != "2.0":
        return {"jsonrpc": "2.0", "id": request.get("id") if isinstance(request, dict) else None,
                "error": {"code": -32600, "message": "Invalid Request"}}
    method = request.get("method")
    if method and method.startswith("notifications/"):
        return None
    ident = request.get("id")
    if method == "initialize":
        result = {"protocolVersion": "2025-06-18", "capabilities": {"tools": {}},
                  "serverInfo": {"name": "JM M001 Storage Steward Local Contact", "version": "CP34.1"}}
    elif method == "ping":
        result = {}
    elif method == "tools/list":
        result = {"tools": tools_list()}
    elif method == "tools/call":
        params = request.get("params", {})
        if not isinstance(params, dict):
            params = {}
        name = params.get("name")
        args = params.get("arguments", {})
        if name == "storage_contact_status":
            result = tool_result({"schema": SCHEMA, "state": "READ_ONLY",
                                  "library_root": "CONFIGURED" if roots.get("library") else "HOLD",
                                  "recovery_root": "CONFIGURED" if roots.get("recovery") else "HOLD",
                                  "provider_native_access": False, "native_mutations": 0})
        elif name == "custody_compare":
            try:
                result = tool_result(compare(roots, args))
            except (Hold, OSError, TypeError, ValueError) as exc:
                reason = str(exc) if isinstance(exc, Hold) else "INVALID_INPUT_OR_LOCAL_ROOT"
                result = tool_result({"schema": SCHEMA, "state": "HOLD", "reason": reason,
                                      "native_mutations": 0, "retirement_authorised": False})
        else:
            return {"jsonrpc": "2.0", "id": ident, "error": {"code": -32601, "message": "Unknown tool"}}
    else:
        return {"jsonrpc": "2.0", "id": ident, "error": {"code": -32601, "message": "Unknown method"}}
    if ident is None:
        return None
    return {"jsonrpc": "2.0", "id": ident, "result": result}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--library-root", default="")
    parser.add_argument("--recovery-root", default="")
    cfg = parser.parse_args()
    roots = {"library": cfg.library_root, "recovery": cfg.recovery_root}
    for line in sys.stdin:
        try:
            req = json.loads(line)
            response = dispatch(req, roots)
        except (ValueError, TypeError):
            response = {"jsonrpc": "2.0", "id": None,
                        "error": {"code": -32700, "message": "Parse error"}}
        if response is not None:
            sys.stdout.write(json.dumps(response, separators=(",", ":")) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
