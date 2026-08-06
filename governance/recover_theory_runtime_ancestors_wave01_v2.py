from __future__ import annotations

import base64
import gzip
import json
import re
from pathlib import Path
from typing import Any

import recover_theory_runtime_ancestors_wave01 as base

OUT = base.ROOT / "registry" / "theory-runtime-ancestor-recovery-wave01.json"


def extract_script_strings(fragment: str) -> list[str]:
    values = []
    for quote, value in re.findall(r"(['\"])((?:\\.|(?!\1).)*)\1", fragment, re.S):
        try:
            values.append(bytes(value, "utf-8").decode("unicode_escape"))
        except Exception:
            values.append(value)
    return values


def candidate_splits(text: str) -> list[dict[str, Any]]:
    candidates = [
        ("record_separator_U+001E", "\x1e"),
        ("unit_separator_U+001F", "\x1f"),
        ("form_feed_U+000C", "\x0c"),
        ("null_U+0000", "\x00"),
        ("triple_newline", "\n\n\n"),
        ("double_newline", "\n\n"),
        ("horizontal_rule", "\n---\n"),
    ]
    rows = []
    for name, delimiter in candidates:
        parts = text.split(delimiter)
        lengths = [len(part) for part in parts if part]
        rows.append(
            {
                "name": name,
                "delimiter_repr": repr(delimiter),
                "part_count": len(parts),
                "nonempty_count": len(lengths),
                "minimum_nonempty_characters": min(lengths, default=None),
                "maximum_nonempty_characters": max(lengths, default=None),
                "under_700_count": sum(1 for length in lengths if length < 700),
                "first_20_lengths": lengths[:20],
            }
        )
    return rows


def decode_integrity_orig() -> dict[str, Any]:
    script_path = base.THEORY / "source-body-integrity-v12.js"
    script = script_path.read_text(encoding="utf-8-sig")
    match = re.search(r"\bORIG\s*=\s*(['\"])(.*?)\1\s*;", script, re.S)
    if not match:
        return {"status": "ORIG_NOT_FOUND"}

    raw = bytes(match.group(2), "utf-8").decode("unicode_escape")
    diagnostic = base.decode_base64(raw)
    result: dict[str, Any] = {
        "status": "CARRIER_CONTACTED",
        "carrier": diagnostic,
        "script_path": str(script_path.relative_to(base.ROOT)),
    }
    if diagnostic.get("gzip") != "PASS":
        return result

    decoded = gzip.decompress(base64.b64decode(base.normalize_base64(raw), validate=True))
    text = decoded.decode("utf-8", errors="replace")
    result.update(
        {
            "payload_type": "text",
            "payload_characters": len(text),
            "payload_bytes": len(decoded),
            "line_count": text.count("\n") + 1,
            "first_1200": text[:1200],
            "last_500": text[-500:],
            "control_character_counts": {
                f"U+{code:04X}": text.count(chr(code))
                for code in range(0x20)
                if text.count(chr(code))
            },
            "candidate_splits": candidate_splits(text),
        }
    )

    after = script[match.end() : match.end() + 8000]
    result["parser_source_after_orig_first_8000"] = after
    result["parser_string_literals_first_100"] = extract_script_strings(after)[:100]

    # Discover the real split expression in the runtime source.
    split_matches = re.findall(r"\.split\(([^)]{1,120})\)", after)
    result["split_expressions"] = split_matches[:50]

    # Try delimiters explicitly present in .split('...') expressions.
    runtime_split_rows = []
    for expression in split_matches:
        literal = re.fullmatch(r"\s*(['\"])(.*?)\1\s*", expression, re.S)
        if not literal:
            continue
        delimiter = bytes(literal.group(2), "utf-8").decode("unicode_escape")
        parts = text.split(delimiter)
        lengths = [len(part) for part in parts if part]
        runtime_split_rows.append(
            {
                "expression": expression,
                "delimiter_repr": repr(delimiter),
                "part_count": len(parts),
                "nonempty_count": len(lengths),
                "minimum_nonempty_characters": min(lengths, default=None),
                "under_700": [
                    {"zero_based_index": index, "characters": len(part), "first_160": part[:160]}
                    for index, part in enumerate(parts)
                    if 0 < len(part) < 700
                ],
                "body_10_one_based": (
                    {
                        "zero_based_index": 9,
                        "one_based_index": 10,
                        "characters": len(parts[9]),
                        "first_500": parts[9][:500],
                    }
                    if len(parts) > 9
                    else None
                ),
                "body_10_zero_based": (
                    {
                        "zero_based_index": 10,
                        "one_based_index": 11,
                        "characters": len(parts[10]),
                        "first_500": parts[10][:500],
                    }
                    if len(parts) > 10
                    else None
                ),
            }
        )
    result["runtime_split_tests"] = runtime_split_rows
    return result


def main() -> int:
    receipt = {
        "schema": "JM.TheoryRuntimeAncestorRecovery/1.1",
        "status": "SCAN_COMPLETE",
        "chat_graft_history": base.scan_chat_graft_history(),
        "words_history": base.scan_words_history(),
        "integrity_orig": decode_integrity_orig(),
    }
    OUT.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
