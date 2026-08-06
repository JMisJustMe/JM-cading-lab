from __future__ import annotations

import ast
import base64
import gzip
import json
import re
import subprocess
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
THEORY = ROOT / "theory"
OUT = ROOT / "registry" / "theory-runtime-ancestor-recovery-wave01.json"


def run(*args: str, check: bool = True) -> str:
    completed = subprocess.run(
        args,
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if check and completed.returncode != 0:
        raise RuntimeError(f"{' '.join(args)} failed: {completed.stderr.strip()}")
    return completed.stdout


def normalize_base64(raw: str) -> str:
    clean = "".join(char for char in raw.removeprefix("\ufeff") if not char.isspace())
    clean = clean.replace("-", "+").replace("_", "/")
    return clean + ("=" * ((4 - len(clean) % 4) % 4))


def decode_base64(raw: str) -> dict[str, Any]:
    clean = normalize_base64(raw)
    result: dict[str, Any] = {
        "raw_characters": len(raw),
        "normalized_characters": len(clean),
        "normalized_mod_4": len(clean) % 4,
    }
    try:
        decoded = base64.b64decode(clean, validate=True)
    except Exception as exc:
        result.update({"base64": "FAIL", "error": repr(exc)})
        return result
    result.update(
        {
            "base64": "PASS",
            "decoded_bytes": len(decoded),
            "first_16_hex": decoded[:16].hex(),
            "gzip_magic": decoded.startswith(b"\x1f\x8b"),
            "gzip_magic_offsets_first_20": [
                index
                for index in range(max(0, len(decoded) - 2))
                if decoded[index : index + 3] == b"\x1f\x8b\x08"
            ][:20],
        }
    )
    if not decoded.startswith(b"\x1f\x8b"):
        return result
    try:
        body = gzip.decompress(decoded)
        result.update({"gzip": "PASS", "uncompressed_bytes": len(body)})
    except Exception as exc:
        result.update({"gzip": "FAIL", "error": repr(exc)})
        return result
    try:
        payload = json.loads(body.decode("utf-8"))
        result["json"] = "PASS"
        result["json_type"] = type(payload).__name__
        if isinstance(payload, dict):
            result["json_keys"] = sorted(payload.keys())
            if isinstance(payload.get("records"), list):
                result["record_count"] = len(payload["records"])
        elif isinstance(payload, list):
            result["record_count"] = len(payload)
    except Exception as exc:
        result.update(
            {
                "json": "NOT_JSON",
                "text_characters": len(body.decode("utf-8", errors="replace")),
                "text_first_120": body[:120].decode("utf-8", errors="replace"),
                "json_error": repr(exc),
            }
        )
    return result


def cat_blob(blob: str) -> str:
    return subprocess.run(
        ["git", "cat-file", "blob", blob],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
    ).stdout.decode("utf-8", errors="replace")


def scan_chat_graft_history() -> dict[str, Any]:
    objects = run("git", "rev-list", "--all", "--objects").splitlines()
    candidates = []
    for line in objects:
        parts = line.split(" ", 1)
        if len(parts) != 2:
            continue
        blob, path = parts
        low = path.lower()
        if "chat-graft" not in low:
            continue
        if not low.endswith((".b64", ".txt", ".json", ".js")):
            continue
        candidates.append((blob, path))

    seen: set[str] = set()
    rows = []
    valid_94 = []
    for blob, path in candidates:
        if blob in seen:
            continue
        seen.add(blob)
        raw = cat_blob(blob)
        diagnostic = decode_base64(raw)
        row = {"blob": blob, "path": path, **diagnostic}
        rows.append(row)
        if diagnostic.get("gzip") == "PASS" and diagnostic.get("record_count") == 94:
            valid_94.append(row)
    return {
        "candidate_blobs": len(rows),
        "valid_94_record_carriers": valid_94,
        "candidates": rows,
    }


def parse_push_object(text: str) -> dict[str, Any] | None:
    marker = ".push({"
    start = text.find(marker)
    if start < 0:
        return None
    start = text.find("{", start)
    depth = 0
    in_string = False
    escaped = False
    for index in range(start, len(text)):
        char = text[index]
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue
        if char == '"':
            in_string = True
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return json.loads(text[start : index + 1])
    return None


def pair_words_at_commit(commit: str) -> dict[str, Any]:
    paths = [
        "theory/data/full-body-recovery/words-1.js",
        "theory/data/full-body-recovery/words-2.js",
    ]
    texts = []
    for path in paths:
        value = run("git", "show", f"{commit}:{path}", check=False)
        if not value:
            return {"commit": commit, "available": False}
        texts.append(value)
    record = parse_push_object(texts[0])
    if not record:
        return {"commit": commit, "available": True, "parse": "FAIL_WORDS_1"}
    chunks = list(record.get("body_b64_chunks") or [])
    continuations = re.findall(r"body_b64_chunks\.push\((['\"])(.*?)\1\)", texts[1], re.S)
    for _, chunk in continuations:
        chunks.append(bytes(chunk, "utf-8").decode("unicode_escape"))
    diagnostic = decode_base64("".join(chunks))
    return {
        "commit": commit,
        "available": True,
        "record_id": record.get("id"),
        "chunk_count": len(chunks),
        **diagnostic,
    }


def scan_words_history() -> dict[str, Any]:
    commits = set(
        run(
            "git",
            "log",
            "--all",
            "--format=%H",
            "--",
            "theory/data/full-body-recovery/words-1.js",
            "theory/data/full-body-recovery/words-2.js",
        ).splitlines()
    )
    rows = [pair_words_at_commit(commit) for commit in sorted(commits)]
    return {
        "commit_pairs_tested": len(rows),
        "valid_gzip_pairs": [row for row in rows if row.get("gzip") == "PASS"],
        "pairs": rows,
    }


def decode_integrity_orig() -> dict[str, Any]:
    script = (THEORY / "source-body-integrity-v12.js").read_text(encoding="utf-8-sig")
    match = re.search(r"\bORIG\s*=\s*(['\"])(.*?)\1\s*;", script, re.S)
    if not match:
        return {"status": "ORIG_NOT_FOUND"}
    raw = bytes(match.group(2), "utf-8").decode("unicode_escape")
    diagnostic = decode_base64(raw)
    result: dict[str, Any] = {"carrier": diagnostic}
    if diagnostic.get("gzip") != "PASS":
        return result

    decoded = gzip.decompress(base64.b64decode(normalize_base64(raw), validate=True))
    payload = json.loads(decoded.decode("utf-8"))
    result["payload_type"] = type(payload).__name__
    if isinstance(payload, dict):
        result["payload_keys"] = sorted(payload.keys())

    records = payload.get("records") if isinstance(payload, dict) else payload
    if not isinstance(records, list):
        result["records"] = "NOT_FOUND"
        return result

    rows = []
    for index, record in enumerate(records):
        if not isinstance(record, dict):
            rows.append(
                {
                    "zero_based_index": index,
                    "one_based_index": index + 1,
                    "type": type(record).__name__,
                }
            )
            continue
        body_value = ""
        body_field = None
        for key in ("body", "content", "text", "full_body", "source_body"):
            if isinstance(record.get(key), str):
                body_field = key
                body_value = record[key]
                break
        rows.append(
            {
                "zero_based_index": index,
                "one_based_index": index + 1,
                "id": record.get("id"),
                "title": record.get("title"),
                "body_field": body_field,
                "body_characters": len(body_value),
                "keys": sorted(record.keys()),
            }
        )
    result.update(
        {
            "record_count": len(rows),
            "minimum_body_characters": min(
                (row.get("body_characters", 0) for row in rows if row.get("body_field")),
                default=None,
            ),
            "body_10_one_based": next(
                (row for row in rows if row["one_based_index"] == 10), None
            ),
            "body_10_zero_based": next(
                (row for row in rows if row["zero_based_index"] == 10), None
            ),
            "under_700": [row for row in rows if 0 < row.get("body_characters", 0) < 700],
            "records": rows,
        }
    )
    return result


def main() -> int:
    receipt = {
        "schema": "JM.TheoryRuntimeAncestorRecovery/1.0",
        "status": "SCAN_COMPLETE",
        "chat_graft_history": scan_chat_graft_history(),
        "words_history": scan_words_history(),
        "integrity_orig": decode_integrity_orig(),
    }
    OUT.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
