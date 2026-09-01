# Visual + Package Index

The checksum-locked source carrier materialises these complete bodies before CI runs:

- `apps/routeos-kernel-observatory/index.html` — self-contained responsive phone/laptop dashboard;
- `apps/routeos-kernel-observatory/architecture.svg` — 23-stage operational route;
- `apps/routeos-kernel-observatory/sample-trace.json` — deterministic construction preview;
- `tools/decode_trace.py` — raw QEMU serial to structured JSON;
- `tools/render_observatory.py` — structured JSON to HTML/SVG;
- `tools/package_release.py` — Zionfolder, SPDX SBOM, manifest, SHA-256 ledger and ZIP;
- `addons/run-qemu.sh`, `addons/debug-gdb.sh`, `addons/routeos.gdb`;
- JSON schemas for traces and package manifests;
- source, generated C, tests and machine enforcement.

The workflow replaces the construction preview with the actual committed-branch QEMU run before packaging artifacts.
