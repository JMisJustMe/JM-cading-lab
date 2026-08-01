#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path

PARTS = [f"app.part{i}.txt" for i in range(1, 5)]


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def build(source: Path, out: Path) -> dict[str, object]:
    source = source.resolve()
    out = out.resolve()
    out.mkdir(parents=True, exist_ok=True)

    index = (source / "index.html").read_text(encoding="utf-8")
    css = (source / "style.css").read_text(encoding="utf-8")
    javascript = "".join((source / part).read_text(encoding="utf-8") for part in PARTS)

    if '<link rel="stylesheet" href="style.css">' not in index:
        raise ValueError("stylesheet mount missing")
    if '<script src="app-loader.js"></script>' not in index:
        raise ValueError("runtime loader mount missing")

    single = index.replace(
        '<link rel="stylesheet" href="style.css">',
        f"<style>\n{css}\n</style>",
    ).replace(
        '<script src="app-loader.js"></script>',
        f"<script>\n{javascript}\n</script>",
    )

    single_path = out / "OPEN_FIRST_GLYPHPLAY_SOVEREIGN_REBUILD_v0_1.html"
    single_path.write_text(single, encoding="utf-8")

    for name in ["index.html", "style.css", "app-loader.js", *PARTS, "README.md", "SOURCE_LINEAGE_AND_BUILD_MANIFEST.json"]:
        shutil.copy2(source / name, out / name)
    (out / "app.js").write_text(javascript, encoding="utf-8")

    manifest = json.loads((source / "SOURCE_LINEAGE_AND_BUILD_MANIFEST.json").read_text(encoding="utf-8"))
    receipt: dict[str, object] = {
        "schema": "jm.glyphplay-build-receipt/0.1",
        "status": "GLYPHPLAY_SOVEREIGN_REBUILD_STATIC_BUILD_PASS_BROWSER_CONTACT_OPEN",
        "source_parts": PARTS,
        "source_part_count": len(PARTS),
        "javascript_sha256": sha256_bytes(javascript.encode("utf-8")),
        "single_file": single_path.name,
        "single_file_sha256": sha256_bytes(single_path.read_bytes()),
        "body_trials": manifest["bodyTrials"],
        "donor_count": len(manifest["donors"]),
        "claim_boundary": manifest["claimBoundary"],
    }
    receipt["receipt_sha256"] = sha256_bytes(
        json.dumps(receipt, sort_keys=True, separators=(",", ":")).encode("utf-8")
    )
    (out / "BUILD_RECEIPT.json").write_text(
        json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    return receipt


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    receipt = build(args.source, args.out)
    print(json.dumps(receipt, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
