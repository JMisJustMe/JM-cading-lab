from __future__ import annotations

import base64
import gzip
import hashlib
import json
import math
import re
from copy import deepcopy
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SOURCE_MD = ROOT / "theory/BODY_STANDALONES/10_THEOVERTIME_APPROACH_MODEL.md"
SOURCE_TXT = ROOT / "theory/BODY_STANDALONES/10_THEOVERTIME_APPROACH_MODEL.txt"
PARTS = [ROOT / f"theory/data/v0_4/part-{index:02d}.txt" for index in range(1, 8)]
RECEIPT = ROOT / "registry/theovertime-record-10-source-restoration-wave01.json"

EXPECTED_MD_SHA256 = "260ff0439a74f38a88cda1cbd61852eaf8c7932a3509527f12ab600a83abd963"
EXPECTED_TXT_SHA256 = "7766cda21d8212494594ec06f36c19ccba2cbab7d7c16c590f374150a9ff0f7c"
EXPECTED_RECORDS = 297
EXPECTED_OLD_BODY_LENGTH = 370
EXPECTED_SOURCE_PATH = "BODY_STANDALONES/10_THEOVERTIME_APPROACH_MODEL.md"


def sha256(data: bytes | str) -> str:
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def normalized_text(text: str, *, markdown: bool) -> str:
    lines: list[str] = []
    in_fence = False
    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        if markdown and line.strip().startswith("```"):
            in_fence = not in_fence
            continue
        if markdown:
            line = re.sub(r"^#{1,6}\s*", "", line)
            line = line.replace("**", "").replace("__", "")
        lines.append(line.rstrip())
    value = "\n".join(lines)
    value = re.sub(r"\n{3,}", "\n\n", value).strip()
    return value


def decode_payload() -> tuple[dict[str, Any], dict[str, Any]]:
    raw_parts = [path.read_text(encoding="utf-8-sig").strip() for path in PARTS]
    joined = "".join(raw_parts)
    compressed = base64.b64decode(joined, validate=True)
    plain = gzip.decompress(compressed)
    payload = json.loads(plain.decode("utf-8"))
    if not isinstance(payload, dict) or not isinstance(payload.get("records"), list):
        raise RuntimeError("v0.4 carrier does not contain an object with records")
    return payload, {
        "part_characters": [len(value) for value in raw_parts],
        "joined_base64_characters": len(joined),
        "joined_base64_sha256": sha256(joined),
        "compressed_bytes": len(compressed),
        "compressed_sha256": sha256(compressed),
        "plain_bytes": len(plain),
        "plain_sha256": sha256(plain),
    }


def record_hash(record: Any) -> str:
    encoded = json.dumps(
        record,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return sha256(encoded)


def split_base64(value: str, parts: int) -> list[str]:
    target = math.ceil((len(value) / parts) / 4) * 4
    chunks = [value[index * target : (index + 1) * target] for index in range(parts - 1)]
    chunks.append(value[(parts - 1) * target :])
    if len(chunks) != parts or any(not chunk for chunk in chunks):
        raise RuntimeError(f"Could not split carrier into {parts} non-empty parts")
    if "".join(chunks) != value:
        raise RuntimeError("Split carrier does not rejoin exactly")
    return chunks


def main() -> None:
    md_bytes = SOURCE_MD.read_bytes()
    txt_bytes = SOURCE_TXT.read_bytes()
    md_text = md_bytes.decode("utf-8")
    txt_text = txt_bytes.decode("utf-8")

    md_hash = sha256(md_bytes)
    txt_hash = sha256(txt_bytes)
    if md_hash != EXPECTED_MD_SHA256:
        raise RuntimeError(f"Gmail Markdown source SHA mismatch: {md_hash}")
    if txt_hash != EXPECTED_TXT_SHA256:
        raise RuntimeError(f"Gmail TXT source SHA mismatch: {txt_hash}")

    normalized_md = normalized_text(md_text, markdown=True)
    normalized_txt = normalized_text(txt_text, markdown=False)
    if normalized_md != normalized_txt:
        raise RuntimeError("Gmail Markdown and TXT source bodies do not normalize to parity")

    source_body = md_text.rstrip("\r\n")
    if len(source_body) < 993:
        raise RuntimeError(f"Recovered TheOverTime source is under the 993-character floor: {len(source_body)}")
    if "# 10. TheOverTime Approach" not in source_body:
        raise RuntimeError("Recovered source does not carry the expected TheOverTime heading")

    payload, before_carrier = decode_payload()
    records = payload["records"]
    if len(records) != EXPECTED_RECORDS:
        raise RuntimeError(f"Expected {EXPECTED_RECORDS} v0.4 records, found {len(records)}")

    matches = [index for index, record in enumerate(records) if str(record.get("id")) == "10"]
    if len(matches) != 1:
        raise RuntimeError(f"Expected exactly one record id 10, found {len(matches)}")
    index = matches[0]
    before_record = deepcopy(records[index])

    if before_record.get("title") != "TheOverTime Approach":
        raise RuntimeError(f"Record 10 title mismatch: {before_record.get('title')!r}")
    if before_record.get("source_file") != EXPECTED_SOURCE_PATH:
        raise RuntimeError(f"Record 10 source path mismatch: {before_record.get('source_file')!r}")
    old_body = before_record.get("body_text")
    if not isinstance(old_body, str):
        raise RuntimeError("Record 10 does not expose body_text")
    if len(old_body) != EXPECTED_OLD_BODY_LENGTH:
        raise RuntimeError(f"Expected 370-character compact route, found {len(old_body)}")

    before_hashes = [record_hash(record) for record in records]
    records[index]["body_text"] = source_body
    after_hashes = [record_hash(record) for record in records]

    changed_indices = [i for i, (before, after) in enumerate(zip(before_hashes, after_hashes)) if before != after]
    if changed_indices != [index]:
        raise RuntimeError(f"Restoration changed records beyond id 10: {changed_indices}")
    if any(records[i] != payload["records"][i] for i in range(len(records))):
        raise RuntimeError("Internal record identity check failed")

    plain_after = json.dumps(
        payload,
        ensure_ascii=False,
        separators=(",", ":"),
    ).encode("utf-8")
    compressed_after = gzip.compress(plain_after, compresslevel=9, mtime=0)
    base64_after = base64.b64encode(compressed_after).decode("ascii")
    chunks = split_base64(base64_after, len(PARTS))

    for path, chunk in zip(PARTS, chunks):
        path.write_text(chunk + "\n", encoding="utf-8")

    payload_roundtrip, after_carrier = decode_payload()
    after_records = payload_roundtrip["records"]
    after_matches = [record for record in after_records if str(record.get("id")) == "10"]
    if len(after_matches) != 1 or after_matches[0].get("body_text") != source_body:
        raise RuntimeError("Regenerated v0.4 carrier does not round-trip the recovered source")

    unchanged_count = sum(
        1
        for i, record in enumerate(after_records)
        if i != index and record_hash(record) == before_hashes[i]
    )
    if unchanged_count != EXPECTED_RECORDS - 1:
        raise RuntimeError(f"Only {unchanged_count} of 296 non-target records remained unchanged")

    receipt = {
        "schema": "JM.TheOverTimeRecord10SourceRestoration/1.0",
        "status": "PASS_EXACT_SOURCE_RESTORED",
        "record_id": "10",
        "title": "TheOverTime Approach",
        "source_path": EXPECTED_SOURCE_PATH,
        "authority": {
            "custody_route": "Gmail attachment",
            "message_id": "19e46a49b06061d3",
            "message_date": "2026-05-20T19:27:31+01:00",
            "markdown_filename": "10_theovertime_approach_model.md",
            "markdown_reported_bytes": 3070,
            "markdown_sha256": md_hash,
            "text_filename": "10_theovertime_approach_model.txt",
            "text_reported_bytes": 3014,
            "text_sha256": txt_hash,
            "normalized_md_txt_parity": "PASS",
            "source_status_boundary": (
                "Preservation draft; early stages, still ongoing; not the complete Evernote/source vault."
            ),
        },
        "record_before": {
            "body_characters": len(old_body),
            "body_sha256": sha256(old_body),
            "record_sha256": record_hash(before_record),
        },
        "record_after": {
            "body_characters": len(source_body),
            "body_sha256": sha256(source_body),
            "record_sha256": after_hashes[index],
            "integrity_floor_993": "PASS",
        },
        "payload": {
            "records": len(after_records),
            "changed_record_indices": changed_indices,
            "changed_record_ids": [str(after_records[i].get("id")) for i in changed_indices],
            "unchanged_non_target_records": unchanged_count,
            "before": before_carrier,
            "after": after_carrier,
            "part_count": len(PARTS),
        },
        "identity_merges": 0,
        "whole_estate_ding": "OPEN",
        "boundary": (
            "The exact Gmail preservation draft replaces only the compact public route body for record 10. "
            "It is not crowned as the missing complete Evernote/source vault."
        ),
    }
    RECEIPT.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
