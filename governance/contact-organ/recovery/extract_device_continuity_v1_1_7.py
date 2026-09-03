#!/usr/bin/env python3
"""Extract the exact Device Continuity v1.1.7 donor from a JM HTML Body Dock carrier.

The extractor is deliberately fail-closed. It does not write an output source
unless the embedded donor decodes to the independently frozen byte length and
SHA-256 for 00_OPEN_FIRST_DEVICE_CONTINUITY_v1_1_7.html.

RECOVER BEFORE REBUILD.
NO DING, NO CLAIM.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import re
from pathlib import Path

DONOR_ID = "seed-62b14ef3fafc2085"
DONOR_FILENAME = "00_OPEN_FIRST_DEVICE_CONTINUITY_v1_1_7.html"
EXPECTED_BYTES = 284399
EXPECTED_SHA256 = "62b14ef3fafc208561ad493f383c8c6b3d0486b9f00c2ae8b4b816cd6f4c8e54"
CURRENT_BODY_DOCK_FILENAME = "00_OPEN_FIRST_JM_HTML_BODY_DOCK_v1_0_FULL_COMPLETE_CONTACT_EXECUTION.html"
CURRENT_BODY_DOCK_BYTES = 5829675
CURRENT_BODY_DOCK_SHA256 = "345038e8ece9755f55b0caa60d98b7ac63dbd43c97b422c09e2d804b3ac7fe98"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def locate_embedded_source(text: str) -> tuple[str, str]:
    """Return (sourceB64, locator) for the exact donor record.

    Body Dock stores donor rows as JSON-like JavaScript data. We intentionally
    anchor the search to both immutable donor id and exact filename before
    accepting any sourceB64 field.
    """
    anchors = []
    for anchor in (DONOR_ID, DONOR_FILENAME):
        pos = text.find(anchor)
        if pos >= 0:
            anchors.append(pos)
    if len(anchors) < 2:
        raise ValueError("Exact Device Continuity donor anchors not both present")

    start = max(0, min(anchors) - 4096)
    end = min(len(text), max(anchors) + 800000)
    window = text[start:end]
    if DONOR_ID not in window or DONOR_FILENAME not in window:
        raise ValueError("Donor anchors do not resolve to one extraction window")

    patterns = (
        r'"sourceB64"\s*:\s*"([A-Za-z0-9+/=_-]+)"',
        r"'sourceB64'\s*:\s*'([A-Za-z0-9+/=_-]+)'",
    )
    for pattern in patterns:
        match = re.search(pattern, window)
        if match:
            return match.group(1), f"window:{start}-{end}"
    raise ValueError("sourceB64 not found beside exact Device Continuity donor anchors")


def decode_source(source_b64: str) -> bytes:
    raw = source_b64.encode("ascii")
    padding = b"=" * ((4 - len(raw) % 4) % 4)
    try:
        return base64.b64decode(raw + padding, altchars=b"-_", validate=True)
    except Exception as exc:
        raise ValueError(f"Embedded donor base64 decode failed: {exc}") from exc


def extract(
    carrier: Path,
    output_dir: Path,
    receipt_path: Path | None = None,
    require_current_body_dock: bool = False,
) -> dict:
    carrier_bytes = carrier.read_bytes()
    carrier_sha = sha256_bytes(carrier_bytes)
    if require_current_body_dock:
        if len(carrier_bytes) != CURRENT_BODY_DOCK_BYTES:
            raise ValueError(
                f"Body Dock byte mismatch: {len(carrier_bytes)} != {CURRENT_BODY_DOCK_BYTES}"
            )
        if carrier_sha != CURRENT_BODY_DOCK_SHA256:
            raise ValueError(
                f"Body Dock SHA mismatch: {carrier_sha} != {CURRENT_BODY_DOCK_SHA256}"
            )

    text = carrier_bytes.decode("utf-8", errors="strict")
    source_b64, locator = locate_embedded_source(text)
    donor = decode_source(source_b64)
    donor_sha = sha256_bytes(donor)

    if len(donor) != EXPECTED_BYTES:
        raise ValueError(f"Donor byte mismatch: {len(donor)} != {EXPECTED_BYTES}")
    if donor_sha != EXPECTED_SHA256:
        raise ValueError(f"Donor SHA mismatch: {donor_sha} != {EXPECTED_SHA256}")

    output_dir.mkdir(parents=True, exist_ok=True)
    output = output_dir / DONOR_FILENAME
    output.write_bytes(donor)

    receipt = {
        "schema": "jm.estate.contact-organ-exact-donor-extraction/1.2.2",
        "recipientId": "cross-continuity",
        "donorId": DONOR_ID,
        "filename": DONOR_FILENAME,
        "bytes": len(donor),
        "sha256": donor_sha,
        "expectedBytes": EXPECTED_BYTES,
        "expectedSha256": EXPECTED_SHA256,
        "carrier": str(carrier),
        "carrierBytes": len(carrier_bytes),
        "carrierSha256": carrier_sha,
        "currentBodyDockExact": (
            len(carrier_bytes) == CURRENT_BODY_DOCK_BYTES
            and carrier_sha == CURRENT_BODY_DOCK_SHA256
        ),
        "sourceLocator": locator,
        "output": str(output),
        "writeGate": "PASS_EXACT_BYTES_AND_SHA",
        "parentMutated": False,
        "contactOrganMounted": False,
        "physicalDing": "OPEN",
        "claimBoundary": "Exact donor source extraction only. Contact Organ mounting, carrier contact, Phone-Laptop consequence and physical Ding remain separate gates."
    }

    if receipt_path is None:
        receipt_path = output_dir / "DEVICE_CONTINUITY_v1_1_7_EXTRACTION_RECEIPT_v1_2_2.json"
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    return receipt


def selftest() -> None:
    # Parser/decoder fixture only. The frozen donor SHA is never weakened by this test.
    fixture_bytes = b"<html><body>fixture</body></html>"
    fixture_b64 = base64.b64encode(fixture_bytes).decode("ascii")
    fixture = (
        '{"id":"' + DONOR_ID + '","filename":"' + DONOR_FILENAME
        + '","sourceB64":"' + fixture_b64 + '"}'
    )
    encoded, _ = locate_embedded_source(fixture)
    assert decode_source(encoded) == fixture_bytes
    assert EXPECTED_BYTES == 284399
    assert EXPECTED_SHA256 == "62b14ef3fafc208561ad493f383c8c6b3d0486b9f00c2ae8b4b816cd6f4c8e54"
    print("Device Continuity extractor parser SELFTEST PASS")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("carrier", nargs="?", type=Path)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(
            "estate-publication/source-carriage/contact-organ-v1.2/cross-continuity"
        ),
    )
    parser.add_argument("--receipt", type=Path)
    parser.add_argument("--require-current-body-dock", action="store_true")
    parser.add_argument("--selftest", action="store_true")
    args = parser.parse_args()

    if args.selftest:
        selftest()
        return
    if args.carrier is None:
        parser.error("carrier path is required unless --selftest is used")

    receipt = extract(
        args.carrier,
        args.output_dir,
        args.receipt,
        require_current_body_dock=args.require_current_body_dock,
    )
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
