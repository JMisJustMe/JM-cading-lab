#!/usr/bin/env python3
"""Identity-preserving language services, LSP transport and debugger for JM bodies."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, BinaryIO, TextIO

COMMAND_HELP = {
    "NATIVE": "Declare the sovereign body ID and native version.",
    "LAW": "Bind source execution to the registered governing law.",
    "TRACE": "Record visible route and state consequence.",
    "DING": "Record an earned body receipt; this does not bypass proof boundaries.",
    "END": "Close the source body explicitly.",
}


def _line_range(line: int, column: int = 1, width: int = 1) -> dict[str, Any]:
    start_line = max(0, int(line or 1) - 1)
    start_character = max(0, int(column or 1) - 1)
    return {
        "start": {"line": start_line, "character": start_character},
        "end": {"line": start_line, "character": start_character + max(1, width)},
    }


def diagnostics(profile: dict[str, Any], core: Any, source: str) -> list[dict[str, Any]]:
    parsed = core.parse(profile, source)
    result: list[dict[str, Any]] = []
    for item in parsed["diagnostics"]:
        code = str(item.get("code", "JM_DIAGNOSTIC"))
        line = int(item.get("line") or 1)
        op = str(item.get("op") or code)
        result.append(
            {
                "range": _line_range(line, 1, len(op)),
                "severity": 1,
                "code": code,
                "source": f'jm.body.{profile["body"]["id"]}',
                "message": diagnostic_message(item),
                "data": {"body_id": profile["body"]["id"], "diagnostic": item},
            }
        )
    return result


def diagnostic_message(item: dict[str, Any]) -> str:
    code = str(item.get("code", "JM_DIAGNOSTIC"))
    messages = {
        "NATIVE_HEADER_REQUIRED": "The source must begin with NATIVE <body-id> <version>.",
        "BODY_ID_MISMATCH": "The source body ID does not match this sovereign compiler.",
        "VERSION_MISMATCH": "The native source version does not match this body profile.",
        "AFTER_END": "No source operation may appear after END.",
        "COMMAND_NOT_ALLOWED": "The command is not permitted by this body.",
        "END_REQUIRED": "The source body must close with END.",
        "ONE_LAW_REQUIRED": "Exactly one LAW statement is required.",
        "LAW_MISMATCH": "The source law does not match the body authority.",
        "TRACE_REQUIRED": "At least one TRACE statement is required.",
        "ONE_DING_REQUIRED": "Exactly one DING statement is required.",
        "FAMILY_MEANING_NOT_PROVEN": "The source does not demonstrate a required family operation.",
        "BODY_CAPABILITY_REQUIRED": "The source does not demonstrate a body-specific capability.",
    }
    message = messages.get(code, code.replace("_", " ").title())
    details = {key: value for key, value in item.items() if key not in {"code", "line"}}
    return f"{message} Details: {json.dumps(details, ensure_ascii=False, sort_keys=True)}" if details else message


def completion_items(profile: dict[str, Any]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for command in ["NATIVE", *profile["commands"], "END"]:
        detail = COMMAND_HELP.get(command, f'{profile["body"]["name"]} command')
        insert = command
        if command == "NATIVE":
            insert = f'NATIVE {profile["body"]["id"]} {profile["native_version"]}'
        items.append(
            {
                "label": command,
                "kind": 14,
                "detail": detail,
                "documentation": {
                    "kind": "markdown",
                    "value": f'**{command}** — {detail}\n\nBody: `{profile["body"]["id"]}`',
                },
                "insertText": insert,
                "data": {"body_id": profile["body"]["id"], "command": command},
            }
        )
    return items


def document_symbols(profile: dict[str, Any], core: Any, source: str) -> list[dict[str, Any]]:
    parsed = core.parse(profile, source)
    symbols: list[dict[str, Any]] = []
    header_line = 1
    for token in parsed.get("tokens", []):
        if token.get("op") == "NATIVE":
            header_line = int(token.get("line") or 1)
            break
    symbols.append(
        {
            "name": profile["body"]["name"],
            "detail": profile["body"]["id"],
            "kind": 2,
            "range": _line_range(header_line, 1, 6),
            "selectionRange": _line_range(header_line, 1, 6),
        }
    )
    for index, statement in enumerate(parsed["ast"]["statements"]):
        op = str(statement["op"])
        line = int(statement["line"])
        symbols.append(
            {
                "name": f"{index + 1:02d} {op}",
                "detail": json.dumps(statement.get("value"), ensure_ascii=False),
                "kind": 12,
                "range": _line_range(line, int(statement.get("column") or 1), len(op)),
                "selectionRange": _line_range(line, int(statement.get("column") or 1), len(op)),
            }
        )
    return symbols


def format_source(source: str) -> str:
    output: list[str] = []
    for raw in source.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        stripped = raw.strip()
        if not stripped:
            continue
        if stripped.startswith("#") or stripped.startswith("//"):
            output.append(stripped)
            continue
        head, separator, rest = stripped.partition(" ")
        op = head.upper()
        output.append(op if not separator else f"{op} {rest.strip()}")
    return "\n".join(output) + "\n"


def hover(profile: dict[str, Any], source: str, line: int) -> dict[str, Any] | None:
    lines = source.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    if line < 0 or line >= len(lines):
        return None
    stripped = lines[line].strip()
    if not stripped:
        return None
    command = stripped.split(maxsplit=1)[0].upper()
    if command not in {"NATIVE", *profile["commands"], "END"}:
        return None
    detail = COMMAND_HELP.get(command, f'{profile["body"]["name"]} body-native command.')
    return {
        "contents": {
            "kind": "markdown",
            "value": (
                f'### `{command}`\n\n{detail}\n\n'
                f'**Body:** `{profile["body"]["id"]}`  \n'
                f'**Family:** `{profile["family"]}`  \n'
                f'**Authority hash:** `{profile["identity_sha256"]}`'
            ),
        }
    }


def debug_trace(profile: dict[str, Any], core: Any, source: str) -> dict[str, Any]:
    parsed = core.parse(profile, source)
    if not parsed["ok"]:
        return {
            "schema": "jm.body.debug-trace/0.1",
            "status": "FAULT_HOLD",
            "body_id": profile["body"]["id"],
            "identity_sha256": profile["identity_sha256"],
            "faults": parsed["diagnostics"],
            "steps": [],
            "recovery": "Repair source diagnostics, then rerun without changing body authority.",
        }

    state: dict[str, Any] = {}
    steps: list[dict[str, Any]] = []
    for index, statement in enumerate(parsed["ast"]["statements"]):
        before = dict(state)
        op = str(statement["op"])
        value = statement.get("value")
        if op not in {"LAW", "TRACE", "DING"}:
            state[op] = value
        steps.append(
            {
                "index": index,
                "line": statement["line"],
                "op": op,
                "value": value,
                "state_before": before,
                "state_after": dict(state),
                "body_id": profile["body"]["id"],
            }
        )
    ir = core.lower_ir(profile, parsed["ast"])
    return {
        "schema": "jm.body.debug-trace/0.1",
        "status": "DEBUG_TRACE_PASS",
        "body_id": profile["body"]["id"],
        "identity_sha256": profile["identity_sha256"],
        "source_sha256": parsed["ast"]["source_sha256"],
        "ir_namespace": ir["namespace"],
        "operation_count": len(ir["operations"]),
        "steps": steps,
        "final_state": state,
        "faults": [],
    }


def _read_message(stream: BinaryIO) -> dict[str, Any] | None:
    headers: dict[str, str] = {}
    while True:
        line = stream.readline()
        if not line:
            return None
        if line in {b"\r\n", b"\n"}:
            break
        key, _, value = line.decode("ascii").partition(":")
        headers[key.strip().lower()] = value.strip()
    length = int(headers.get("content-length", "0"))
    if length <= 0:
        return None
    payload = stream.read(length)
    return json.loads(payload.decode("utf-8"))


def _write_message(stream: BinaryIO, message: dict[str, Any]) -> None:
    payload = json.dumps(message, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    stream.write(f"Content-Length: {len(payload)}\r\n\r\n".encode("ascii"))
    stream.write(payload)
    stream.flush()


def lsp_main(profile: dict[str, Any], core: Any, stdin: BinaryIO | None = None, stdout: BinaryIO | None = None) -> int:
    input_stream = stdin or sys.stdin.buffer
    output_stream = stdout or sys.stdout.buffer
    documents: dict[str, str] = {}
    shutdown = False

    while True:
        message = _read_message(input_stream)
        if message is None:
            return 0
        method = message.get("method")
        request_id = message.get("id")
        params = message.get("params") or {}

        if method == "initialize":
            result = {
                "capabilities": {
                    "textDocumentSync": 1,
                    "completionProvider": {"triggerCharacters": [" "]},
                    "hoverProvider": True,
                    "documentSymbolProvider": True,
                    "documentFormattingProvider": True,
                },
                "serverInfo": {
                    "name": f'JM {profile["body"]["name"]} Language Server',
                    "version": "0.1",
                },
            }
            _write_message(output_stream, {"jsonrpc": "2.0", "id": request_id, "result": result})
            continue
        if method == "shutdown":
            shutdown = True
            _write_message(output_stream, {"jsonrpc": "2.0", "id": request_id, "result": None})
            continue
        if method == "exit":
            return 0 if shutdown else 1
        if method in {"textDocument/didOpen", "textDocument/didChange"}:
            text_document = params.get("textDocument") or {}
            uri = str(text_document.get("uri") or "")
            if method == "textDocument/didOpen":
                text = str(text_document.get("text") or "")
            else:
                changes = params.get("contentChanges") or []
                text = str(changes[-1].get("text") or "") if changes else documents.get(uri, "")
            documents[uri] = text
            _write_message(
                output_stream,
                {
                    "jsonrpc": "2.0",
                    "method": "textDocument/publishDiagnostics",
                    "params": {"uri": uri, "diagnostics": diagnostics(profile, core, text)},
                },
            )
            continue
        if request_id is None:
            continue

        text_document = params.get("textDocument") or {}
        uri = str(text_document.get("uri") or "")
        source = documents.get(uri, "")
        if method == "textDocument/completion":
            result = {"isIncomplete": False, "items": completion_items(profile)}
        elif method == "textDocument/documentSymbol":
            result = document_symbols(profile, core, source)
        elif method == "textDocument/hover":
            position = params.get("position") or {}
            result = hover(profile, source, int(position.get("line") or 0))
        elif method == "textDocument/formatting":
            lines = source.splitlines()
            result = [
                {
                    "range": {
                        "start": {"line": 0, "character": 0},
                        "end": {"line": max(0, len(lines)), "character": 0},
                    },
                    "newText": format_source(source),
                }
            ]
        else:
            _write_message(
                output_stream,
                {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "error": {"code": -32601, "message": f"Method not found: {method}"},
                },
            )
            continue
        _write_message(output_stream, {"jsonrpc": "2.0", "id": request_id, "result": result})


def debugger_cli(profile: dict[str, Any], core: Any) -> int:
    parser = argparse.ArgumentParser(description=f'{profile["body"]["name"]} body debugger')
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    receipt = debug_trace(profile, core, args.source.read_text(encoding="utf-8"))
    rendered = json.dumps(receipt, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    else:
        print(rendered, end="")
    return 0 if receipt["status"] == "DEBUG_TRACE_PASS" else 1
