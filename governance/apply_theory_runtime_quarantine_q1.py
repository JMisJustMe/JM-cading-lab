from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
THEORY = ROOT / "theory"
RECEIPT = ROOT / "registry" / "theory-runtime-quarantine-q1-source-receipt.json"

V3 = THEORY / "chat-graft-v3.js"
V4 = THEORY / "chat-graft-v4.js"
V5 = THEORY / "full-body-recovery-v5.js"
DOWNSTREAM = [
    THEORY / "chat-room-recovery-v6.js",
    THEORY / "project-route-recovery-v7.js",
    THEORY / "first-stage-deep-recovery-v8.js",
    THEORY / "first-stage-t2-card-recovery-v9.js",
    THEORY / "first-stage-t1-reconciliation-v10.js",
]

EXPECTED_THEOVERTIME_STATUS = "PASS_EXACT_SOURCE_RESTORED"
QUARANTINED_GRAFT_RECORDS = 94
HEALTHY_GRAFT_V2 = 21
HEALTHY_GRAFT_MEMORY = 5
V4_CONTACTS = 20
QUARANTINED_BODY_ID = "project-words-are-data-constrainers"
HEALTHY_RECOVERIES = 3
PRE_INTEGRITY_FULL = 16
POST_INTEGRITY_FULL = 18


def sha256(data: bytes | str) -> str:
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one source marker, found {count}")
    return text.replace(old, new, 1)


def replace_function(text: str, name: str, replacement: str) -> str:
    marker = f"function {name}("
    start = text.find(marker)
    if start < 0:
        marker = f"async function {name}("
        start = text.find(marker)
    if start < 0:
        raise RuntimeError(f"Function {name} not found")

    brace = text.find("{", start)
    if brace < 0:
        raise RuntimeError(f"Function {name} opening brace not found")
    depth = 0
    quote = None
    escaped = False
    template_depth = 0
    end = None
    for index in range(brace, len(text)):
        char = text[index]
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif quote == "`" and char == "$" and index + 1 < len(text) and text[index + 1] == "{":
                template_depth += 1
            elif quote == "`" and char == "}" and template_depth:
                template_depth -= 1
            elif char == quote and template_depth == 0:
                quote = None
            continue
        if char in ("'", '"', "`"):
            quote = char
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                end = index + 1
                break
    if end is None:
        raise RuntimeError(f"Function {name} closing brace not found")
    return text[:start] + replacement.rstrip() + text[end:]


def file_state(path: Path) -> dict[str, Any]:
    data = path.read_bytes()
    return {
        "path": str(path.relative_to(ROOT)),
        "bytes": len(data),
        "sha256": sha256(data),
    }


def patch_v3() -> None:
    path = V3
    text = path.read_text(encoding="utf-8")
    if "JM_THEORY_RUNTIME_QUARANTINE_Q1_V3" in text:
        return

    text = replace_once(
        text,
        "  const V1_URL = './data/chat-graft-v1.b64?v=1200';\n",
        "  const QUARANTINED_V1_URL = './data/chat-graft-v1.b64?v=1200';\n",
        "v3 v1 URL",
    )
    text = replace_once(
        text,
        "  const EXPECTED_V1 = 94;\n  const EXPECTED_V2_NEW = 21;\n  const EXPECTED_V3_NEW = 5;\n  const EXPECTED_TOTAL = 120;",
        "  const EXPECTED_V1_QUARANTINED = 94;\n  const EXPECTED_V2_NEW = 21;\n  const EXPECTED_V3_NEW = 5;\n  const EXPECTED_HEALTHY_TOTAL = 26;\n  const QUARANTINE_ID = 'JM_THEORY_RUNTIME_QUARANTINE_Q1_V3';",
        "v3 constants",
    )

    load_sources = r'''async function loadSources() {
    const [v2Parts, v3] = await Promise.all([
      Promise.all(Array.from({ length: V2_PARTS }, (_, index) => (
        fetchText(`${V2_BASE}${String(index + 1).padStart(2, '0')}.txt?v=1200`)
      ))),
      fetch(V3_URL, { cache: 'no-store' }).then((response) => {
        if (!response.ok) throw new Error(`${V3_URL} returned ${response.status}`);
        return response.json();
      })
    ]);
    const v2 = await decodePayload(v2Parts.map((part) => part.trim()).join(''));
    if ((v2.records || []).length !== EXPECTED_V2_NEW) {
      throw new Error(`v2 healthy count ${(v2.records || []).length}, expected ${EXPECTED_V2_NEW}`);
    }
    if ((v3.records || []).length !== EXPECTED_V3_NEW) {
      throw new Error(`v3 memory count ${(v3.records || []).length}, expected ${EXPECTED_V3_NEW}`);
    }
    for (const graft of v2.records || []) grafts.set(String(graft.id), graft);
    for (const graft of v3.records || []) grafts.set(String(graft.id), graft);
    if (grafts.size !== EXPECTED_HEALTHY_TOTAL) {
      throw new Error(`healthy source count ${grafts.size}, expected ${EXPECTED_HEALTHY_TOTAL}`);
    }
  }'''
    text = replace_function(text, "loadSources", load_sources)

    update_summary = r'''function updateSummary() {
    const resultHead = document.querySelector('.results-head');
    if (!resultHead) return;
    let summary = resultHead.querySelector('.chat-graft-summary');
    if (!summary) {
      summary = document.createElement('span');
      summary.className = 'chat-graft-summary';
      resultHead.appendChild(summary);
    }
    summary.textContent = `${grafts.size} healthy source-backed routes · ${EXPECTED_V1_QUARANTINED} v1 records quarantined`;
    let note = resultHead.querySelector('[data-q1-v3-note]');
    if (!note) {
      note = document.createElement('span');
      note.dataset.q1V3Note = 'true';
      note.className = 'source-pass-note';
      resultHead.appendChild(note);
    }
    note.textContent = 'Q1 preserves the damaged v1 ancestor in custody and executes only the proved 21-record v2 carrier plus five local memory records.';
  }'''
    text = replace_function(text, "updateSummary", update_summary)

    old_then = """    .then(() => {
      graftReady = true;
      mergeIntoRecords();
    })"""
    new_then = """    .then(() => {
      graftReady = true;
      mergeIntoRecords();
      window.JMTheorySourceGraftV3 = Object.freeze({
        version: 'v0.12-Q1',
        state: 'HEALTHY_DESCENDANT_WITH_V1_QUARANTINED',
        sourceBacked: grafts.size,
        healthyV2: EXPECTED_V2_NEW,
        healthyMemory: EXPECTED_V3_NEW,
        quarantinedV1: EXPECTED_V1_QUARANTINED,
        quarantinedCarrier: QUARANTINED_V1_URL,
        quarantineId: QUARANTINE_ID
      });
      window.dispatchEvent(new CustomEvent('jm:graft-v3-ready', { detail: window.JMTheorySourceGraftV3 }));
    })"""
    text = replace_once(text, old_then, new_then, "v3 ready object")
    path.write_text(text, encoding="utf-8")


def patch_v4() -> None:
    path = V4
    text = path.read_text(encoding="utf-8")
    if "v0.13-Q1" in text:
        return

    text = replace_once(
        text,
        "  const BASELINE_SOURCE_ROUTES = 120;\n  let ready = false;\n  let sourceRows = new Map();\n  let sourceBacked = BASELINE_SOURCE_ROUTES;\n  let sourceContacts = BASELINE_SOURCE_ROUTES;\n  let stillOpen = PLACEHOLDER_TOTAL - BASELINE_SOURCE_ROUTES;",
        "  const QUARANTINED_V1 = 94;\n  let ready = false;\n  let sourceRows = new Map();\n  let sourceBacked = 0;\n  let sourceContacts = 0;\n  let stillOpen = PLACEHOLDER_TOTAL;",
        "v4 baseline",
    )

    wait = r'''async function waitForPriorPasses() {
    for (let attempt = 0; attempt < 400; attempt += 1) {
      if (
        typeof DATA !== 'undefined'
        && Array.isArray(DATA.records)
        && DATA.records.length === CENSUS_TOTAL
        && window.JMTheorySourceGraftV3
        && existingSourceCount() === window.JMTheorySourceGraftV3.sourceBacked
      ) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('Q1 healthy graft-v3 authority did not become ready');
  }'''
    text = replace_function(text, "waitForPriorPasses", wait)

    update_counts = r'''function updateCounts() {
    setText('topSourceRoutes', sourceBacked);
    setText('heroSourceRoutes', sourceBacked);
    setText('heroSourceContacts', sourceContacts);
    setText('heroOpenRoutes', stillOpen);
    setText('proofSourceRoutes', sourceBacked);
    setText('proofSourceContacts', sourceContacts);
    setText('proofOpenRoutes', stillOpen);

    const prior = window.JMTheorySourceGraftV3?.sourceBacked || 0;
    const lead = document.getElementById('sourcePassLead');
    if (lead) {
      lead.textContent = `Q1 executes ${prior} proved v2/memory source routes and adds ${EXPECTED_NEW_CONTACTS} bounded Library + Wisebase contacts. The damaged ${QUARANTINED_V1}-record v1 carrier remains quarantined and is not counted.`;
    }

    const resultHead = document.querySelector('.results-head');
    if (resultHead) {
      let summary = resultHead.querySelector('.chat-graft-summary');
      if (!summary) {
        summary = document.createElement('span');
        summary.className = 'chat-graft-summary';
        resultHead.appendChild(summary);
      }
      summary.textContent = `${sourceBacked} healthy source-backed routes · ${sourceContacts} contacts · ${QUARANTINED_V1} v1 records quarantined`;
      let note = resultHead.querySelector('.source-pass-note');
      if (!note) {
        note = document.createElement('span');
        note.className = 'source-pass-note';
        resultHead.appendChild(note);
      }
      note.textContent = 'v0.13-Q1 continues from proved carriers only. Quarantined ancestry remains named, preserved and excluded.';
    }
  }'''
    text = replace_function(text, "updateCounts", update_counts)

    old_object = """        version: 'v0.13',
        sourceBacked,
        sourceContacts,
        stillOpen,
        addedContacts: EXPECTED_NEW_CONTACTS"""
    new_object = """        version: 'v0.13-Q1',
        state: 'HEALTHY_DESCENDANT_WITH_V1_QUARANTINED',
        sourceBacked,
        sourceContacts,
        stillOpen,
        priorHealthy: window.JMTheorySourceGraftV3?.sourceBacked || 0,
        addedContacts: EXPECTED_NEW_CONTACTS,
        quarantinedV1: QUARANTINED_V1"""
    text = replace_once(text, old_object, new_object, "v4 authority object")
    path.write_text(text, encoding="utf-8")


def patch_v5() -> None:
    path = V5
    text = path.read_text(encoding="utf-8")
    if "QUARANTINED_ID" in text:
        return

    text = replace_once(
        text,
        "  const EXPECTED_RECOVERIES = 4;\n  const BASELINE_FULL = 13;",
        "  const REGISTERED_RECOVERIES = 4;\n  const EXPECTED_RECOVERIES = 3;\n  const QUARANTINED_ID = 'project-words-are-data-constrainers';\n  const BASELINE_FULL = 13;",
        "v5 constants",
    )

    load_payload = r'''async function loadPayload() {
    const records = window.JMTheoryRecoveredBodies || [];
    if (records.length !== REGISTERED_RECOVERIES) {
      throw new Error(`v5 registered recovery count ${records.length}, expected ${REGISTERED_RECOVERIES}`);
    }
    if (new Set(records.map((record) => String(record.id))).size !== REGISTERED_RECOVERIES) {
      throw new Error('v5 recovery modules contain duplicate ids');
    }
    const quarantined = records.find((record) => String(record.id) === QUARANTINED_ID);
    if (!quarantined) throw new Error('WORDS quarantine target is not registered');
    const healthy = records.filter((record) => String(record.id) !== QUARANTINED_ID);
    if (healthy.length !== EXPECTED_RECOVERIES) {
      throw new Error(`healthy recovery count ${healthy.length}, expected ${EXPECTED_RECOVERIES}`);
    }
    payload = {
      version: 'v0.14-Q1',
      records: await Promise.all(healthy.map((record) => decodeBody({ ...record }))),
      quarantined: {
        id: QUARANTINED_ID,
        title: quarantined.title,
        state: 'CARRIER_CORRUPT_SOURCE_UNRETRIEVED'
      }
    };
  }'''
    text = replace_function(text, "loadPayload", load_payload)

    static_copy = r'''function updateStaticCopy() {
    const full = fullBodyCount();
    const total = DATA.records.length;
    document.title = `JM Theory Multihub v0.14-Q1 — ${full} Full Bodies · WORDS Quarantined`;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = `JM Theory Multihub v0.14-Q1 — three proved bodies recovered, WORDS carrier preserved in quarantine, ${full} full/canonical bodies across ${total} routes before source-integrity.`;

    const brand = document.querySelector('.brand small');
    if (brand) brand.textContent = `v0.14-Q1 · 3 healthy recoveries · WORDS quarantined`;
    const topRoutes = document.getElementById('topRoutes');
    if (topRoutes) topRoutes.textContent = String(total);

    const topstats = document.querySelector('.topstats');
    if (topstats && !topstats.querySelector('.full-body-count')) {
      topstats.insertAdjacentHTML('afterbegin', `<span class="pill full-body-count"><b id="topFullBodies">${full}</b> full bodies before integrity</span>`);
    } else {
      const count = document.getElementById('topFullBodies');
      if (count) count.textContent = String(full);
    }

    const lead = document.getElementById('sourcePassLead');
    if (lead) lead.textContent = `Q1 mounts three proved recovered bodies and preserves WORDS ARE DATA CONSTRAINERS as a named quarantine. Result: ${BASELINE_FULL} → ${full} full/canonical bodies before source-integrity; no synthetic seventeenth body.`;

    const heroProof = document.querySelector('.hero-proof');
    if (heroProof && !heroProof.querySelector('[data-v5-full]')) {
      heroProof.insertAdjacentHTML('afterbegin', `<div class="stat" data-v5-full><strong>${full}</strong><span>full bodies before integrity</span></div><div class="stat" data-v5-recovered><strong>3</strong><span>proved bodies recovered</span></div><div class="stat" data-v5-quarantined><strong>1</strong><span>WORDS carrier quarantined</span></div>`);
    }

    const proofGrid = document.querySelector('[data-view-panel="proof"] .proof-grid');
    if (proofGrid && !proofGrid.querySelector('[data-v5-proof]')) {
      proofGrid.insertAdjacentHTML('afterbegin', `<article class="card proof" data-v5-proof><h3>Three bodies mounted; one damaged carrier quarantined</h3><ul><li><b>Hit-Window Law v1.0</b> mounted from its complete OPEN_FIRST package.</li><li><b>BECOME A PROBABILITY</b> mounted from its complete polished Body-Participation package.</li><li><b>Estate-Wide Change–Continuation Spine</b> mounted from its frozen authoritative v1.0 body.</li><li><b>WORDS ARE DATA CONSTRAINERS</b> remains named and preserved, but its corrupt carrier is excluded until an exact source body is recovered.</li></ul><p class="full-body-recovery-note">Result: ${BASELINE_FULL} → ${full}. Census: ${BASELINE_ROUTES} → ${total}. Quarantine is not completion.</p></article>`);
    }
  }'''
    text = replace_function(text, "updateStaticCopy", static_copy)

    old_object = """      version: payload.version,
      recovered: EXPECTED_RECOVERIES,
      fullBodies: fullBodyCount(),
      censusRoutes: DATA.records.length,
      ids: payload.records.map((record) => record.id)"""
    new_object = """      version: payload.version,
      state: 'THREE_HEALTHY_ONE_QUARANTINED',
      recovered: EXPECTED_RECOVERIES,
      registeredRecoveries: REGISTERED_RECOVERIES,
      fullBodies: fullBodyCount(),
      censusRoutes: DATA.records.length,
      ids: payload.records.map((record) => record.id),
      quarantined: payload.quarantined"""
    text = replace_once(text, old_object, new_object, "v5 authority object")
    path.write_text(text, encoding="utf-8")


def patch_downstream() -> None:
    for path in DOWNSTREAM:
        text = path.read_text(encoding="utf-8")
        original = text
        text = text.replace("FULL=17", "FULL=16")
        text = text.replace("fullBodies:17", "fullBodies:16")
        text = text.replace("17 full/canonical bodies", "16 full/canonical bodies before source-integrity")
        text = text.replace("17 full bodies", "16 full bodies before source-integrity")
        text = text.replace("17-Body Source Library", "16-Body Pre-Integrity Library")
        text = text.replace("17-body Source Library", "16-body pre-integrity library")
        text = text.replace("the 17 full/canonical bodies", "the 16 full/canonical bodies before source-integrity")
        text = text.replace("inflating the 17", "inflating the 16")
        if text == original:
            raise RuntimeError(f"No Q1 full-count transformation applied to {path.relative_to(ROOT)}")
        if "FULL=17" in text or "fullBodies:17" in text:
            raise RuntimeError(f"Stale 17-body executable gate remains in {path.relative_to(ROOT)}")
        path.write_text(text, encoding="utf-8")


def verify() -> dict[str, Any]:
    v3 = V3.read_text(encoding="utf-8")
    v4 = V4.read_text(encoding="utf-8")
    v5 = V5.read_text(encoding="utf-8")
    checks = {
        "v3_executes_26": "EXPECTED_HEALTHY_TOTAL = 26" in v3,
        "v3_quarantines_94": "quarantinedV1: EXPECTED_V1_QUARANTINED" in v3,
        "v3_excludes_v1_fetch": "fetchText(V1_URL)" not in v3,
        "v4_inherits_v3": "window.JMTheorySourceGraftV3.sourceBacked" in v4,
        "v4_quarantines_94": "quarantinedV1: QUARANTINED_V1" in v4,
        "v5_executes_3": "EXPECTED_RECOVERIES = 3" in v5,
        "v5_quarantines_words": "CARRIER_CORRUPT_SOURCE_UNRETRIEVED" in v5,
        "v5_no_synthetic_17": "no synthetic seventeenth body" in v5,
        "downstream_16": all(
            "FULL=17" not in path.read_text(encoding="utf-8")
            and "fullBodies:17" not in path.read_text(encoding="utf-8")
            for path in DOWNSTREAM
        ),
        "theovertime_receipt": False,
    }
    theo_path = ROOT / "registry/theovertime-record-10-source-restoration-wave01.json"
    if theo_path.exists():
        theo = json.loads(theo_path.read_text(encoding="utf-8"))
        checks["theovertime_receipt"] = (
            theo.get("status") == EXPECTED_THEOVERTIME_STATUS
            and theo.get("record_after", {}).get("body_characters", 0) >= 993
            and theo.get("payload", {}).get("unchanged_non_target_records") == 296
        )
    if not all(checks.values()):
        raise RuntimeError(f"Q1 static verification failed: {checks}")
    return checks


def main() -> None:
    paths = [V3, V4, V5, *DOWNSTREAM]
    before = {str(path.relative_to(ROOT)): file_state(path) for path in paths}

    patch_v3()
    patch_v4()
    patch_v5()
    patch_downstream()
    checks = verify()

    after = {str(path.relative_to(ROOT)): file_state(path) for path in paths}
    changed = [name for name in before if before[name]["sha256"] != after[name]["sha256"]]
    expected_changed = [str(path.relative_to(ROOT)) for path in paths]
    if changed != expected_changed:
        raise RuntimeError(f"Changed file set mismatch: {changed} != {expected_changed}")

    receipt = {
        "schema": "JM.TheoryRuntimeQuarantineQ1SourceReceipt/1.0",
        "status": "SOURCE_TRANSFORMATION_PASS_LIVE_PROOF_PENDING",
        "recorded_utc": datetime.now(timezone.utc).isoformat(),
        "adapter": "JM Theory Runtime Continuity Adapter Q1",
        "authority": "JM Theory Multihub v0.20.1 source/data authority preserved",
        "source_state": {
            "base_routes": 297,
            "healthy_graft_v2": HEALTHY_GRAFT_V2,
            "healthy_graft_memory": HEALTHY_GRAFT_MEMORY,
            "quarantined_graft_v1": QUARANTINED_GRAFT_RECORDS,
            "v4_contacts": V4_CONTACTS,
            "healthy_recovered_bodies": HEALTHY_RECOVERIES,
            "quarantined_body": QUARANTINED_BODY_ID,
            "pre_integrity_full_bodies": PRE_INTEGRITY_FULL,
            "post_integrity_full_bodies_expected": POST_INTEGRITY_FULL,
            "theovertime_record_10": "EXACT_GMAIL_SOURCE_RESTORED",
        },
        "checks": checks,
        "changed_files": changed,
        "before": before,
        "after": after,
        "identity_merges": 0,
        "whole_estate_ding": "OPEN",
        "laws": [
            "QUARANTINE IS NOT COMPLETION.",
            "A HEALTHY DESCENDANT MAY CONTINUE WITHOUT COUNTERFEITING ITS DAMAGED ANCESTOR.",
            "ACTUAL COUNTS FLOW FORWARD; HISTORICAL COUNTS DO NOT OVERRULE RUNTIME TRUTH.",
            "NO RIVAL HEAD.",
        ],
    }
    RECEIPT.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
