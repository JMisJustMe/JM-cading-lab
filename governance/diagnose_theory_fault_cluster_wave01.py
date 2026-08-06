from __future__ import annotations

import base64
import gzip
import hashlib
import io
import json
import re
import subprocess
import zipfile
from collections import defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
THEORY = ROOT / "theory"
OUT = ROOT / "registry" / "theory-fault-cluster-diagnostic-wave01.json"
B64_ALPHABET = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=_-")


def run(*args: str, check: bool = True, binary: bool = False) -> str | bytes:
    completed = subprocess.run(
        args,
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if check and completed.returncode != 0:
        raise RuntimeError(
            f"{' '.join(args)} failed ({completed.returncode}): "
            f"{completed.stderr.decode('utf-8', errors='replace').strip()}"
        )
    return completed.stdout if binary else completed.stdout.decode("utf-8", errors="replace")


def sha256(data: bytes | str) -> str:
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def normalize_b64(raw: str) -> str:
    clean = "".join(ch for ch in raw.removeprefix("\ufeff") if not ch.isspace())
    clean = clean.replace("-", "+").replace("_", "/")
    return clean + "=" * ((4 - len(clean) % 4) % 4)


def decode_b64(raw: str) -> bytes:
    return base64.b64decode(normalize_b64(raw), validate=True)


def describe_bytes(data: bytes) -> dict[str, Any]:
    return {
        "bytes": len(data),
        "sha256": sha256(data),
        "first_24_hex": data[:24].hex(),
        "last_24_hex": data[-24:].hex(),
        "gzip_magic": data.startswith(b"\x1f\x8b\x08"),
        "zip_magic": data.startswith(b"PK\x03\x04"),
    }


def try_gzip(data: bytes) -> dict[str, Any]:
    result: dict[str, Any] = describe_bytes(data)
    try:
        plain = gzip.decompress(data)
    except Exception as exc:
        result.update({"gzip": "FAIL", "gzip_error": repr(exc)})
        return result
    text = plain.decode("utf-8", errors="replace")
    result.update(
        {
            "gzip": "PASS",
            "plain_bytes": len(plain),
            "plain_characters": len(text),
            "plain_sha256": sha256(plain),
            "plain_first_240": text[:240],
            "plain_last_240": text[-240:],
        }
    )
    try:
        payload = json.loads(text)
        result["json"] = "PASS"
        result["json_type"] = type(payload).__name__
        records = payload.get("records") if isinstance(payload, dict) else payload
        if isinstance(records, list):
            result["record_count"] = len(records)
    except Exception as exc:
        result.update({"json": "NOT_JSON", "json_error": repr(exc)})
    return result


def extract_js_string_literals(argument: str) -> list[str]:
    values = []
    for match in re.finditer(r"(['\"])((?:\\.|(?!\1).)*)\1", argument, re.S):
        raw = match.group(2)
        try:
            values.append(bytes(raw, "utf-8").decode("unicode_escape"))
        except Exception:
            values.append(raw)
    return values


def extract_words_chunks() -> tuple[list[str], list[dict[str, Any]]]:
    paths = [
        THEORY / "data/full-body-recovery/words-1.js",
        THEORY / "data/full-body-recovery/words-2.js",
    ]
    chunks: list[str] = []
    trace: list[dict[str, Any]] = []
    for path in paths:
        text = path.read_text(encoding="utf-8-sig")
        found: list[str] = []
        for pattern in (
            r"body_b64_chunks\s*:\s*\[(.*?)\]",
            r"body_b64_chunks\.push\((.*?)\)",
        ):
            for match in re.finditer(pattern, text, re.S):
                found.extend(extract_js_string_literals(match.group(1)))
        chunks.extend(found)
        trace.append(
            {
                "path": str(path.relative_to(ROOT)),
                "file_bytes": path.stat().st_size,
                "chunks_found": len(found),
                "chunk_characters": [len(value) for value in found],
                "chunk_endings": [value[-16:] for value in found],
            }
        )
    return chunks, trace


def diagnose_words() -> dict[str, Any]:
    chunks, trace = extract_words_chunks()
    result: dict[str, Any] = {
        "chunk_count": len(chunks),
        "trace": trace,
        "chunks": [],
    }
    decoded_chunks: list[bytes] = []
    for index, chunk in enumerate(chunks):
        row: dict[str, Any] = {
            "index": index,
            "characters": len(chunk),
            "mod_4": len("".join(ch for ch in chunk if not ch.isspace())) % 4,
            "ends_with_padding": chunk.rstrip().endswith("="),
            "first_24": chunk[:24],
            "last_24": chunk[-24:],
        }
        try:
            decoded = decode_b64(chunk)
            decoded_chunks.append(decoded)
            row.update({"base64": "PASS", **describe_bytes(decoded)})
            row["independent_gzip"] = try_gzip(decoded)
        except Exception as exc:
            row.update({"base64": "FAIL", "error": repr(exc)})
        result["chunks"].append(row)

    if len(decoded_chunks) == len(chunks) and decoded_chunks:
        byte_join = b"".join(decoded_chunks)
        result["decoded_byte_join"] = try_gzip(byte_join)
        separately_plain: list[bytes] = []
        separate_failures = []
        for index, decoded in enumerate(decoded_chunks):
            try:
                separately_plain.append(gzip.decompress(decoded))
            except Exception as exc:
                separate_failures.append({"index": index, "error": repr(exc)})
        if not separate_failures:
            joined_plain = b"".join(separately_plain)
            result["independent_gzip_stream_join"] = {
                "status": "PASS",
                "plain_bytes": len(joined_plain),
                "plain_sha256": sha256(joined_plain),
                "plain_first_240": joined_plain[:240].decode("utf-8", errors="replace"),
            }
        else:
            result["independent_gzip_stream_join"] = {
                "status": "FAIL",
                "failures": separate_failures,
            }

    try:
        text_join = "".join(chunks)
        decoded_text_join = decode_b64(text_join)
        result["base64_text_join"] = {"base64": "PASS", **try_gzip(decoded_text_join)}
    except Exception as exc:
        result["base64_text_join"] = {"base64": "FAIL", "error": repr(exc)}
    return result


def decode_v04_parts_from_reader(reader) -> tuple[dict[str, Any], dict[str, Any]]:
    texts = []
    part_trace = []
    for index in range(1, 8):
        path = f"theory/data/v0_4/part-{index:02d}.txt"
        raw = reader(path)
        if raw is None:
            raise FileNotFoundError(path)
        text = raw.decode("utf-8-sig") if isinstance(raw, bytes) else str(raw).removeprefix("\ufeff")
        clean = text.strip()
        texts.append(clean)
        part_trace.append(
            {
                "path": path,
                "characters": len(clean),
                "sha256": sha256(clean),
                "first_16": clean[:16],
                "last_16": clean[-16:],
            }
        )
    joined = "".join(texts)
    decoded = decode_b64(joined)
    plain = gzip.decompress(decoded)
    payload = json.loads(plain.decode("utf-8"))
    return payload, {
        "joined_characters": len(joined),
        "joined_sha256": sha256(joined),
        "gzip_bytes": len(decoded),
        "gzip_sha256": sha256(decoded),
        "plain_bytes": len(plain),
        "plain_sha256": sha256(plain),
        "parts": part_trace,
    }


def record_body(record: dict[str, Any]) -> tuple[str, str | None]:
    for key in ("body_text", "body", "text", "full_body", "source_body"):
        value = record.get(key)
        if isinstance(value, str):
            return value.strip(), key
    return "", None


def record_summary(record: dict[str, Any]) -> dict[str, Any]:
    body, field = record_body(record)
    fields = {}
    for key in (
        "body_text",
        "body",
        "text",
        "full_body",
        "source_body",
        "draft_text",
        "draft",
        "source_file",
        "source",
        "title",
        "id",
    ):
        value = record.get(key)
        if isinstance(value, str):
            fields[key] = {
                "characters": len(value),
                "sha256": sha256(value),
                "first_300": value[:300],
                "last_160": value[-160:],
            }
        elif value is not None:
            fields[key] = value
    return {
        "id": str(record.get("id")),
        "title": record.get("title"),
        "keys": sorted(record.keys()),
        "selected_body_field": field,
        "selected_body_characters": len(body),
        "selected_body_sha256": sha256(body) if body else None,
        "selected_body_first_700": body[:700],
        "fields": fields,
    }


def extract_expected_title_for_id_10() -> dict[str, Any]:
    source = (THEORY / "source-body-integrity-v12.js").read_text(encoding="utf-8-sig")
    object_match = re.search(r"\bTITLES\s*=\s*\{(.*?)\}\s*;", source, re.S)
    result: dict[str, Any] = {"found_titles_object": bool(object_match)}
    if not object_match:
        return result
    body = object_match.group(1)
    match = re.search(r"(?:['\"]10['\"]|\b10)\s*:\s*(['\"])(.*?)\1", body, re.S)
    result["id_10_expected_title"] = match.group(2) if match else None
    result["titles_literal_first_1000"] = body[:1000]
    result["title_count_estimate"] = len(re.findall(r"(?:['\"][^'\"]+['\"]|\b[\w-]+)\s*:", body))
    return result


def current_v04() -> dict[str, Any]:
    payload, trace = decode_v04_parts_from_reader(
        lambda path: (ROOT / path).read_bytes() if (ROOT / path).exists() else None
    )
    records = payload.get("records") if isinstance(payload, dict) else payload
    if not isinstance(records, list):
        raise ValueError("v0_4 payload has no records array")
    exact = [record for record in records if str(record.get("id")) == "10"]
    return {
        "payload_keys": sorted(payload.keys()) if isinstance(payload, dict) else None,
        "record_count": len(records),
        "trace": trace,
        "id_10_match_count": len(exact),
        "id_10": record_summary(exact[0]) if exact else None,
        "expected_title": extract_expected_title_for_id_10(),
    }


def git_show(commit: str, path: str) -> bytes | None:
    completed = subprocess.run(
        ["git", "show", f"{commit}:{path}"],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    return completed.stdout if completed.returncode == 0 else None


def scan_v04_history() -> dict[str, Any]:
    commits = str(
        run(
            "git",
            "log",
            "--all",
            "--format=%H",
            "--",
            "theory/data/v0_4/part-01.txt",
            "theory/data/v0_4/part-02.txt",
            "theory/data/v0_4/part-03.txt",
            "theory/data/v0_4/part-04.txt",
            "theory/data/v0_4/part-05.txt",
            "theory/data/v0_4/part-06.txt",
            "theory/data/v0_4/part-07.txt",
        )
    ).splitlines()
    rows = []
    seen_payloads = set()
    for commit in commits:
        try:
            payload, trace = decode_v04_parts_from_reader(lambda path, c=commit: git_show(c, path))
            payload_hash = trace["plain_sha256"]
            if payload_hash in seen_payloads:
                continue
            seen_payloads.add(payload_hash)
            records = payload.get("records") if isinstance(payload, dict) else payload
            if not isinstance(records, list):
                raise ValueError("no records array")
            exact = [record for record in records if str(record.get("id")) == "10"]
            rows.append(
                {
                    "commit": commit,
                    "status": "PASS",
                    "record_count": len(records),
                    "payload_plain_sha256": payload_hash,
                    "joined_sha256": trace["joined_sha256"],
                    "id_10_match_count": len(exact),
                    "id_10": record_summary(exact[0]) if exact else None,
                }
            )
        except Exception as exc:
            rows.append({"commit": commit, "status": "FAIL", "error": repr(exc)})
    healthy = [
        row
        for row in rows
        if row.get("status") == "PASS"
        and row.get("id_10", {}).get("selected_body_characters", 0) >= 700
    ]
    strongest = sorted(
        healthy,
        key=lambda row: row.get("id_10", {}).get("selected_body_characters", 0),
        reverse=True,
    )
    return {
        "commits_contacted": len(commits),
        "unique_payloads_contacted": len([row for row in rows if row.get("status") == "PASS"]),
        "healthy_id_10_versions": healthy,
        "strongest_id_10_versions": strongest[:10],
        "versions": rows,
    }


def is_mostly_base64(text: str) -> bool:
    clean = "".join(ch for ch in text if not ch.isspace())
    if len(clean) < 1000:
        return False
    valid = sum(1 for ch in clean if ch in B64_ALPHABET)
    return valid / len(clean) >= 0.995


def record_count_if_gzip_json(raw: str) -> dict[str, Any] | None:
    try:
        compressed = decode_b64(raw)
        if not compressed.startswith(b"\x1f\x8b\x08"):
            return None
        plain = gzip.decompress(compressed)
        payload = json.loads(plain.decode("utf-8"))
        records = payload.get("records") if isinstance(payload, dict) else payload
        if not isinstance(records, list):
            return None
        markers = {
            "chat_source_excerpt": sum(
                1 for record in records if isinstance(record, dict) and "chat_source_excerpt" in record
            ),
            "source_occurrences": sum(
                1 for record in records if isinstance(record, dict) and "source_occurrences" in record
            ),
            "match_state": sum(
                1 for record in records if isinstance(record, dict) and "match_state" in record
            ),
        }
        return {
            "record_count": len(records),
            "compressed_bytes": len(compressed),
            "compressed_sha256": sha256(compressed),
            "plain_bytes": len(plain),
            "plain_sha256": sha256(plain),
            "markers": markers,
            "payload_keys": sorted(payload.keys()) if isinstance(payload, dict) else None,
        }
    except Exception:
        return None


def direct_json_candidate(text: str) -> dict[str, Any] | None:
    try:
        payload = json.loads(text)
    except Exception:
        return None
    records = payload.get("records") if isinstance(payload, dict) else payload
    if not isinstance(records, list):
        return None
    markers = {
        "chat_source_excerpt": sum(
            1 for record in records if isinstance(record, dict) and "chat_source_excerpt" in record
        ),
        "source_occurrences": sum(
            1 for record in records if isinstance(record, dict) and "source_occurrences" in record
        ),
        "match_state": sum(
            1 for record in records if isinstance(record, dict) and "match_state" in record
        ),
    }
    if not any(markers.values()):
        return None
    return {
        "record_count": len(records),
        "markers": markers,
        "plain_sha256": sha256(text),
    }


def list_git_blobs() -> tuple[list[tuple[str, int]], dict[str, list[str]]]:
    paths: dict[str, list[str]] = defaultdict(list)
    for line in str(run("git", "rev-list", "--all", "--objects")).splitlines():
        parts = line.split(" ", 1)
        if len(parts) == 2:
            paths[parts[0]].append(parts[1])
    listing = str(
        run(
            "git",
            "cat-file",
            "--batch-all-objects",
            "--batch-check=%(objectname) %(objecttype) %(objectsize)",
        )
    ).splitlines()
    blobs = []
    for line in listing:
        object_id, object_type, object_size = line.split()
        if object_type == "blob":
            blobs.append((object_id, int(object_size)))
    return blobs, paths


def scan_blob_payload(blob: str, size: int, paths: list[str]) -> list[dict[str, Any]]:
    if size < 1000 or size > 25_000_000:
        return []
    data = run("git", "cat-file", "blob", blob, binary=True)
    assert isinstance(data, bytes)
    findings: list[dict[str, Any]] = []

    if data.startswith(b"PK\x03\x04") and size <= 20_000_000:
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                for info in archive.infolist():
                    low = info.filename.lower()
                    if info.file_size > 5_000_000:
                        continue
                    if not any(term in low for term in ("chat", "graft", "theory", "source")):
                        continue
                    content = archive.read(info)
                    try:
                        text = content.decode("utf-8-sig")
                    except Exception:
                        continue
                    direct = direct_json_candidate(text)
                    if direct and direct["record_count"] == 94:
                        findings.append(
                            {
                                "kind": "zip_json_94",
                                "blob": blob,
                                "blob_size": size,
                                "paths": paths,
                                "archive_entry": info.filename,
                                **direct,
                            }
                        )
                    if is_mostly_base64(text):
                        decoded = record_count_if_gzip_json(text)
                        if decoded and decoded["record_count"] == 94:
                            findings.append(
                                {
                                    "kind": "zip_base64_gzip_json_94",
                                    "blob": blob,
                                    "blob_size": size,
                                    "paths": paths,
                                    "archive_entry": info.filename,
                                    **decoded,
                                }
                            )
        except Exception:
            pass

    try:
        text = data.decode("utf-8-sig")
    except Exception:
        return findings

    direct = direct_json_candidate(text)
    if direct and direct["record_count"] == 94:
        findings.append(
            {
                "kind": "direct_json_94",
                "blob": blob,
                "blob_size": size,
                "paths": paths,
                **direct,
            }
        )

    if is_mostly_base64(text):
        decoded = record_count_if_gzip_json(text)
        if decoded and decoded["record_count"] == 94:
            findings.append(
                {
                    "kind": "whole_blob_base64_gzip_json_94",
                    "blob": blob,
                    "blob_size": size,
                    "paths": paths,
                    **decoded,
                }
            )

    # Long embedded Base64 strings inside scripts, JSON wrappers, HTML or receipts.
    for match_index, match in enumerate(
        re.finditer(r"(?<![A-Za-z0-9+/_-])([A-Za-z0-9+/_-]{1000,}={0,2})(?![A-Za-z0-9+/_-])", text)
    ):
        candidate = match.group(1)
        decoded = record_count_if_gzip_json(candidate)
        if decoded and decoded["record_count"] == 94:
            findings.append(
                {
                    "kind": "embedded_base64_gzip_json_94",
                    "blob": blob,
                    "blob_size": size,
                    "paths": paths,
                    "match_index": match_index,
                    "match_characters": len(candidate),
                    **decoded,
                }
            )
    return findings


def scan_all_blobs_for_chat_graft() -> dict[str, Any]:
    blobs, path_map = list_git_blobs()
    candidates = [(blob, size) for blob, size in blobs if 1000 <= size <= 25_000_000]
    findings = []
    inspected = 0
    for blob, size in candidates:
        inspected += 1
        findings.extend(scan_blob_payload(blob, size, path_map.get(blob, [])))
    unique = []
    seen = set()
    for finding in findings:
        key = (
            finding.get("plain_sha256"),
            finding.get("compressed_sha256"),
            finding.get("archive_entry"),
        )
        if key in seen:
            continue
        seen.add(key)
        unique.append(finding)
    return {
        "total_blobs": len(blobs),
        "candidate_blobs_inspected": inspected,
        "valid_94_record_findings": unique,
        "finding_count": len(unique),
    }


def main() -> int:
    receipt = {
        "schema": "JM.TheoryFaultClusterDiagnostic/1.0",
        "status": "COMPLETE",
        "words_chunk_semantics": diagnose_words(),
        "current_v0_4_id_10": current_v04(),
        "v0_4_id_10_history": scan_v04_history(),
        "all_ref_blob_scan_for_94_record_chat_graft": scan_all_blobs_for_chat_graft(),
        "boundary": (
            "This receipt diagnoses exact carriers and historical authority. It does not "
            "repair, pad, merge or crown any body."
        ),
    }
    OUT.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
