#!/usr/bin/env python3
"""JM Estate Contact Organ v1.2.3 — exact source-seat intake gate.

One exact source in -> verify authority -> seat byte-for-byte -> clean descendant
-> receipts. Batch mode scans a staging directory and promotes every source that
earns the same gate.

This is deliberately fail-closed:
- known hashes must match;
- known byte lengths must match;
- unknown-hash heads are not silently crowned;
- native packages never enter the generic HTML patch route;
- Device Continuity may be recovered from the exact Body Dock carrier via the
  v1.2.2 extractor;
- frozen v1.2.1/v1.2.2 receipts are read, never rewritten.

FROZEN PARENT -> CLEAN DESCENDANT.
NO DING, NO CLAIM.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
MANIFEST_PATH = HERE / "source_seat_manifest_v1_2_3.json"
RECIPIENTS_PATH = HERE / "recipient_registry_v1_1.json"
COMMON_PATH = HERE / "JM_ESTATE_CONTACT_ORGAN_v1_0.js"
CROSS_PATH = HERE / "JM_ESTATE_CROSS_DEVICE_CONTACT_ADAPTER_v1_0.js"
EXTRACTOR = HERE / "recovery/extract_device_continuity_v1_1_7.py"
OUT = ROOT / "estate-publication/contact-organ-descendants"
FLOOR_RECEIPT = OUT / "PROPAGATION_RECEIPT_v1_2_1.json"
AUTHORITY_RECEIPT = OUT / "PROPAGATION_AUTHORITY_RECEIPT_v1_2_2.json"
GLOBAL_RECEIPT = OUT / "PROPAGATION_RECEIPT_v1_2_3.json"
GATE_RECEIPT = OUT / "SOURCE_SEAT_GATE_RECEIPT_v1_2_3.json"
MARK = "JM_ESTATE_CONTACT_ORGAN_PATCH_v1_2_3"

MANIFEST = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
ROWS = {r["recipientId"]: r for r in MANIFEST["rows"]}
RECIPIENTS = json.loads(RECIPIENTS_PATH.read_text(encoding="utf-8"))["recipients"]
RECIPIENT_BY_ID = {r["id"]: r for r in RECIPIENTS}
COMMON = COMMON_PATH.read_text(encoding="utf-8")
CROSS = CROSS_PATH.read_text(encoding="utf-8")
CROSS_IDS = {"cross-continuity", "cross-forge", "cross-private-arcade"}


class GateError(RuntimeError):
    pass


def digest_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def digest(path: Path) -> str:
    return digest_bytes(path.read_bytes())


def j(value) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def relative(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT.resolve()))
    except Exception:
        return str(path)


def verify_bytes(row: dict, data: bytes, source_name: str, *, accept_unhashed: bool = False) -> dict:
    expected_hash = row.get("expectedSha256")
    expected_bytes = row.get("expectedBytes")
    actual_hash = digest_bytes(data)
    actual_bytes = len(data)

    if expected_bytes is not None and actual_bytes != expected_bytes:
        raise GateError(f"{row['recipientId']}: byte mismatch {actual_bytes} != {expected_bytes}")
    if expected_hash and actual_hash != expected_hash:
        raise GateError(f"{row['recipientId']}: SHA mismatch {actual_hash} != {expected_hash}")
    if not expected_hash and not accept_unhashed:
        raise GateError(
            f"{row['recipientId']}: current authority has no frozen SHA; refusing source seat without --accept-unhashed-authority"
        )

    return {
        "sourceName": source_name,
        "actualBytes": actual_bytes,
        "actualSha256": actual_hash,
        "expectedBytes": expected_bytes,
        "expectedSha256": expected_hash,
        "hashAuthority": "EXACT_MATCH" if expected_hash else "OBSERVED_ONLY__EXPLICIT_UNHASHED_ACCEPTANCE",
    }


def verify_filename(row: dict, candidate: Path, *, allow_renamed: bool = False) -> None:
    expected = row["expectedFile"]
    if candidate.name == expected:
        return
    if allow_renamed and row.get("expectedSha256"):
        return
    raise GateError(f"{row['recipientId']}: filename mismatch {candidate.name!r} != {expected!r}")


def source_carriage_dir(row: dict) -> Path:
    return ROOT / MANIFEST["sourceCarriageRoot"] / row["recipientId"]


def source_carriage_path(row: dict) -> Path:
    return source_carriage_dir(row) / row["expectedFile"]


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def bootstrap(recipient: dict, row: dict, source_class: str) -> str:
    cross = row["recipientId"] in CROSS_IDS
    config = {
        "schema": "jm.estate.contact-organ-recipient/1.2.3",
        "recipientId": row["recipientId"],
        "bodyId": row["expectedFile"],
        "bodyVersion": "repo-contact-descendant-v1.2.3",
        "inheritance": recipient["inheritance"],
        "consequence": recipient["consequence"],
        "authorizationModel": recipient["auth"],
        "remoteAuthority": bool(recipient["remote"]),
        "persistence": True,
        "cloudEvents": False,
        "protectedParent": True,
        "sourceClass": source_class,
        "crossDeviceDonorMounted": cross,
        "carrierBinding": "REQUIRED_FOR_REAL_CROSS_DEVICE_CONSEQUENCE" if cross else "NOT_APPLICABLE",
        "claimBoundary": "Source-seat descendant proves exact source authority plus Contact Organ mounting only. Body consequence, native package build/install, remote carrier contact and physical/device Ding remain separately observed and claim-gated."
    }
    parts = [f"\n<!-- {MARK} -->\n", "<script>\n", COMMON, "\n</script>\n"]
    if cross:
        parts += ["<script>\n", CROSS, "\n</script>\n"]
    parts += [
        "<script>\n",
        "window.JM_CONTACT_PATCH_CONFIG=" + j(config) + ";\n",
        "(async()=>{\n",
        " window.JMContact=JMContactOrgan.create(window.JM_CONTACT_PATCH_CONFIG);\n",
        " await window.JMContact.init();\n",
        " await window.JMContact.ready({observedDocument:true,sourceClass:" + j(source_class) + "});\n",
        " window.JMCrossDeviceContactDonorMounted=" + ("true" if cross else "false") + ";\n",
        " window.dispatchEvent(new CustomEvent('jm-contact-organ-ready',{detail:{recipientId:" + j(row["recipientId"]) + ",crossDeviceDonorMounted:" + ("true" if cross else "false") + "}}));\n",
        "})().catch(e=>console.error('JM Contact Organ v1.2.3',e));\n",
        "</script>\n",
        f"<!-- /{MARK} -->\n",
    ]
    return "".join(parts)


def materialise_html(row: dict, seated: Path, seat_receipt: dict) -> dict:
    recipient = RECIPIENT_BY_ID[row["recipientId"]]
    data = seated.read_bytes()
    try:
        text = data.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise GateError(f"{row['recipientId']}: HTML source is not strict UTF-8: {exc}") from exc
    lower = text.lower()
    if "</body>" not in lower:
        raise GateError(f"{row['recipientId']}: HTML source has no closing </body> carrier gate")
    if MARK in text:
        raise GateError(f"{row['recipientId']}: source already contains v1.2.3 patch marker")

    position = lower.rfind("</body>")
    patched = text[:position] + bootstrap(recipient, row, seat_receipt["sourceClass"]) + text[position:]
    outdir = OUT / row["recipientId"]
    outdir.mkdir(parents=True, exist_ok=True)
    descendant = outdir / f"{seated.stem}_CONTACT_ORGAN_v1_2_3_DESCENDANT.html"
    descendant.write_text(patched, encoding="utf-8")
    descendant_sha = digest(descendant)
    cross = row["recipientId"] in CROSS_IDS

    patch = {
        "schema": "jm.estate.contact-organ-patch-receipt/1.2.3",
        "recipientId": row["recipientId"],
        "source": relative(seated),
        "sourceClass": seat_receipt["sourceClass"],
        "sourceBytes": len(data),
        "sourceSha256": digest_bytes(data),
        "expectedExactSourceSha256": row.get("expectedSha256"),
        "descendant": relative(descendant),
        "descendantSha256": descendant_sha,
        "parentMutated": False,
        "commonOrganMounted": True,
        "crossDeviceDonorMounted": cross,
        "crossCarrierBound": False if cross else None,
        "bodySpecificConsequenceWiring": "OPEN_UNTIL_BODY_ACTION_RESULT_IS_EXPLICITLY_OBSERVED",
        "apkBuild": "OPEN",
        "physicalDing": "OPEN",
        "propagationLine": "v1.2.3 source-seat intake gate",
        "claimBoundary": "Exact source seat + source descendant only; no owner-device consequence is synthesized."
    }
    write_json(outdir / "PATCH_RECEIPT_v1_2_3.json", patch)
    return patch


def seat_native_package(row: dict, candidate: Path, verification: dict) -> dict:
    target = source_carriage_path(row)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(candidate, target)
    if digest(target) != verification["actualSha256"]:
        target.unlink(missing_ok=True)
        raise GateError(f"{row['recipientId']}: source-carriage copy SHA changed")
    outdir = OUT / row["recipientId"]
    receipt = {
        "schema": "jm.estate.contact-organ-source-seat-receipt/1.2.3",
        "recipientId": row["recipientId"],
        "carrierClass": row["carrierClass"],
        "sourceClass": "EXACT_NATIVE_PACKAGE_SEAT",
        "input": relative(candidate),
        "seatedSource": relative(target),
        **verification,
        "parentMutated": False,
        "genericHtmlPatch": "PROHIBITED",
        "nativeAdapter": row.get("nativeAdapter"),
        "materialized": False,
        "next": "Mount/compile the native adapter into a clean Android source/package descendant, then build/install/contact under separate gates.",
        "physicalDing": "OPEN"
    }
    write_json(outdir / "SOURCE_SEAT_RECEIPT_v1_2_3.json", receipt)
    return receipt


def extract_continuity_from_body_dock(row: dict, candidate: Path) -> Path:
    expected_alt = row.get("alternateCarrier")
    if candidate.name != expected_alt:
        raise GateError(f"cross-continuity: alternate carrier filename mismatch {candidate.name!r} != {expected_alt!r}")
    data = candidate.read_bytes()
    if row.get("alternateCarrierBytes") is not None and len(data) != row["alternateCarrierBytes"]:
        raise GateError("cross-continuity: Body Dock byte length mismatch")
    if digest_bytes(data) != row.get("alternateCarrierSha256"):
        raise GateError("cross-continuity: Body Dock SHA mismatch")
    output_dir = source_carriage_dir(row)
    subprocess.run(
        [sys.executable, str(EXTRACTOR), str(candidate), "--output-dir", str(output_dir), "--require-current-body-dock"],
        cwd=ROOT,
        check=True,
    )
    extracted = source_carriage_path(row)
    if not extracted.exists():
        raise GateError("cross-continuity: exact donor extractor returned without source output")
    return extracted


def seat_one(
    recipient_id: str,
    candidate: Path,
    *,
    allow_renamed: bool = False,
    accept_unhashed: bool = False,
) -> dict:
    if recipient_id not in ROWS:
        raise GateError(f"Unknown/open recipient for v1.2.3: {recipient_id}")
    row = ROWS[recipient_id]
    candidate = candidate.resolve()
    if not candidate.is_file():
        raise GateError(f"{recipient_id}: candidate file not found: {candidate}")

    if row["carrierClass"] == "HTML_CROSS_EXTRACTABLE" and candidate.name == row.get("alternateCarrier"):
        seated = extract_continuity_from_body_dock(row, candidate)
        verification = verify_bytes(row, seated.read_bytes(), seated.name)
        source_class = "EXACT_EMBEDDED_DONOR_EXTRACTED_AND_SEATED"
    else:
        verify_filename(row, candidate, allow_renamed=allow_renamed)
        data = candidate.read_bytes()
        verification = verify_bytes(row, data, candidate.name, accept_unhashed=accept_unhashed)
        seated = source_carriage_path(row)
        seated.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(candidate, seated)
        if digest(seated) != verification["actualSha256"]:
            seated.unlink(missing_ok=True)
            raise GateError(f"{recipient_id}: byte-for-byte source carriage verification failed")
        source_class = "EXACT_SOURCE_SEATED_FROM_V1_2_3_INTAKE"

    if row["carrierClass"] == "NATIVE_ANDROID_SAF":
        return seat_native_package(row, seated if seated == candidate else seated, verification)

    outdir = OUT / recipient_id
    seat_receipt = {
        "schema": "jm.estate.contact-organ-source-seat-receipt/1.2.3",
        "recipientId": recipient_id,
        "carrierClass": row["carrierClass"],
        "sourceClass": source_class,
        "input": relative(candidate),
        "seatedSource": relative(seated),
        **verification,
        "parentMutated": False,
        "materializationEligible": bool(row.get("materializationEligible")),
        "physicalDing": "OPEN"
    }
    write_json(outdir / "SOURCE_SEAT_RECEIPT_v1_2_3.json", seat_receipt)

    if not row.get("materializationEligible"):
        seat_receipt["materialized"] = False
        seat_receipt["next"] = "Authority hash must be frozen before generic descendant materialisation."
        write_json(outdir / "SOURCE_SEAT_RECEIPT_v1_2_3.json", seat_receipt)
        return seat_receipt

    patch = materialise_html(row, seated, seat_receipt)
    seat_receipt["materialized"] = True
    seat_receipt["descendant"] = patch["descendant"]
    seat_receipt["descendantSha256"] = patch["descendantSha256"]
    write_json(outdir / "SOURCE_SEAT_RECEIPT_v1_2_3.json", seat_receipt)
    return seat_receipt


def floor_materialized_ids() -> set[str]:
    floor = json.loads(FLOOR_RECEIPT.read_text(encoding="utf-8"))
    if floor.get("totalRecipients") != 28 or floor.get("materialized") != 6 or floor.get("unresolved") != 0:
        raise GateError("v1.2.1 frozen-green floor drifted; refusing v1.2.3 accounting")
    return {
        r["recipientId"]
        for r in floor.get("results", [])
        if r.get("status", "").startswith("CARRY_FORWARD_MATERIALIZED")
        or r.get("status", "").startswith("MATERIALIZED_")
    }


def write_global_receipts(run_rows: list[dict]) -> dict:
    floor_ids = floor_materialized_ids()
    new_patch_receipts = []
    for rid in ROWS:
        p = OUT / rid / "PATCH_RECEIPT_v1_2_3.json"
        if p.exists():
            rec = json.loads(p.read_text(encoding="utf-8"))
            if rec.get("parentMutated") is not False:
                raise GateError(f"{rid}: v1.2.3 patch receipt parent mutation boundary failed")
            new_patch_receipts.append(rec)
    materialized_ids = floor_ids | {r["recipientId"] for r in new_patch_receipts}
    total = len(RECIPIENTS)
    report = {
        "schema": "jm.estate.contact-organ-github-propagation/1.2.3",
        "date": "2026-09-03",
        "inherits": "v1.2.1 materialisation floor + v1.2.2 strengthened recovery authority",
        "law": "FROZEN PARENT -> CLEAN DESCENDANT",
        "claimLaw": "NO DING, NO CLAIM.",
        "totalRecipients": total,
        "materialized": len(materialized_ids),
        "materializationOpen": total - len(materialized_ids),
        "unresolved": 0,
        "floorMaterializedIds": sorted(floor_ids),
        "v1_2_3MaterializedIds": sorted({r["recipientId"] for r in new_patch_receipts}),
        "run": run_rows,
        "claimBoundary": "Counts increase only from byte/hash-gated source seats with clean descendant receipts. Native build/install and physical consequences remain separate."
    }
    write_json(GLOBAL_RECEIPT, report)
    gate = {
        "schema": "jm.estate.contact-organ-source-seat-gate/1.2.3",
        "date": "2026-09-03",
        "manifestRows": len(ROWS),
        "knownHashEligible": sum(bool(r.get("expectedSha256")) and r.get("carrierClass") != "NATIVE_ANDROID_SAF" for r in ROWS.values()),
        "unknownHashFailClosed": sum(not bool(r.get("expectedSha256")) for r in ROWS.values()),
        "nativeRoutes": sum(r.get("carrierClass") == "NATIVE_ANDROID_SAF" for r in ROWS.values()),
        "runRows": run_rows,
        "accounting": {
            "totalRecipients": total,
            "materialized": report["materialized"],
            "materializationOpen": report["materializationOpen"],
            "unresolved": 0,
        },
        "claimBoundary": "An empty intake is a green gate with no count change. A source mismatch is preserved as a failure and cannot earn a descendant."
    }
    write_json(GATE_RECEIPT, gate)
    return report


def batch(intake_dir: Path, *, accept_unhashed: bool = False, strict: bool = False) -> dict:
    intake_dir = intake_dir.resolve()
    run_rows: list[dict] = []
    if not intake_dir.exists():
        run_rows.append({"status": "INTAKE_DIRECTORY_ABSENT", "path": relative(intake_dir), "materializationEffect": 0})
        return write_global_receipts(run_rows)

    for rid, row in ROWS.items():
        names = [row["expectedFile"]]
        if row.get("alternateCarrier"):
            names.append(row["alternateCarrier"])
        candidates = []
        for name in names:
            candidates.extend(p for p in intake_dir.rglob(name) if p.is_file())
        if not candidates:
            continue

        success = None
        errors = []
        for candidate in candidates:
            try:
                success = seat_one(rid, candidate, accept_unhashed=accept_unhashed)
                break
            except Exception as exc:
                errors.append({"candidate": relative(candidate), "error": str(exc)})
        if success is not None:
            run_rows.append({
                "recipientId": rid,
                "status": "MATERIALIZED" if success.get("materialized") else "SOURCE_SEATED__MATERIALIZATION_OPEN",
                "seatedSource": success.get("seatedSource"),
                "descendant": success.get("descendant"),
                "sha256": success.get("actualSha256"),
            })
        else:
            run_rows.append({"recipientId": rid, "status": "SOURCE_SEAT_REJECTED", "errors": errors})
            if strict:
                write_global_receipts(run_rows)
                raise GateError(f"{rid}: all discovered intake candidates failed authority gates")

    return write_global_receipts(run_rows)


def selftest() -> None:
    fixture = b"<!doctype html><html><body>fixture</body></html>"
    fixture_row = {
        "recipientId": "fixture",
        "expectedBytes": len(fixture),
        "expectedSha256": digest_bytes(fixture),
    }
    verified = verify_bytes(fixture_row, fixture, "fixture.html")
    assert verified["hashAuthority"] == "EXACT_MATCH"
    try:
        verify_bytes(fixture_row, fixture + b"x", "fixture.html")
    except GateError:
        pass
    else:
        raise AssertionError("byte/hash mismatch selftest did not fail closed")

    nohash = {"recipientId": "fixture-nohash", "expectedBytes": len(fixture), "expectedSha256": None}
    try:
        verify_bytes(nohash, fixture, "fixture.html")
    except GateError:
        pass
    else:
        raise AssertionError("unknown-hash authority did not fail closed")

    common_recipient = RECIPIENT_BY_ID["phone-legaliving"]
    common_row = ROWS["phone-legaliving"]
    common_boot = bootstrap(common_recipient, common_row, "SELFTEST")
    assert "JMContactOrgan" in common_boot
    assert "JMCrossDeviceContactAdapter" not in common_boot

    cross_recipient = RECIPIENT_BY_ID["cross-continuity"]
    cross_row = ROWS["cross-continuity"]
    cross_boot = bootstrap(cross_recipient, cross_row, "SELFTEST")
    assert "JMContactOrgan" in cross_boot
    assert "JMCrossDeviceContactAdapter" in cross_boot

    assert json.loads(AUTHORITY_RECEIPT.read_text(encoding="utf-8"))["materialized"] == 6
    print("Contact Organ v1.2.3 source-seat SELFTEST PASS")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--recipient")
    parser.add_argument("--candidate", type=Path)
    parser.add_argument("--intake-dir", type=Path)
    parser.add_argument("--allow-renamed-input", action="store_true")
    parser.add_argument("--accept-unhashed-authority", action="store_true")
    parser.add_argument("--strict", action="store_true")
    parser.add_argument("--selftest", action="store_true")
    args = parser.parse_args()

    if args.selftest:
        selftest()
        return

    if args.recipient or args.candidate:
        if not (args.recipient and args.candidate):
            parser.error("--recipient and --candidate must be supplied together")
        result = seat_one(
            args.recipient,
            args.candidate,
            allow_renamed=args.allow_renamed_input,
            accept_unhashed=args.accept_unhashed_authority,
        )
        report = write_global_receipts([{
            "recipientId": args.recipient,
            "status": "MATERIALIZED" if result.get("materialized") else "SOURCE_SEATED__MATERIALIZATION_OPEN",
            "seatedSource": result.get("seatedSource"),
            "descendant": result.get("descendant"),
            "sha256": result.get("actualSha256"),
        }])
        print(json.dumps(report, indent=2))
        return

    intake = args.intake_dir or (ROOT / MANIFEST["intakeRoot"])
    report = batch(intake, accept_unhashed=args.accept_unhashed_authority, strict=args.strict)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
