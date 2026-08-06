from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import diagnose_theory_runtime_carriers as base

OUT = base.ROOT / "registry" / "theory-runtime-carrier-diagnostic-wave01.json"


def load_recovery_records() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    records: dict[str, dict[str, Any]] = {}
    trace: list[dict[str, Any]] = []
    paths = sorted((base.THEORY / "data/full-body-recovery").glob("*.js"))

    for path in paths:
        text = path.read_text(encoding="utf-8-sig")
        relative = str(path.relative_to(base.ROOT))
        entry: dict[str, Any] = {"path": relative, "bytes": path.stat().st_size, "actions": []}

        if ".push({" in text:
            record = base.parse_push_object(path)
            record_id = str(record.get("id"))
            if not record_id or record_id == "None":
                raise ValueError(f"{path}: recovery record has no id")
            if record_id in records:
                raise ValueError(f"{path}: duplicate recovery id {record_id}")
            records[record_id] = record
            entry["actions"].append(
                {
                    "type": "record",
                    "id": record_id,
                    "title": record.get("title"),
                    "initial_chunks": len(record.get("body_b64_chunks") or []),
                    "has_body_b64": bool(record.get("body_b64")),
                }
            )

        continuation_patterns = [
            re.compile(
                r"find\(x=>x\.id===['\"]([^'\"]+)['\"]\).*?body_b64_chunks\.push\((['\"])(.*?)\2\)",
                re.S,
            ),
            re.compile(
                r"find\([^)]*id\s*===\s*['\"]([^'\"]+)['\"][^)]*\).*?body_b64_chunks\.push\((['\"])(.*?)\2\)",
                re.S,
            ),
        ]
        seen_continuations: set[tuple[str, str]] = set()
        for pattern in continuation_patterns:
            for match in pattern.finditer(text):
                record_id = match.group(1)
                chunk = bytes(match.group(3), "utf-8").decode("unicode_escape")
                key = (record_id, chunk)
                if key in seen_continuations:
                    continue
                seen_continuations.add(key)
                if record_id not in records:
                    raise ValueError(f"{path}: continuation target {record_id} not loaded yet")
                records[record_id].setdefault("body_b64_chunks", []).append(chunk)
                entry["actions"].append(
                    {"type": "continuation", "id": record_id, "chunk_characters": len(chunk)}
                )

        if not entry["actions"]:
            entry["actions"].append({"type": "unclassified", "first_120": text[:120]})
        trace.append(entry)

    return list(records.values()), trace


def diagnose_full_body_recovery() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    records, trace = load_recovery_records()
    results = []
    for record in records:
        raw = record.get("body_b64") or "".join(record.get("body_b64_chunks") or [])
        result = base.decode_carrier(f"recovery:{record.get('id')}", raw)
        result.update(
            {
                "record_id": record.get("id"),
                "record_title": record.get("title"),
                "carrier_field": "body_b64" if record.get("body_b64") else "body_b64_chunks",
                "chunk_count": len(record.get("body_b64_chunks") or []),
            }
        )
        results.append(result)
    return results, trace


def main() -> int:
    full_body, full_body_trace = diagnose_full_body_recovery()
    receipt = {
        "schema": "JM.TheoryRuntimeCarrierDiagnostic/1.1",
        "status": "DIAGNOSTIC_COMPLETE",
        "chat_graft_carriers": base.diagnose_chat_grafts(),
        "full_body_recovery_carriers": full_body,
        "full_body_recovery_source_trace": full_body_trace,
        "source_body_integrity": base.diagnose_integrity(),
    }
    OUT.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2, ensure_ascii=False))

    carrier_results = receipt["chat_graft_carriers"] + receipt["full_body_recovery_carriers"]
    failed = [
        item
        for item in carrier_results
        if isinstance(item, dict) and item.get("base64_decode") == "FAIL"
    ]
    print(f"FAILED_BASE64_CARRIERS={len(failed)}")
    print(f"RECOVERY_RECORDS={len(full_body)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
