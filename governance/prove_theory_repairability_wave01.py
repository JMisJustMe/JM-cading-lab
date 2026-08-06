from __future__ import annotations

import base64
import gzip
import hashlib
import io
import json
import subprocess
import zipfile
from collections import defaultdict
from pathlib import Path
from typing import Any

import diagnose_theory_runtime_carriers_v2 as carriers

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "registry" / "theory-repairability-proof-wave01.json"
TARGET_PATH = "BODY_STANDALONES/10_THEOVERTIME_APPROACH_MODEL.md"
TARGET_TITLE = "TheOverTime Approach"


def sha256(data: bytes | str) -> str:
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def normalize_b64(raw: str) -> str:
    clean = "".join(char for char in raw.removeprefix("\ufeff") if not char.isspace())
    clean = clean.replace("-", "+").replace("_", "/")
    return clean + "=" * ((4 - len(clean) % 4) % 4)


def decode_b64(raw: str) -> bytes:
    return base64.b64decode(normalize_b64(raw), validate=True)


def describe(data: bytes) -> dict[str, Any]:
    row = {
        "bytes": len(data),
        "sha256": sha256(data),
        "first_24_hex": data[:24].hex(),
        "last_24_hex": data[-24:].hex(),
        "gzip_magic": data.startswith(b"\x1f\x8b\x08"),
    }
    try:
        plain = gzip.decompress(data)
        text = plain.decode("utf-8", errors="replace")
        row.update(
            {
                "gzip": "PASS",
                "plain_bytes": len(plain),
                "plain_characters": len(text),
                "plain_sha256": sha256(plain),
                "plain_first_500": text[:500],
                "plain_last_300": text[-300:],
            }
        )
    except Exception as exc:
        row.update({"gzip": "FAIL", "gzip_error": repr(exc)})
    return row


def words_proof() -> dict[str, Any]:
    records, trace = carriers.load_recovery_records()
    matches = [record for record in records if record.get("id") == "project-words-are-data-constrainers"]
    if len(matches) != 1:
        raise RuntimeError(f"WORDS recovery record count is {len(matches)}, not 1")
    record = matches[0]
    chunks = list(record.get("body_b64_chunks") or [])
    if len(chunks) != 2:
        raise RuntimeError(f"WORDS chunk count is {len(chunks)}, not 2")

    chunk_rows = []
    decoded_chunks = []
    for index, chunk in enumerate(chunks):
        row: dict[str, Any] = {
            "index": index,
            "characters": len(chunk),
            "data_characters": sum(1 for char in chunk if not char.isspace() and char != "="),
            "clean_mod_4": len("".join(char for char in chunk if not char.isspace())) % 4,
            "first_24": chunk[:24],
            "last_24": chunk[-24:],
            "ends_with_padding": chunk.rstrip().endswith("="),
        }
        try:
            decoded = decode_b64(chunk)
            decoded_chunks.append(decoded)
            row.update({"base64": "PASS", **describe(decoded)})
        except Exception as exc:
            row.update({"base64": "FAIL", "error": repr(exc)})
        chunk_rows.append(row)

    proof: dict[str, Any] = {
        "record": {
            "id": record.get("id"),
            "title": record.get("title"),
            "source": record.get("source"),
            "chunk_count": len(chunks),
        },
        "source_trace": trace,
        "chunks": chunk_rows,
    }

    if len(decoded_chunks) == 2:
        byte_join = b"".join(decoded_chunks)
        proof["decoded_byte_join"] = describe(byte_join)

        separate_plain = []
        separate_errors = []
        for index, data in enumerate(decoded_chunks):
            try:
                separate_plain.append(gzip.decompress(data))
            except Exception as exc:
                separate_errors.append({"index": index, "error": repr(exc)})
        proof["independent_gzip_streams"] = (
            {
                "status": "PASS",
                "joined_plain_bytes": len(b"".join(separate_plain)),
                "joined_plain_sha256": sha256(b"".join(separate_plain)),
            }
            if not separate_errors
            else {"status": "FAIL", "errors": separate_errors}
        )

    try:
        text_join = decode_b64("".join(chunks))
        proof["base64_text_join"] = {"base64": "PASS", **describe(text_join)}
    except Exception as exc:
        proof["base64_text_join"] = {"base64": "FAIL", "error": repr(exc)}

    byte_join = proof.get("decoded_byte_join", {})
    proof["repair_classification"] = (
        "DECODER_ONLY_REPAIR_PROVED_DECODE_EACH_CHUNK_THEN_JOIN_BYTES"
        if byte_join.get("gzip") == "PASS"
        else "CARRIER_REPAIR_NOT_YET_PROVED"
    )
    return proof


def run_bytes(*args: str) -> bytes:
    completed = subprocess.run(
        args,
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(
            f"{' '.join(args)} failed: {completed.stderr.decode('utf-8', errors='replace')}"
        )
    return completed.stdout


def git_blob_inventory() -> tuple[list[tuple[str, int]], dict[str, list[str]]]:
    path_map: dict[str, list[str]] = defaultdict(list)
    for line in run_bytes("git", "rev-list", "--all", "--objects").decode(
        "utf-8", errors="replace"
    ).splitlines():
        parts = line.split(" ", 1)
        if len(parts) == 2:
            path_map[parts[0]].append(parts[1])

    rows = []
    for line in run_bytes(
        "git",
        "cat-file",
        "--batch-all-objects",
        "--batch-check=%(objectname) %(objecttype) %(objectsize)",
    ).decode("utf-8", errors="replace").splitlines():
        object_id, kind, size = line.split()
        if kind == "blob":
            rows.append((object_id, int(size)))
    return rows, path_map


def source_candidate(text: str, *, origin: dict[str, Any]) -> dict[str, Any] | None:
    lowered = text.lower()
    has_path = TARGET_PATH.lower() in lowered
    has_title = TARGET_TITLE.lower() in lowered
    if not has_path and not has_title:
        return None

    title_index = lowered.find(TARGET_TITLE.lower())
    path_index = lowered.find(TARGET_PATH.lower())
    indices = [index for index in (title_index, path_index) if index >= 0]
    anchor = min(indices) if indices else 0
    start = max(0, anchor - 600)
    end = min(len(text), anchor + 6000)
    excerpt = text[start:end]

    return {
        **origin,
        "has_exact_source_path": has_path,
        "has_exact_title": has_title,
        "text_characters": len(text),
        "text_sha256": sha256(text),
        "excerpt_characters": len(excerpt),
        "excerpt": excerpt,
        "plausible_full_body": len(text) >= 700 and len(excerpt) >= 700,
    }


def scan_theovertime_custody() -> dict[str, Any]:
    blobs, path_map = git_blob_inventory()
    findings = []
    archives = 0
    text_blobs = 0

    for blob, size in blobs:
        if size < 20 or size > 25_000_000:
            continue
        data = run_bytes("git", "cat-file", "blob", blob)

        if data.startswith(b"PK\x03\x04") and size <= 20_000_000:
            archives += 1
            try:
                with zipfile.ZipFile(io.BytesIO(data)) as archive:
                    for info in archive.infolist():
                        if info.file_size > 8_000_000:
                            continue
                        low_name = info.filename.lower()
                        if (
                            TARGET_PATH.lower() not in low_name
                            and "theovertime" not in low_name
                            and "the_over_time" not in low_name
                        ):
                            # Content may still contain the body, but avoid opening every binary entry.
                            if not low_name.endswith((".md", ".txt", ".json", ".html", ".js")):
                                continue
                        try:
                            content = archive.read(info).decode("utf-8-sig")
                        except Exception:
                            continue
                        candidate = source_candidate(
                            content,
                            origin={
                                "kind": "archive_entry",
                                "blob": blob,
                                "blob_size": size,
                                "blob_paths": path_map.get(blob, []),
                                "archive_entry": info.filename,
                            },
                        )
                        if candidate:
                            findings.append(candidate)
            except Exception:
                pass

        try:
            text = data.decode("utf-8-sig")
        except Exception:
            continue
        text_blobs += 1
        candidate = source_candidate(
            text,
            origin={
                "kind": "text_blob",
                "blob": blob,
                "blob_size": size,
                "blob_paths": path_map.get(blob, []),
            },
        )
        if candidate:
            findings.append(candidate)

    unique = []
    seen = set()
    for finding in findings:
        key = (finding.get("text_sha256"), finding.get("archive_entry"))
        if key in seen:
            continue
        seen.add(key)
        unique.append(finding)

    exact_paths = [finding for finding in unique if finding["has_exact_source_path"]]
    full_candidates = [finding for finding in unique if finding["plausible_full_body"]]
    return {
        "target_path": TARGET_PATH,
        "target_title": TARGET_TITLE,
        "total_blobs": len(blobs),
        "text_blobs_contacted": text_blobs,
        "archives_contacted": archives,
        "finding_count": len(unique),
        "exact_source_path_findings": exact_paths,
        "plausible_full_body_findings": full_candidates,
        "findings": unique,
    }


def main() -> int:
    words = words_proof()
    custody = scan_theovertime_custody()
    receipt = {
        "schema": "JM.TheoryRepairabilityProof/1.0",
        "status": "COMPLETE",
        "words": words,
        "theovertime_custody": custody,
        "repair_decision": {
            "words": words["repair_classification"],
            "theovertime": (
                "EXACT_SOURCE_CANDIDATE_FOUND_REVIEW_REQUIRED"
                if custody["exact_source_path_findings"]
                else "NO_EXACT_GIT_SOURCE_BODY_FOUND"
            ),
            "chat_graft_v1": "NO_VALID_94_RECORD_GIT_OR_WISEBASE_CARRIER_FOUND",
        },
        "boundary": (
            "No payload or theory body was rewritten. A decoder-only repair may proceed only "
            "where the existing bytes themselves prove the recovered body."
        ),
    }
    OUT.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
