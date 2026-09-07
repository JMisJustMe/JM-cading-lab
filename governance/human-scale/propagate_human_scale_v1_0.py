#!/usr/bin/env python3
"""JM Human-Scale Interaction propagation v1.0.

Forward-only graft pipeline for exact recovered app/tool HTML sources.
It NEVER invents a missing source and NEVER overwrites a parent.

Usage:
  python governance/human-scale/propagate_human_scale_v1_0.py \
      --source-root /path/to/JM_APPS_TOOLS_STRENGTHENING_COMPLETE_v1_0 \
      --output-root estate-publication/human-scale-apps-tools/materialized-strengthening

The source root must contain the exact Strengthening Programme paths.
Missing sources are emitted as HOLD records, not reconstructed.
"""
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ORGAN_PATH = ROOT / "governance/human-scale/JM_HUMAN_SCALE_INTERACTION_ORGAN_v1_0.js"
MARK = "JM_HUMAN_SCALE_GRAFT_v1_0"

RECIPIENTS = [
    ("gem-extraction","WAVE_1_SOURCE_PROOF_GOVERNANCE/01_GEM_EXTRACTION_APP_v0_1.html","TURN THIS SOURCE INTO A CLEAN GEM","SPLIT SOURCE","button[onclick=\"splitSource()\"]","#candidates"),
    ("flowtalk-claim-checker","WAVE_1_SOURCE_PROOF_GOVERNANCE/02_FLOWTALK_CLAIM_CHECKER_v0_1.html","CHECK THIS CLAIM WITHOUT INFLATING IT","ASSESS CLAIM","button[onclick=\"assess()\"]","#out"),
    ("truth-handling","WAVE_1_SOURCE_PROOF_GOVERNANCE/03_TRUTH_HANDLING_TOOLKIT_v0_1.html","HANDLE THIS STATEMENT WITHOUT LOSING ITS SOURCE OR LIMITS","REVIEW HANDLING","button[onclick=\"review()\"]","#out"),
    ("receipt-generator","WAVE_1_SOURCE_PROOF_GOVERNANCE/04_RECEIPT_GENERATOR_v0_1.html","RECORD WHAT ACTUALLY HAPPENED","GENERATE RECEIPT","button[onclick=\"makeReceipt()\"]","#out"),
    ("active-keeper-dashboard","WAVE_1_SOURCE_PROOF_GOVERNANCE/05_ACTIVE_KEEPER_DASHBOARD_v0_1.html","KEEP THE CURRENT AUTHORITY VISIBLE","ADD KEEPER","button[onclick=\"addKeeper()\"]","#list"),
    ("action-first-reentry","WAVE_2_SOURCE_TO_PUBLIC_OUTPUT/01_ACTION_FIRST_REENTRY_v0_1.html","RE-ENTER THIS BODY AT ITS NEXT REAL ACTION","RE-ENTER",None,None),
    ("collector-protocol","WAVE_2_SOURCE_TO_PUBLIC_OUTPUT/02_COLLECTOR_PROTOCOL_v0_1.html","COLLECT THIS SOURCE WITHOUT LOSING ITS TRAIL","COLLECT",None,None),
    ("public-output","WAVE_2_SOURCE_TO_PUBLIC_OUTPUT/03_PUBLIC_OUTPUT_TOOL_v0_1.html","TURN THIS WORK INTO A BOUNDED PUBLIC OUTPUT","MAKE OUTPUT",None,None),
    ("books-manuscripts","WAVE_2_SOURCE_TO_PUBLIC_OUTPUT/04_BOOKS_MANUSCRIPTS_BUILDER_v0_1.html","BUILD THE MANUSCRIPT FROM THE CURRENT BODY","BUILD",None,None),
    ("notes-triage","WAVE_2_SOURCE_TO_PUBLIC_OUTPUT/05_NOTES_TRIAGE_v0_1.html","SORT THESE NOTES INTO USEFUL NEXT ROUTES","TRIAGE",None,None),
    ("b-stage","WAVE_2_SOURCE_TO_PUBLIC_OUTPUT/06_B_STAGE_v0_1.html","MOVE THIS B-BODY TO ITS NEXT LAWFUL STATE","MOVE BODY",None,None),
    ("jumpmotion","WAVE_3_HUMAN_BODY_PRACTICE/01_JUMPMOTION_v0_1.html","RUN JUMPMOTION AND SEE THE CONSEQUENCE","RUN",None,None),
    ("expectation-reality-gap","WAVE_3_HUMAN_BODY_PRACTICE/02_EXPECTATION_REALITY_GAP_v0_1.html","COMPARE EXPECTATION WITH WHAT ACTUALLY HAPPENED","COMPARE",None,None),
    ("contact-reactivation","WAVE_3_HUMAN_BODY_PRACTICE/03_CONTACT_REACTIVATION_v0_1.html","REACTIVATE CONTACT FROM THE CURRENT STATE","REACTIVATE",None,None),
    ("environment-first","WAVE_3_HUMAN_BODY_PRACTICE/04_ENVIRONMENT_FIRST_LOGIC_v0_1.html","CHECK THE FIELD BEFORE BLAMING THE BODY","CHECK FIELD",None,None),
    ("thought-route-teaching","WAVE_3_HUMAN_BODY_PRACTICE/05_THOUGHT_ROUTE_TEACHING_v0_1.html","TEACH THIS ROUTE THROUGH CONTACT","TEACH ROUTE",None,None),
    ("routedeck","WAVE_4_FTR_DEVICE_SOFTWARE/01_ROUTEDECK_v0_1.html","RUN THE CURRENT ROUTE","RUN ROUTE",None,None),
    ("routesense","WAVE_4_FTR_DEVICE_SOFTWARE/02_ROUTESENSE_v0_1.html","SENSE WHAT THE ROUTE IS DOING","SENSE ROUTE",None,None),
    ("routevault","WAVE_4_FTR_DEVICE_SOFTWARE/03_ROUTEVAULT_v0_1.html","VAULT THIS ROUTE WITHOUT LOSING RECOVERY","VAULT ROUTE",None,None),
    ("routewrite","WAVE_4_FTR_DEVICE_SOFTWARE/04_ROUTEWRITE_v0_1.html","WRITE THE ROUTE IN A REUSABLE FORM","WRITE ROUTE",None,None),
    ("input-layer-editor","WAVE_4_FTR_DEVICE_SOFTWARE/05_INPUT_LAYER_EDITOR_v0_1.html","EDIT THE INPUT LAYER WITHOUT EXPOSING UNRELATED MACHINERY","EDIT INPUT",None,None),
]


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def safe_config(recipient_id, source_rel, intention, label, selector, result):
    return {
        "schema": "jm.human-scale/config/1.0",
        "mode": "guided",
        "title": recipient_id.replace("-", " ").title(),
        "intention": intention,
        "primaryLabel": label,
        "primarySelector": selector or "",
        "resultSelector": result or "",
        "bodyId": recipient_id,
        "version": "Human-Scale descendant v1.0",
        "sourceAuthority": source_rel,
        "receiverProofState": "ASSISTANT-SIDE MATERIALIZED · OWNER CONTACT OPEN",
        "ownerContactRequired": True,
    }


def graft(text: str, cfg: dict, organ_js: str) -> str:
    if MARK in text:
        raise RuntimeError("source already contains human-scale graft marker")
    pos = text.lower().rfind("</body>")
    if pos < 0:
        raise RuntimeError("source has no </body> close")
    config_json = json.dumps(cfg, ensure_ascii=False).replace("</", "<\\/")
    insertion = (
        f"\n<!-- {MARK} -->\n"
        f"<script>window.JM_HUMAN_SCALE_CONFIG={config_json};</script>\n"
        f"<script>\n{organ_js}\n</script>\n"
    )
    return text[:pos] + insertion + text[pos:]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source-root", required=True, type=Path)
    ap.add_argument("--output-root", type=Path, default=ROOT / "estate-publication/human-scale-apps-tools/materialized-strengthening")
    args = ap.parse_args()
    organ = ORGAN_PATH.read_text(encoding="utf-8")
    args.output_root.mkdir(parents=True, exist_ok=True)
    results = []

    for rid, rel, intention, label, selector, result_selector in RECIPIENTS:
        src = args.source_root / rel
        row = {"recipientId": rid, "source": rel}
        if not src.exists():
            row.update(status="HOLD_EXACT_SOURCE_NOT_MOUNTED", descendant=None)
            results.append(row)
            continue
        raw = src.read_bytes()
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            row.update(status="HOLD_SOURCE_NOT_UTF8", sourceSha256=sha256_bytes(raw), descendant=None)
            results.append(row)
            continue
        cfg = safe_config(rid, rel, intention, label, selector, result_selector)
        if not selector:
            # Unknown primary semantics are NEVER guessed into an automatic click.
            cfg["primaryLabel"] = label
            cfg["primarySelector"] = ""
        try:
            descendant_text = graft(text, cfg, organ)
        except Exception as exc:
            row.update(status="HOLD_GRAFT_GATE", sourceSha256=sha256_bytes(raw), error=str(exc), descendant=None)
            results.append(row)
            continue
        outdir = args.output_root / rid
        outdir.mkdir(parents=True, exist_ok=True)
        out = outdir / f"{src.stem}_HUMAN_SCALE_v1_0_DESCENDANT.html"
        if out.exists():
            row.update(status="HOLD_WOULD_OVERWRITE_DESCENDANT", sourceSha256=sha256_bytes(raw), descendant=str(out.relative_to(ROOT) if out.is_relative_to(ROOT) else out))
            results.append(row)
            continue
        out.write_text(descendant_text, encoding="utf-8")
        row.update(
            status="MATERIALIZED_HUMAN_SCALE_DESCENDANT",
            sourceSha256=sha256_bytes(raw),
            descendantSha256=sha256_bytes(descendant_text.encode("utf-8")),
            descendant=str(out.relative_to(ROOT) if out.is_relative_to(ROOT) else out),
            ownerContact="OPEN",
        )
        results.append(row)

    receipt = {
        "schema": "jm.estate.human-scale-propagation-run/1.0",
        "law": "FROZEN PARENT -> CLEAN DESCENDANT",
        "sourceRoot": str(args.source_root),
        "outputRoot": str(args.output_root),
        "total": len(results),
        "materialized": sum(r["status"] == "MATERIALIZED_HUMAN_SCALE_DESCENDANT" for r in results),
        "held": sum(r["status"] != "MATERIALIZED_HUMAN_SCALE_DESCENDANT" for r in results),
        "results": results,
        "claimBoundary": "Source/materialization receipt only. Owner device/browser/file-lifecycle proof remains separate."
    }
    (args.output_root / "HUMAN_SCALE_PROPAGATION_RUN_RECEIPT_v1_0.json").write_text(json.dumps(receipt, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({k:receipt[k] for k in ("total","materialized","held")}, indent=2))


if __name__ == "__main__":
    main()
