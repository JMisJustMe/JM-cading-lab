from __future__ import annotations

import base64
import gzip
import hashlib
import json
import string
import zlib
from pathlib import Path
from typing import Any

import diagnose_theory_runtime_carriers_v2 as carriers

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "registry" / "words-missing-base64-character-recovery-wave01.json"
ALPHABET = string.ascii_uppercase + string.ascii_lowercase + string.digits + "+/"


def sha256(data: bytes | str) -> str:
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def clean_b64(raw: str) -> str:
    return "".join(char for char in raw.removeprefix("\ufeff") if not char.isspace())


def decode_exact(raw: str) -> bytes:
    return base64.b64decode(raw, validate=True)


def load_words() -> tuple[dict[str, Any], list[str]]:
    records, _ = carriers.load_recovery_records()
    matches = [record for record in records if record.get("id") == "project-words-are-data-constrainers"]
    if len(matches) != 1:
        raise RuntimeError(f"WORDS recovery record count {len(matches)}")
    record = matches[0]
    chunks = [clean_b64(value) for value in record.get("body_b64_chunks") or []]
    if len(chunks) != 2:
        raise RuntimeError(f"WORDS chunk count {len(chunks)}")
    return record, chunks


def first_zlib_failure(data: bytes) -> dict[str, Any]:
    decoder = zlib.decompressobj(16 + zlib.MAX_WBITS)
    produced = 0
    for index, byte in enumerate(data):
        try:
            out = decoder.decompress(bytes([byte]))
            produced += len(out)
        except zlib.error as exc:
            return {
                "status": "ERROR",
                "compressed_byte_index": index,
                "plain_bytes_before_error": produced,
                "error": repr(exc),
                "estimated_base64_character_index": (index // 3) * 4,
            }
    return {
        "status": "NO_STREAM_ERROR_IN_AVAILABLE_PREFIX",
        "compressed_bytes_contacted": len(data),
        "plain_bytes_produced": produced,
        "eof": decoder.eof,
        "unused_data_bytes": len(decoder.unused_data),
        "estimated_base64_character_index": len(data) * 4 // 3,
    }


def candidate_positions(total_data_length: int, boundary: int, failure_estimate: int) -> list[int]:
    positions = set()
    for center, radius in ((boundary, 192), (failure_estimate, 768)):
        for position in range(max(0, center - radius), min(total_data_length, center + radius) + 1):
            positions.add(position)
    # Include the beginning/end and every nearby quartet boundary as a final bounded guard.
    for position in range(0, min(256, total_data_length) + 1):
        positions.add(position)
    for position in range(max(0, total_data_length - 256), total_data_length + 1):
        positions.add(position)
    return sorted(positions)


def try_insertions(data_chars: str, padding: str, positions: list[int]) -> tuple[list[dict[str, Any]], int]:
    successes = []
    attempts = 0
    for position in positions:
        for character in ALPHABET:
            attempts += 1
            candidate = data_chars[:position] + character + data_chars[position:] + padding
            if len(candidate) % 4 != 0:
                continue
            try:
                compressed = decode_exact(candidate)
            except Exception:
                continue
            if not compressed.startswith(b"\x1f\x8b\x08"):
                continue
            try:
                plain = gzip.decompress(compressed)
            except Exception:
                continue
            text = plain.decode("utf-8", errors="replace")
            successes.append(
                {
                    "global_data_character_position": position,
                    "inserted_character": character,
                    "candidate_base64_characters": len(candidate),
                    "candidate_base64_sha256": sha256(candidate),
                    "compressed_bytes": len(compressed),
                    "compressed_sha256": sha256(compressed),
                    "plain_bytes": len(plain),
                    "plain_characters": len(text),
                    "plain_sha256": sha256(plain),
                    "plain_first_1200": text[:1200],
                    "plain_last_500": text[-500:],
                    "title_present": "WORDS ARE DATA CONSTRAINERS" in text,
                }
            )
    return successes, attempts


def main() -> int:
    record, chunks = load_words()
    joined = "".join(chunks)
    padding_count = len(joined) - len(joined.rstrip("="))
    padding = joined[-padding_count:] if padding_count else ""
    data_chars = joined[:-padding_count] if padding_count else joined
    boundary = len(chunks[0])

    first_decoded = decode_exact(chunks[0])
    failure = first_zlib_failure(first_decoded)
    estimate = int(failure.get("estimated_base64_character_index", boundary))
    positions = candidate_positions(len(data_chars), boundary, estimate)
    successes, attempts = try_insertions(data_chars, padding, positions)

    for success in successes:
        global_position = success["global_data_character_position"]
        if global_position <= boundary:
            success["chunk_index"] = 0
            success["chunk_character_position"] = global_position
        else:
            success["chunk_index"] = 1
            success["chunk_character_position"] = global_position - boundary

    unique_plain_hashes = sorted({success["plain_sha256"] for success in successes})
    classification = (
        "UNIQUE_CRC_VALID_SINGLE_CHARACTER_RECOVERY"
        if len(successes) == 1 and len(unique_plain_hashes) == 1
        else "MULTIPLE_CRC_VALID_RECOVERIES_REVIEW_REQUIRED"
        if successes
        else "NO_CRC_VALID_RECOVERY_IN_EVIDENCE_BOUNDED_WINDOWS"
    )

    receipt = {
        "schema": "JM.WordsMissingBase64CharacterRecovery/1.0",
        "status": "COMPLETE",
        "record": {
            "id": record.get("id"),
            "title": record.get("title"),
            "source": record.get("source"),
        },
        "carrier": {
            "chunk_characters": [len(chunk) for chunk in chunks],
            "boundary_global_character_index": boundary,
            "joined_characters": len(joined),
            "data_characters": len(data_chars),
            "padding": padding,
            "joined_mod_4": len(joined) % 4,
            "data_mod_4": len(data_chars) % 4,
            "missing_data_characters_required_for_valid_mod_4": 1,
        },
        "first_chunk_stream_diagnostic": failure,
        "search": {
            "candidate_positions": len(positions),
            "attempts": attempts,
            "alphabet_characters": len(ALPHABET),
            "position_min": min(positions),
            "position_max": max(positions),
        },
        "classification": classification,
        "success_count": len(successes),
        "unique_plain_hashes": unique_plain_hashes,
        "successes": successes,
        "boundary": (
            "A repaired carrier may be written only when one unique Base64 insertion yields a "
            "CRC-valid gzip body. No prose, padding or replacement body is generated here."
        ),
    }
    OUT.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
