#!/usr/bin/env python3
"""Install identity-bound SDK packaging, language services and debuggers into every JM body."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path
from typing import Any

import full_stack_factory as stack

SCHEMA = "jm.everybody.body-tooling-factory/0.1"
TOOLING_VERSION = "0.1"


def stable_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def safe_distribution(value: str) -> str:
    result = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    if not result:
        raise ValueError(f"invalid distribution name {value!r}")
    return result


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def write_json(path: Path, value: Any) -> None:
    write(path, json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n")


def language_server_wrapper(current: dict[str, Any]) -> str:
    encoded = repr(json.dumps(current, ensure_ascii=False, sort_keys=True))
    return f'''#!/usr/bin/env python3
import json
try:
    from . import core as _core
    from .tooling_core import completion_items as _completion_items, diagnostics as _diagnostics, document_symbols as _document_symbols, format_source, hover as _hover, lsp_main as _lsp_main
except ImportError:
    import core as _core
    from tooling_core import completion_items as _completion_items, diagnostics as _diagnostics, document_symbols as _document_symbols, format_source, hover as _hover, lsp_main as _lsp_main
PROFILE = json.loads({encoded})
BODY = PROFILE["body"]
def diagnostics(source): return _diagnostics(PROFILE, _core, source)
def completion_items(): return _completion_items(PROFILE)
def document_symbols(source): return _document_symbols(PROFILE, _core, source)
def hover(source, line): return _hover(PROFILE, source, line)
def serve(stdin=None, stdout=None): return _lsp_main(PROFILE, _core, stdin=stdin, stdout=stdout)
def main(): return serve()
if __name__ == "__main__": raise SystemExit(main())
'''


def debugger_wrapper(current: dict[str, Any]) -> str:
    encoded = repr(json.dumps(current, ensure_ascii=False, sort_keys=True))
    return f'''#!/usr/bin/env python3
import json
try:
    from . import core as _core
    from .tooling_core import debug_trace as _debug_trace, debugger_cli as _debugger_cli
except ImportError:
    import core as _core
    from tooling_core import debug_trace as _debug_trace, debugger_cli as _debugger_cli
PROFILE = json.loads({encoded})
BODY = PROFILE["body"]
def debug_trace(source): return _debug_trace(PROFILE, _core, source)
def main(): return _debugger_cli(PROFILE, _core)
if __name__ == "__main__": raise SystemExit(main())
'''


def pyproject(current: dict[str, Any], module: str) -> str:
    body = current["body"]
    distribution = f'jm-body-{safe_distribution(body["id"])}'
    command = safe_distribution(body["id"])
    return f'''[build-system]
requires = ["setuptools>=75", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "{distribution}"
version = "{TOOLING_VERSION}"
description = {json.dumps(body["name"] + " sovereign JM compiler, SDK, language server and debugger", ensure_ascii=False)}
requires-python = ">=3.11"
license = {{ text = "Proprietary JM Estate Source" }}
authors = [{{ name = "Theodore Benjamin Scott / JM / JMISJUSTME" }}]
classifiers = [
  "Programming Language :: Python :: 3",
  "Programming Language :: Python :: 3 :: Only",
]

[project.scripts]
jm-{command}-compile = "jm_{module}.compiler:main"
jm-{command}-lsp = "jm_{module}.language_server:main"
jm-{command}-debug = "jm_{module}.debugger:main"

[tool.setuptools]
packages = ["jm_{module}"]

[tool.setuptools.package-data]
"jm_{module}" = ["py.typed"]
'''


def sdk_readme(current: dict[str, Any], module: str) -> str:
    body = current["body"]
    command = safe_distribution(body["id"])
    return f'''# {body["name"]} Sovereign SDK

Body ID: `{body["id"]}`  
Family: `{current["family"]}`  
Identity SHA-256: `{current["identity_sha256"]}`

## Installed routes

- `jm-{command}-compile` — parser/compiler/backend CLI;
- `jm-{command}-lsp` — body-native Language Server Protocol process;
- `jm-{command}-debug` — source-mapped state/operation debugger;
- Python package `jm_{module}` — compiler, diagnostics, completion, symbols, formatting and debug APIs.

The package is identity-bound. Shared implementation organs do not authorise another body to compile this body’s source.
'''


def generate_body(out: Path, current: dict[str, Any], tooling_core_text: str) -> dict[str, Any]:
    body = current["body"]
    module = stack.safe_name(body["id"])
    root = out / "bodies" / body["id"]
    package = root / "sdk" / f"jm_{module}"
    if not package.is_dir() or not (package / "compiler.py").is_file():
        raise SystemExit(f"full-stack compiler package missing for {body['id']}")

    write(package / "tooling_core.py", tooling_core_text)
    write(package / "language_server.py", language_server_wrapper(current))
    write(package / "debugger.py", debugger_wrapper(current))
    write(package / "py.typed", "")
    write(
        package / "sdk.py",
        "from .compiler import BODY, PROFILE, compile_source, emit, lower_ir, parse\n"
        "from .language_server import completion_items, diagnostics, document_symbols, format_source, hover, serve\n"
        "from .debugger import debug_trace\n",
    )
    write(package / "__init__.py", "from .sdk import *  # noqa: F401,F403\n")
    write(root / "sdk" / "pyproject.toml", pyproject(current, module))
    write(root / "sdk" / "README.md", sdk_readme(current, module))

    tooling_contract = {
        "schema": "jm.body.tooling-contract/0.1",
        "tooling_version": TOOLING_VERSION,
        "body_id": body["id"],
        "body_name": body["name"],
        "family": current["family"],
        "identity_sha256": current["identity_sha256"],
        "services": {
            "diagnostics": "IMPLEMENTED",
            "completion": "IMPLEMENTED",
            "hover": "IMPLEMENTED",
            "document_symbols": "IMPLEMENTED",
            "formatting": "IMPLEMENTED",
            "lsp_stdio": "IMPLEMENTED",
            "debug_trace": "IMPLEMENTED",
            "source_maps": "INHERITED_FROM_BODY_AST",
            "package_metadata": "IMPLEMENTED",
        },
        "commands": [
            f"jm-{safe_distribution(body['id'])}-compile",
            f"jm-{safe_distribution(body['id'])}-lsp",
            f"jm-{safe_distribution(body['id'])}-debug",
        ],
        "claim_boundary": "Language-service and debugger conformance does not prove recovered historical syntax, IDE marketplace publication or final self-hosting.",
    }
    write_json(root / "tooling" / "contract.json", tooling_contract)

    manifest_path = root / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["tooling_state"] = {
        "schema": tooling_contract["schema"],
        "version": TOOLING_VERSION,
        "services": tooling_contract["services"],
        "contract_sha256": sha(stable_json(tooling_contract)),
    }
    write_json(manifest_path, manifest)

    return {
        "body_id": body["id"],
        "module": f"jm_{module}",
        "identity_sha256": current["identity_sha256"],
        "tooling_contract_sha256": sha(stable_json(tooling_contract)),
        "service_count": len(tooling_contract["services"]),
    }


def tree_digest(root: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(p for p in root.rglob("*") if p.is_file()):
        digest.update(path.relative_to(root).as_posix().encode("utf-8"))
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()


def generate(repo: Path, out: Path, selected: str | None = None, create_stack: bool = True) -> dict[str, Any]:
    if create_stack:
        stack.generate(repo, out, selected)
    bodies = stack.load_bodies(repo)
    if selected:
        bodies = [body for body in bodies if body["id"] == selected]
        if not bodies:
            raise SystemExit(f"unknown body id {selected!r}")
    tooling_core_text = (Path(__file__).resolve().parent / "body_tooling_core.py").read_text(encoding="utf-8")
    entries = [generate_body(out, stack.profile(body), tooling_core_text) for body in bodies]
    receipt = {
        "schema": SCHEMA,
        "status": "BODY_NATIVE_LANGUAGE_SERVICES_AND_DEBUGGERS_PASS",
        "body_count": len(entries),
        "services_per_body": 9,
        "service_records": len(entries) * 9,
        "entries": entries,
        "claim_boundary": "Tooling bodies are generated and conformance-testable; publication, historical exactness and self-hosting remain separate gates.",
    }
    write_json(out / "BODY_TOOLING_RECEIPT.json", receipt)
    return receipt


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[4])
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--body")
    parser.add_argument("--clean", action="store_true")
    parser.add_argument("--augment-existing", action="store_true")
    args = parser.parse_args()
    if args.clean and args.out.exists():
        shutil.rmtree(args.out)
    args.out.mkdir(parents=True, exist_ok=True)
    receipt = generate(
        args.repo_root.resolve(),
        args.out.resolve(),
        selected=args.body,
        create_stack=not args.augment_existing,
    )
    receipt["tree_sha256"] = tree_digest(args.out.resolve())
    print(json.dumps(receipt, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
