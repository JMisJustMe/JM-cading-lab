from __future__ import annotations

import base64
import gzip
import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
THEORY = ROOT / "theory"
OUT = ROOT / "registry" / "theory-runtime-carrier-diagnostic-wave01.json"
BASE64_CHARS = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=_-")


def char_diagnostic(raw: str) -> dict[str, Any]:
    invalid = [
        {"index": index, "char": char, "codepoint": f"U+{ord(char):04X}"}
        for index, char in enumerate(raw)
        if not char.isspace() and char not in BASE64_CHARS
    ]
    whitespace = Counter(f"U+{ord(char):04X}" for char in raw if char.isspace())
    return {
        "raw_characters": len(raw),
        "whitespace_characters": sum(whitespace.values()),
        "whitespace_codepoints": dict(sorted(whitespace.items())),
        "invalid_character_count": len(invalid),
        "invalid_characters_first_50": invalid[:50],
        "starts_with_bom": raw.startswith("\ufeff"),
        "ends_with_newline": raw.endswith(("\n", "\r")),
    }


def normalize_base64(raw: str) -> tuple[str, dict[str, Any]]:
    original = char_diagnostic(raw)
    clean = "".join(char for char in raw if not char.isspace())
    clean = clean.removeprefix("\ufeff").replace("-", "+").replace("_", "/")
    remainder = len(clean) % 4
    padding_added = (4 - remainder) % 4
    normalized = clean + ("=" * padding_added)
    return normalized, {
        **original,
        "clean_characters": len(clean),
        "clean_mod_4": remainder,
        "padding_added": padding_added,
        "normalized_characters": len(normalized),
    }


def decode_carrier(name: str, raw: str) -> dict[str, Any]:
    normalized, diagnostic = normalize_base64(raw)
    result: dict[str, Any] = {"name": name, **diagnostic}
    try:
        decoded = base64.b64decode(normalized, validate=True)
        result.update(
            {
                "base64_decode": "PASS",
                "decoded_bytes": len(decoded),
                "first_16_hex": decoded[:16].hex(),
                "gzip_magic": decoded.startswith(b"\x1f\x8b"),
            }
        )
    except Exception as exc:
        result.update({"base64_decode": "FAIL", "base64_error": repr(exc)})
        return result

    try:
        uncompressed = gzip.decompress(decoded)
        result.update(
            {
                "gzip_decode": "PASS",
                "uncompressed_bytes": len(uncompressed),
                "uncompressed_first_80": uncompressed[:80].decode("utf-8", errors="replace"),
            }
        )
    except Exception as exc:
        result.update({"gzip_decode": "FAIL", "gzip_error": repr(exc)})
        return result

    try:
        payload = json.loads(uncompressed.decode("utf-8"))
        result["json_decode"] = "PASS"
        result["json_type"] = type(payload).__name__
        if isinstance(payload, dict):
            result["json_keys"] = sorted(payload.keys())
            if isinstance(payload.get("records"), list):
                result["record_count"] = len(payload["records"])
        elif isinstance(payload, list):
            result["record_count"] = len(payload)
    except Exception as exc:
        result.update({"json_decode": "FAIL", "json_error": repr(exc)})
    return result


def parse_push_object(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8-sig")
    marker = ".push("
    start = text.find(marker)
    if start < 0:
        raise ValueError(f"{path}: .push( marker not found")
    start += len(marker)
    depth = 0
    in_string = False
    escaped = False
    end = None
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
                end = index + 1
                break
    if end is None:
        raise ValueError(f"{path}: JSON object boundary not found")
    return json.loads(text[start:end])


def diagnose_chat_grafts() -> list[dict[str, Any]]:
    results = []
    v1 = (THEORY / "data/chat-graft-v1.b64").read_text(encoding="utf-8-sig")
    results.append(decode_carrier("chat-graft-v1.b64", v1))

    v2_paths = [THEORY / f"data/chat-graft-v2/part-{index:02d}.txt" for index in range(1, 5)]
    v2_parts = [path.read_text(encoding="utf-8-sig") for path in v2_paths]
    results.append(decode_carrier("chat-graft-v2 joined", "".join(part.strip() for part in v2_parts)))
    results.append(
        {
            "name": "chat-graft-v2 parts",
            "parts": [
                {"path": str(path.relative_to(ROOT)), **char_diagnostic(part)}
                for path, part in zip(v2_paths, v2_parts)
            ],
        }
    )
    return results


def diagnose_full_body_recovery() -> list[dict[str, Any]]:
    results = []
    paths = sorted((THEORY / "data/full-body-recovery").glob("*.js"))
    for path in paths:
        record = parse_push_object(path)
        raw = record.get("body_b64") or "".join(record.get("body_b64_chunks") or [])
        result = decode_carrier(str(path.relative_to(ROOT)), raw)
        result.update(
            {
                "record_id": record.get("id"),
                "record_title": record.get("title"),
                "carrier_field": "body_b64" if record.get("body_b64") else "body_b64_chunks",
                "chunk_count": len(record.get("body_b64_chunks") or []),
            }
        )
        results.append(result)
    return results


def extract_integrity_sources() -> tuple[list[str], str]:
    script = (THEORY / "source-body-integrity-v12.js").read_text(encoding="utf-8-sig")
    candidates = []
    patterns = [
        r"(?:const|let|var)\s+[A-Z_]*(?:FILES|SOURCES|PATHS|BODIES)[A-Z_]*\s*=\s*(\[.*?\]);",
        r"(?:const|let|var)\s+SRC\s*=\s*(\[.*?\]);",
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, script, re.S):
            try:
                value = json.loads(match.group(1).replace("'", '"'))
            except Exception:
                value = re.findall(r"['\"]([^'\"]+)['\"]", match.group(1))
            if isinstance(value, list) and len(value) >= 10:
                strings = [str(item) for item in value]
                if any("v0_4" in item or "cause-must-pass" in item for item in strings):
                    candidates.append(strings)
    if not candidates:
        # Fall back to every fetch-shaped quoted path in source order.
        quoted = re.findall(r"['\"](\.?\.?/[^'\"]+|data/[^'\"]+|cause-must-pass/[^'\"]+)['\"]", script)
        candidates.append(list(dict.fromkeys(quoted)))
    return max(candidates, key=len), script


def resolve_integrity_path(value: str) -> Path:
    clean = value.split("?", 1)[0]
    if clean.startswith("./"):
        clean = clean[2:]
    if clean.startswith("../"):
        return (THEORY / clean).resolve()
    return (THEORY / clean).resolve()


def diagnose_integrity() -> dict[str, Any]:
    sources, script = extract_integrity_sources()
    rows = []
    for index, source in enumerate(sources):
        path = resolve_integrity_path(source)
        row: dict[str, Any] = {
            "zero_based_index": index,
            "one_based_index": index + 1,
            "source": source,
            "resolved_path": str(path.relative_to(ROOT)) if path.exists() and ROOT in path.parents else str(path),
            "exists": path.exists(),
        }
        if path.exists() and path.is_file():
            data = path.read_bytes()
            row.update({"bytes": len(data), "characters_utf8": len(data.decode("utf-8", errors="replace"))})
        rows.append(row)

    minimums = sorted({int(value) for value in re.findall(r"(?:length|body\.length)\s*<\s*(\d+)", script)})
    messages = re.findall(r"under-depth body[^'\"`]*", script)
    body10 = next((row for row in rows if row["one_based_index"] == 10), None)
    zero10 = next((row for row in rows if row["zero_based_index"] == 10), None)
    return {
        "source_count_detected": len(rows),
        "minimum_thresholds_detected": minimums,
        "under_depth_messages": messages[:10],
        "body_10_one_based": body10,
        "body_10_zero_based": zero10,
        "sources": rows,
    }


def main() -> int:
    receipt = {
        "schema": "JM.TheoryRuntimeCarrierDiagnostic/1.0",
        "status": "DIAGNOSTIC_COMPLETE",
        "chat_graft_carriers": diagnose_chat_grafts(),
        "full_body_recovery_carriers": diagnose_full_body_recovery(),
        "source_body_integrity": diagnose_integrity(),
    }
    OUT.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2, ensure_ascii=False))

    carrier_results = receipt["chat_graft_carriers"] + receipt["full_body_recovery_carriers"]
    failed = [item for item in carrier_results if isinstance(item, dict) and item.get("base64_decode") == "FAIL"]
    print(f"FAILED_BASE64_CARRIERS={len(failed)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
