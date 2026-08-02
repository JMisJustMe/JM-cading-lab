#!/usr/bin/env python3
from __future__ import annotations

import importlib
import json
import subprocess
import sys
import tempfile
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
TOOLS = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS))
import body_tooling_factory as factory  # noqa: E402


def load_modules(package: Path):
    sdk_root = package.parent
    sys.path.insert(0, str(sdk_root))
    try:
        compiler = importlib.import_module(f"{package.name}.compiler")
        language = importlib.import_module(f"{package.name}.language_server")
        debugger = importlib.import_module(f"{package.name}.debugger")
        return compiler, language, debugger
    finally:
        sys.path.pop(0)


def frame(message: dict) -> bytes:
    payload = json.dumps(message, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return f"Content-Length: {len(payload)}\r\n\r\n".encode("ascii") + payload


def parse_frames(payload: bytes) -> list[dict]:
    messages: list[dict] = []
    offset = 0
    while offset < len(payload):
        boundary = payload.find(b"\r\n\r\n", offset)
        assert boundary >= 0, payload[offset:offset + 200]
        headers = payload[offset:boundary].decode("ascii")
        length = None
        for line in headers.split("\r\n"):
            key, _, value = line.partition(":")
            if key.lower() == "content-length":
                length = int(value.strip())
        assert length is not None
        start = boundary + 4
        end = start + length
        messages.append(json.loads(payload[start:end].decode("utf-8")))
        offset = end
    return messages


def lsp_transport_proof(language_server: Path, body_id: str, source: str) -> None:
    uri = f"file:///proof/{body_id}.jmbody"
    stream = b"".join(
        [
            frame({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}),
            frame({"jsonrpc": "2.0", "method": "initialized", "params": {}}),
            frame(
                {
                    "jsonrpc": "2.0",
                    "method": "textDocument/didOpen",
                    "params": {"textDocument": {"uri": uri, "languageId": body_id, "version": 1, "text": source}},
                }
            ),
            frame(
                {
                    "jsonrpc": "2.0",
                    "id": 2,
                    "method": "textDocument/completion",
                    "params": {"textDocument": {"uri": uri}, "position": {"line": 1, "character": 0}},
                }
            ),
            frame(
                {
                    "jsonrpc": "2.0",
                    "id": 3,
                    "method": "textDocument/documentSymbol",
                    "params": {"textDocument": {"uri": uri}},
                }
            ),
            frame(
                {
                    "jsonrpc": "2.0",
                    "id": 4,
                    "method": "textDocument/formatting",
                    "params": {"textDocument": {"uri": uri}, "options": {"tabSize": 2, "insertSpaces": True}},
                }
            ),
            frame({"jsonrpc": "2.0", "id": 5, "method": "shutdown", "params": {}}),
            frame({"jsonrpc": "2.0", "method": "exit", "params": {}}),
        ]
    )
    process = subprocess.run(
        [sys.executable, str(language_server)],
        input=stream,
        capture_output=True,
        timeout=15,
        check=False,
    )
    assert process.returncode == 0, process.stderr.decode("utf-8", errors="replace")
    messages = parse_frames(process.stdout)
    by_id = {message.get("id"): message for message in messages if "id" in message}
    assert by_id[1]["result"]["serverInfo"]["name"].startswith("JM ")
    assert by_id[2]["result"]["items"]
    assert any(item["label"] == "NATIVE" for item in by_id[2]["result"]["items"])
    assert len(by_id[3]["result"]) >= 2
    assert by_id[4]["result"][0]["newText"].endswith("END\n")
    assert by_id[5]["result"] is None
    published = [message for message in messages if message.get("method") == "textDocument/publishDiagnostics"]
    assert len(published) == 1
    assert published[0]["params"]["diagnostics"] == []


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="jm-body-tooling-a-") as first_temp, tempfile.TemporaryDirectory(prefix="jm-body-tooling-b-") as second_temp:
        first = Path(first_temp) / "generated"
        second = Path(second_temp) / "generated"
        receipt = factory.generate(ROOT, first)
        factory.generate(ROOT, second)

        assert receipt["status"] == "BODY_NATIVE_LANGUAGE_SERVICES_AND_DEBUGGERS_PASS"
        assert receipt["body_count"] == 100
        assert receipt["services_per_body"] == 9
        assert receipt["service_records"] == 900
        assert factory.tree_digest(first) == factory.tree_digest(second)

        package_roots = sorted(first.glob("bodies/*/sdk/jm_*"))
        assert len(package_roots) == 100
        distribution_names: set[str] = set()
        transport_targets = {"cading", "quadze", "finger-two"}
        transported: set[str] = set()

        for package in package_roots:
            body_root = package.parents[1]
            body_id = body_root.name
            fixture = (body_root / "fixtures" / "proof.jmbody").read_text(encoding="utf-8")
            compiler, language, debugger = load_modules(package)

            result = compiler.compile_source(fixture, "ir")
            assert result["ok"], (body_id, result.get("diagnostics"))
            assert language.diagnostics(fixture) == []
            labels = {item["label"] for item in language.completion_items()}
            assert {"NATIVE", "LAW", "TRACE", "DING", "END"}.issubset(labels)
            assert set(compiler.PROFILE["commands"]).issubset(labels)
            symbols = language.document_symbols(fixture)
            assert symbols[0]["detail"] == body_id
            assert len(symbols) == len(result["parsed"]["ast"]["statements"]) + 1
            formatted = language.format_source(fixture)
            assert compiler.compile_source(formatted, "ir")["ok"]
            hovered = language.hover(fixture, 0)
            assert hovered and body_id in hovered["contents"]["value"]

            debug = debugger.debug_trace(fixture)
            assert debug["status"] == "DEBUG_TRACE_PASS"
            assert debug["body_id"] == body_id
            assert debug["ir_namespace"] == f"jm.body.{body_id}"
            assert len(debug["steps"]) == len(result["parsed"]["ast"]["statements"])

            broken = fixture.replace(compiler.BODY["law"], "wrong governing law", 1)
            assert language.diagnostics(broken)
            held = debugger.debug_trace(broken)
            assert held["status"] == "FAULT_HOLD"
            assert held["body_id"] == body_id
            assert held["faults"]

            contract = json.loads((body_root / "tooling" / "contract.json").read_text(encoding="utf-8"))
            manifest = json.loads((body_root / "manifest.json").read_text(encoding="utf-8"))
            project = tomllib.loads((body_root / "sdk" / "pyproject.toml").read_text(encoding="utf-8"))
            assert contract["body_id"] == body_id
            assert contract["identity_sha256"] == compiler.PROFILE["identity_sha256"]
            assert all(value in {"IMPLEMENTED", "INHERITED_FROM_BODY_AST"} for value in contract["services"].values())
            assert manifest["tooling_state"]["services"] == contract["services"]
            assert project["project"]["name"] not in distribution_names
            distribution_names.add(project["project"]["name"])
            assert len(project["project"]["scripts"]) == 3
            assert (package / "py.typed").is_file()

            debugger_process = subprocess.run(
                [sys.executable, str(package / "debugger.py"), str(body_root / "fixtures" / "proof.jmbody")],
                capture_output=True,
                text=True,
                timeout=10,
                check=False,
            )
            assert debugger_process.returncode == 0
            assert json.loads(debugger_process.stdout)["status"] == "DEBUG_TRACE_PASS"

            if body_id in transport_targets:
                lsp_transport_proof(package / "language_server.py", body_id, fixture)
                transported.add(body_id)

        assert len(distribution_names) == 100
        assert transported == transport_targets
        print("JM BODY TOOLING: 100 SDK PACKAGES + 900 SERVICE RECORDS + 100 DEBUGGERS + LSP STDIO TRANSPORT PASS")
        print(f"TREE_SHA256={factory.tree_digest(first)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
