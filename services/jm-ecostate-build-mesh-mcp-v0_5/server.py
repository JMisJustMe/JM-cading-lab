#!/usr/bin/env python3
import json
import hashlib
import os
import re
import sys
import time
import urllib.request
import urllib.error
from difflib import SequenceMatcher
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
from capabilities import CAPABILITY_PROFILES, PROFILE_BY_ID

VERSION = "0.8.1"
SERVER_NAME = "JM ECOSTATE Build Mesh Native MCP"
NAVIGATOR_MCP = os.environ.get(
    "JM_NAVIGATOR_MCP",
    "https://navigator-plugin-public.jm-inline-contact-probe.pages.dev/mcp",
)
SUPPORTED_PROTOCOLS = {"2025-06-18", "2025-03-26"}
DEFAULT_PROTOCOL = "2025-06-18"
NAV_CACHE_TTL = int(os.environ.get("JM_NAV_CACHE_TTL", "300"))
NAV_CACHE = {}
SERVICE_DIR = os.path.dirname(os.path.abspath(__file__))
CURRENT_REGISTRY_PATH = os.environ.get(
    "JM_CURRENT_REGISTRY_PATH",
    os.path.join(SERVICE_DIR, "current_registry.json"),
)

def load_current_registry(path):
    with open(path, "rb") as f:
        raw = f.read()
    try:
        data = json.loads(raw.decode("utf-8"))
    except Exception as exc:
        raise RuntimeError(f"Current registry is not valid UTF-8 JSON: {exc}") from exc
    if not isinstance(data, dict):
        raise RuntimeError("Current registry root must be an object")
    schema = str(data.get("schema") or "").strip()
    date = str(data.get("date") or "").strip()
    body = str(data.get("body") or "").strip()
    records = data.get("records")
    if not schema.startswith("JM.CareerCurrentProjectRegistry/"):
        raise RuntimeError(f"Unexpected current registry schema: {schema!r}")
    if not date or not body:
        raise RuntimeError("Current registry date/body must be non-empty")
    if not isinstance(records, list) or not records:
        raise RuntimeError("Current registry records must be a non-empty array")
    ids = []
    required = ("id", "title", "status", "summary", "proof", "boundary")
    for idx, item in enumerate(records):
        if not isinstance(item, dict):
            raise RuntimeError(f"Current registry record {idx} must be an object")
        missing = [key for key in required if not str(item.get(key) or "").strip()]
        if missing:
            raise RuntimeError(f"Current registry record {idx} missing required fields: {missing}")
        ids.append(item["id"])
    if len(ids) != len(set(ids)):
        raise RuntimeError("Current registry record ids must be unique")
    return {
        "schema": schema,
        "date": date,
        "body": body,
        "records": records,
        "sha256": hashlib.sha256(raw).hexdigest(),
        "bytes": len(raw),
        "source": os.path.basename(path),
        "path_mode": "ENV_OVERRIDE" if os.environ.get("JM_CURRENT_REGISTRY_PATH") else "SERVICE_LOCAL",
        "hash_mode": "SHA256_EXACT_LOADED_BYTES",
        "reload_policy": "PROCESS_START",
    }

CURRENT_REGISTRY = load_current_registry(CURRENT_REGISTRY_PATH)
CURRENT_REGISTRY_SCHEMA = CURRENT_REGISTRY["schema"]
CURRENT_REGISTRY_DATE = CURRENT_REGISTRY["date"]
CURRENT_REGISTRY_BODY = CURRENT_REGISTRY["body"]
CURRENT_REGISTRY_SHA256 = CURRENT_REGISTRY["sha256"]
CURRENT_REGISTRY_BYTES = CURRENT_REGISTRY["bytes"]
CURRENT_REGISTRY_SOURCE = CURRENT_REGISTRY["source"]
CURRENT_REGISTRY_PATH_MODE = CURRENT_REGISTRY["path_mode"]
CURRENT_REGISTRY_HASH_MODE = CURRENT_REGISTRY["hash_mode"]
CURRENT_REGISTRY_RELOAD_POLICY = CURRENT_REGISTRY["reload_policy"]
CURRENT = CURRENT_REGISTRY["records"]

OVERLAY = [{"name":"FTR — The Massive Push / One Reality, Many Cuts — Series Master v1.0","summary":"32/32 issues and 704/704 functional comic pages complete; frozen functional comic route; final bespoke illustration, lettering and print finishing remain descendant work","section":"Comics / visual story"},{"name":"JMISJUSTME","summary":"JM ECOSTATE Professional Convergence v2.0","section":"Estate / public / device"},{"name":"JM Living Estate v1.3.0 Universal APK (API 36 rail)","summary":"","section":"Estate / public / device"},{"name":"Android Forge v1.4.1","summary":"dual-surface workshop / Project Shelf / OneBody route","section":"Estate / public / device"},{"name":"JM AUTHUSER","summary":"Hawk-Read Successor v1.1 conceptual successor; preserve creator/source-purpose lineage","section":"Estate / public / device"},{"name":"JM32-1DA compiler v2.2.1","summary":"","section":"Coding / runtime / OS"},{"name":"RouteOS Kernel Gate","summary":"PASS at proved scope","section":"Coding / runtime / OS"},{"name":"Zionfolder OS v0.5.1","summary":"","section":"Coding / runtime / OS"},{"name":"CadenVM v0.10","summary":"","section":"Coding / runtime / OS"},{"name":"JM RouteCore","summary":"BIOS/QEMU emulator-scope execution contact earned; physical-device proof not implied","section":"Coding / runtime / OS"},{"name":"JM32-1DA Cross-Device Runtime Adapter v0.2 complete at declared scope","summary":"","section":"Coding / runtime / OS"},{"name":"Coding Growth Mesh Programme","summary":"64/64 bodies; Generation 9 floor; 24,481 assertions PASS","section":"Coding / runtime / OS"},{"name":"PLAYFORM, JM GameCore, GameForge, GlyphPlay, GlyphForge, Kading Engine, JumpMotion v0.2","summary":"donor/runtime family","section":"Games / engines / interaction"},{"name":"JM Target Bridge v0.6","summary":"JM.TargetBridge/0.1; faces include GDevelop, Unity, Unreal, Godot, Phaser, Construct3, GameMaker, Defold, Bevy, MonoGame","section":"Games / engines / interaction"},{"name":"Western Sniper × House Siege executable v0.2 release descendant; standing executable flagship lane","summary":"","section":"Games / engines / interaction"},{"name":"FOURFOLD and Fight Clash executable descendants","summary":"","section":"Games / engines / interaction"},{"name":"SHIFT//FIELD active mutable-interaction lane; inherit existing donors before user mega-check","summary":"","section":"Games / engines / interaction"},{"name":"JM LLM Core v1.0 First Complete Edition protected complete ancestor","summary":"","section":"AI"},{"name":"JM LLM #2 v2.0 Unified Executable Program Edition","summary":"FLAZ complete, package-proven, Zionfoldered; current pointer dated 29 Sep 2026","section":"AI"},{"name":"JM AGI Lab v1.4.4 Durability Settle / Live Integration","summary":"owner Windows Edge exact-body process-restart durability scope; no AGI/human-level claim","section":"AI"},{"name":"JM LEGAL Matter Router Workbench v0.8.2","summary":"owner-device contact verified, current internal runtime head","section":"Legal / business"},{"name":"JM LEGAL Pre-External Pilot Operating Gate v1.1","summary":"Phase A ready; external operating contact open","section":"Legal / business"},{"name":"RUKQUSS REALITY Business Formation Decision v1.0","summary":"formation architecture closed; actual Companies House incorporation open","section":"Legal / business"},{"name":"Secrets of Silence Flagship Master v1.3","summary":"","section":"Writing / music / publishing"},{"name":"LyricStudio v0.4 BT","summary":"","section":"Writing / music / publishing"},{"name":"JM Release Run","summary":"Music Keeps the Mic FLAZ parent with live return-contact addendum","section":"Writing / music / publishing"},{"name":"Active lyric return lead: Wisdom’s Loading / SHIMS ACTION → Broke Broke → I Need A Good Time Vibe","summary":"","section":"Writing / music / publishing"},{"name":"JM Theory Estate First + Second-Order Strengthening","summary":"51/51 strict bodies; 7/7 first-order and 7/7 second-order at recorded scope","section":"Theory / human systems / research"},{"name":"JM ECOSTATE Social Economy Study v1.0","summary":"10/10 runs + claim audit complete","section":"Theory / human systems / research"},{"name":"JM Teaching / Learning Engine v5.2","summary":"","section":"Theory / human systems / research"},{"name":"HPC, Human Support Body Self, TheOverTime","summary":"BT/FLAZ at proved scopes","section":"Theory / human systems / research"},{"name":"PASSTACITIVITY","summary":"active shell → passive core","section":"Theory / human systems / research"},{"name":"ZooGate / JickMah","summary":"128-page theory edition; Twokniver 1 theory active; app lane parked","section":"Theory / human systems / research"},{"name":"JM CLOUD CONTACT SERVER public lineage; first public cloud Ding closed at v0.4.2 in recovered evidence","summary":"","section":"Cloud / contact"},{"name":"PHONE↔LAPTOP CONTACT RUNNER lineage","summary":"","section":"Cloud / contact"},{"name":"Cloud Bridge lineage","summary":"","section":"Cloud / contact"},{"name":"JM LIETOUCH P1B Separated-Device Semantic Ding v1.0 release-completed receipt preserved","summary":"","section":"Cloud / contact"},{"name":"JM3232 Navigator public-safe MCP donor","summary":"historically live-proven five-tool read-only public scope","section":"Cloud / contact"},{"name":"Bounded anti-crash census","summary":"BATCH → COUNT → CHECKPOINT → NEXT BATCH → TERMINAL CURSOR → CLOSE","section":"Storage / recovery"},{"name":"Permanent floor: BODY / IDENTITY RAIL ↔ CARRIER / BYTE RAIL","summary":"","section":"Storage / recovery"},{"name":"Retention","summary":"BYTE SIZE + FUNCTION + UNIQUENESS + RECOVERABILITY + CURRENT USE + DESCENDANT VIABILITY","section":"Storage / recovery"},{"name":"STORAGE COST MUST EARN RETRIEVAL VALUE","summary":"","section":"Storage / recovery"}];

ARTIFACT_SURFACE_PROFILES = {
    "book": {
        "label": "BOOK",
        "aliases": ["books", "written", "publication", "manuscript"],
        "default_outputs": ["docx", "pdf", "epub", "web"],
        "build_gate": "Render the recovered current body into requested publication formats without changing source identity.",
        "proof_gate": "Open/parse each output, verify page/chapter order, text integrity, metadata/version identity and declared visual quality.",
        "delivery_gate": "Seat only verified outputs; direct open/download routes must resolve to the intended edition.",
        "surface_boundary": "A valid DOCX/PDF/EPUB/web edition proves only that surface; one format does not silently prove the others.",
    },
    "comic": {
        "label": "COMIC",
        "aliases": ["comics", "cartoon", "visual story", "graphic"],
        "default_outputs": ["pdf", "cbz", "web-reader"],
        "build_gate": "Render the recovered visual-story body with page/panel order, assets and reading direction preserved.",
        "proof_gate": "Verify every page asset, order, crop, text legibility and reader navigation at the claimed surface.",
        "delivery_gate": "Seat verified PDF/CBZ/web-reader descendants with direct open/download routes.",
        "surface_boundary": "Static PDF/CBZ proof does not imply web-reader animation/runtime proof, and vice versa.",
    },
    "theory": {
        "label": "THEORY",
        "aliases": ["theories", "research", "paper", "model"],
        "default_outputs": ["md", "pdf", "html"],
        "build_gate": "Preserve source wording, claim boundaries, references, provenance and version while rendering publication descendants.",
        "proof_gate": "Check section completeness, citation/reference integrity, claim-boundary preservation and rendered readability.",
        "delivery_gate": "Publish only the intended public-safe edition; retain source/current/archival distinction.",
        "surface_boundary": "Publication integrity is not external scientific validation.",
    },
    "app": {
        "label": "APP",
        "aliases": ["apps", "application", "web app", "tool"],
        "default_outputs": ["web", "package"],
        "build_gate": "Build from the recovered current source/runtime using the declared host/profile rather than reconstructing from screenshots or descriptions.",
        "proof_gate": "Launch, exercise primary controls/state/recovery, and verify the actual runtime surface named in the claim.",
        "delivery_gate": "Seat a direct-open app/package route only after runtime contact passes.",
        "surface_boundary": "Browser, hosted, desktop, offline and Android behavior remain separate proof jurisdictions.",
    },
    "apk": {
        "label": "APK",
        "aliases": ["android", "android app", "apk file"],
        "default_outputs": ["apk", "direct-download-link"],
        "build_gate": "Build the recovered app body through the Android route with declared SDK/signing/package identity.",
        "proof_gate": "Verify package identity and build output; install/launch/device contact is required for an install/runtime claim.",
        "delivery_gate": "Seat the verified APK plus a direct download/install route whose bytes match the intended artifact.",
        "surface_boundary": "APK build PASS ≠ install PASS ≠ launch/runtime PASS.",
    },
    "download": {
        "label": "DOWNLOAD / ADDABLE ROUTE",
        "aliases": ["downloadable", "download link", "direct link", "addable", "install link", "public link"],
        "default_outputs": ["manifest", "sha256", "direct-download-link"],
        "build_gate": "Bind an already-governed artifact to a manifest/hash and intended public or private delivery seat.",
        "proof_gate": "Resolve the route, retrieve the intended bytes/body, compare identity/hash where available, then reopen/install at the claimed level.",
        "delivery_gate": "Return a direct route only after read-back proves it points to the intended current artifact.",
        "surface_boundary": "A URL existing is not proof that it delivers the correct bytes, remains available, or installs/opens successfully.",
    },
}

ARTIFACT_TYPE_ALIASES = {
    alias: key
    for key, profile in ARTIFACT_SURFACE_PROFILES.items()
    for alias in [key, profile["label"].casefold(), *(profile.get("aliases") or [])]
}

def norm(value):
    value = (value or "").casefold()
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())

def similarity(query, text):
    q, t = norm(query), norm(text)
    if not q or not t:
        return 0.0
    if q == t:
        return 1.0
    if q in t:
        return min(0.98, 0.80 + 0.18 * len(q) / max(len(t), 1))
    qt, tt = set(q.split()), set(t.split())
    overlap = len(qt & tt) / max(len(qt), 1)
    return round(0.62 * overlap + 0.38 * SequenceMatcher(None, q, t).ratio(), 6)

def current_matches(query, limit=8):
    found = []
    for item in CURRENT:
        title = item["title"]
        hay = " ".join([title, item["id"], item["status"], item["summary"]])
        s = max(similarity(query, title), 0.82 * similarity(query, hay))
        if s >= 0.28:
            found.append({"source": "current_project_registry", "score": round(min(1.0, s + 0.015), 6), **item})
    for item in OVERLAY:
        hay = " ".join([item["name"], item["summary"], item["section"]])
        s = max(similarity(query, item["name"]), 0.80 * similarity(query, hay))
        if s >= 0.30:
            found.append({"source": "current_overlay_2026-10-01", "score": round(s, 6), **item})
    found.sort(key=lambda x: (x["score"], 1 if x["source"] == "current_project_registry" else 0), reverse=True)
    return found[:max(1, min(int(limit), 25))]

def identity_strength(query, identity):
    q, i = norm(query), norm(identity)
    if not q or not i:
        return 0.0
    if q == i:
        return 1.0
    if len(q.split()) >= 2 and (q.startswith(i + " ") or i.startswith(q + " ")):
        return 0.99
    return 0.0

def current_identity_matches(query, limit=8):
    """Authority-safe current matches.

    Fuzzy similarity remains available through current_matches() for discovery.
    This function is intentionally identity-only so discovery resemblance can
    never become current-head authority.
    """
    found = []
    for item in CURRENT:
        identities = [item.get("id", ""), item.get("title", "")]
        identities += item.get("aliases") or []
        score = max((identity_strength(query, value) for value in identities), default=0.0)
        if score:
            found.append({
                "source": "current_project_registry",
                "score": score,
                "match_mode": "EXACT_IDENTITY" if score == 1.0 else "IDENTITY_PREFIX",
                **item,
            })
    for item in OVERLAY:
        identities = [item.get("name", "")]
        identities += item.get("aliases") or []
        score = max((identity_strength(query, value) for value in identities), default=0.0)
        if score:
            found.append({
                "source": "current_overlay_2026-10-01",
                "score": score,
                "match_mode": "EXACT_IDENTITY" if score == 1.0 else "IDENTITY_PREFIX",
                **item,
            })
    found.sort(
        key=lambda x: (x["score"], 1 if x["source"] == "current_project_registry" else 0),
        reverse=True,
    )
    return found[:max(1, min(int(limit), 25))]

def authority_state(item):
    if not item:
        return "ABSENCE_NOT_PROVEN"
    status = (item.get("status") or item.get("summary") or "").upper()
    if "CANDIDATE" in status:
        return "CURRENT_CANDIDATE"
    return "CURRENT_DECLARED"

def navigator_rpc(tool_name, arguments=None, timeout=8, use_cache=True):
    arguments = arguments or {}
    cache_key = json.dumps([tool_name, arguments], sort_keys=True, ensure_ascii=False)
    if use_cache:
        cached = NAV_CACHE.get(cache_key)
        if cached and (time.time() - cached[0]) < NAV_CACHE_TTL:
            out = dict(cached[1])
            out["cache"] = "HIT"
            return out
    payload = {
        "jsonrpc": "2.0",
        "id": 77,
        "method": "tools/call",
        "params": {"name": tool_name, "arguments": arguments or {}},
    }
    req = urllib.request.Request(
        NAVIGATOR_MCP,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Origin": "https://chatgpt.com",
            "User-Agent": "JM-ECOSTATE-Build-Mesh/0.8.1 (+https://jmisjustme-estate.pages.dev/)",
            "MCP-Protocol-Version": DEFAULT_PROTOCOL,
        },
        method="POST",
    )
    last_error = None
    for attempt in range(2):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                body = json.loads(response.read().decode("utf-8"))
            if "error" in body:
                out = {"ok": False, "state": "HOLD", "error": body["error"]}
                return out
            result = body.get("result") or {}
            if result.get("isError"):
                return {"ok": False, "state": "HOLD", "error": result}
            data = result.get("structuredContent")
            if data is None:
                content = result.get("content") or []
                for block in content:
                    if block.get("type") == "text":
                        try:
                            data = json.loads(block.get("text", ""))
                        except Exception:
                            data = {"text": block.get("text", "")}
                        break
            out = {"ok": True, "state": "PASS", "data": data, "cache": "MISS"}
            if use_cache:
                NAV_CACHE[cache_key] = (time.time(), out)
            return out
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code in (429, 500, 502, 503, 504) and attempt == 0:
                time.sleep(0.25)
                continue
            break
        except Exception as exc:
            last_error = exc
            if attempt == 0:
                time.sleep(0.15)
                continue
            break
    return {"ok": False, "state": "HOLD", "error": f"{type(last_error).__name__}: {last_error}"}

def navigator_search(query, limit=8):
    return navigator_rpc("search", {"query": query, "limit": max(1, min(int(limit), 25))})

def meaningful_navigator_results(contact, minimum_score=40):
    if not contact.get("ok"):
        return []
    results = (contact.get("data") or {}).get("results") or []
    return [r for r in results if float(r.get("score") or 0) >= float(minimum_score)]

def search_builds(args):
    query = (args.get("query") or "").strip()
    if not query:
        raise ValueError("query is required")
    limit = int(args.get("limit") or 8)
    local = current_matches(query, limit)
    nav = navigator_search(query, limit)
    return {
        "query": query,
        "current": local,
        "navigator": nav,
        "authority_note": "Search presence is discovery, not proof or current-head authority.",
    }

def recover_build(args):
    query = (args.get("name") or args.get("query") or "").strip()
    if not query:
        raise ValueError("name or query is required")
    limit = int(args.get("limit") or 8)
    discovery = current_matches(query, limit)
    authority = current_identity_matches(query, limit)
    nav = navigator_search(query, limit)
    best = authority[0] if authority else None
    state = authority_state(best)
    public_matches = meaningful_navigator_results(nav)
    if not best and public_matches:
        state = "SNAPSHOT_ONLY"
    if not best and not public_matches:
        state = "ABSENCE_NOT_PROVEN"
    return {
        "query": query,
        "resolution_state": state,
        "resolution_basis": "LOCAL_IDENTITY" if best else ("NAVIGATOR_SNAPSHOT" if public_matches else "NO_AUTHORITY_MATCH"),
        "best_current_match": best,
        "authority_candidates": authority,
        "current_candidates": discovery,
        "navigator_contact": nav,
        "claim_boundary": "Fuzzy discovery is not current-head authority. Private/current Library pointers and direct runtime/owner receipts can outrank this hosted service.",
    }

def resolve_current_head(args):
    query = (args.get("name") or "").strip()
    if not query:
        raise ValueError("name is required")
    authority = current_identity_matches(query, 10)
    if authority:
        best = authority[0]
        # Current-registry authority is the explicit current declaration and
        # therefore outranks a stale snapshot overlay at the same identity
        # strength. Ambiguity within the same authority tier still fails closed.
        best_tier = 1 if best.get("source") == "current_project_registry" else 0
        close = [
            x for x in authority[1:]
            if x["score"] == best["score"]
            and (1 if x.get("source") == "current_project_registry" else 0) == best_tier
            and norm(x.get("title") or x.get("name")) != norm(best.get("title") or best.get("name"))
        ]
        state = authority_state(best)
        if close:
            state = "CONFLICT_OPEN"
        return {
            "query": query,
            "state": state,
            "current_head": best.get("title") or best.get("name"),
            "primary_evidence": best,
            "competing_candidates": close[:4],
            "resolution_basis": "LOCAL_IDENTITY",
            "boundary": "Hosted current authority requires identity contact; fuzzy similarity remains discovery-only. Stronger direct current pointer/receipt can supersede it.",
        }
    nav = navigator_search(query, 5)
    public_matches = meaningful_navigator_results(nav)
    discovery = current_matches(query, 5)
    has_public = bool(public_matches)
    return {
        "query": query,
        "state": "SNAPSHOT_ONLY" if has_public else "ABSENCE_NOT_PROVEN",
        "current_head": None,
        "public_evidence": nav,
        "meaningful_public_matches": public_matches,
        "local_discovery_candidates": discovery,
        "resolution_basis": "NAVIGATOR_SNAPSHOT" if has_public else "NO_AUTHORITY_MATCH",
        "boundary": "No hosted identity-level current declaration found. Fuzzy local resemblance is discovery only; absence is not proved across the private Estate.",
    }

def proof_state(args):
    query = (args.get("name") or "").strip()
    if not query:
        raise ValueError("name is required")
    authority = current_identity_matches(query, 8)
    if authority:
        item = authority[0]
        return {
            "query": query,
            "state": authority_state(item),
            "body": item.get("title") or item.get("name"),
            "status": item.get("status"),
            "proof": item.get("proof"),
            "boundary": item.get("boundary") or item.get("summary"),
            "source": item["source"],
            "resolution_basis": "LOCAL_IDENTITY",
            "note": "Recorded proof text is not a new runtime Ding.",
        }
    nav = navigator_search(query, 5)
    public_matches = meaningful_navigator_results(nav)
    return {
        "query": query,
        "state": "SNAPSHOT_ONLY" if public_matches else "ABSENCE_NOT_PROVEN",
        "navigator_contact": nav,
        "meaningful_public_matches": public_matches,
        "local_discovery_candidates": current_matches(query, 5),
        "resolution_basis": "NAVIGATOR_SNAPSHOT" if public_matches else "NO_AUTHORITY_MATCH",
        "note": "Public source discovery and fuzzy local similarity do not themselves prove runtime/current authority.",
    }

def trace_lineage(args):
    query = (args.get("name") or "").strip()
    if not query:
        raise ValueError("name is required")
    search = navigator_search(query, int(args.get("limit") or 8))
    if not search.get("ok"):
        return {"query": query, "state": "HOLD", "navigator_contact": search}
    results = meaningful_navigator_results(search)
    if not results:
        return {"query": query, "state": "ABSENCE_NOT_PROVEN", "matches": []}
    lineages = []
    for item in results[: min(3, len(results))]:
        record_id = item.get("id")
        if not record_id:
            continue
        lr = navigator_rpc("navigator_return_lineage", {"id": record_id})
        lineages.append({"search_result": item, "lineage": lr})
    return {
        "query": query,
        "state": "PUBLIC_LINEAGE_CONTACT",
        "matches": lineages,
        "boundary": "Navigator is a public-safe donor. Private lineage/current pointers may be deeper or newer.",
    }

def continue_build_plan(args):
    query = (args.get("name") or "").strip()
    objective = (args.get("objective") or "").strip()
    if not query:
        raise ValueError("name is required")
    authority = resolve_current_head({"name": query})
    proof = proof_state({"name": query})
    return {
        "query": query,
        "objective": objective or None,
        "authority": authority,
        "proof_state": proof,
        "route": [
            "RECOVER BEST PROVEN STATE",
            "INHERIT CAPABILITY",
            "PRESERVE EARNED CAPABILITY",
            "ADD DIFFERENCE",
            "CONTACT",
            "OBSERVE / CORRECT / VERIFY",
            "CROWN ONLY IF EARNED",
            "TRACE",
            "PRESERVE / RE-ENTRY",
        ],
        "next_action": "Use the recovered head as parent, choose the smallest meaningful delta toward the objective, and test at the same level as the claim.",
        "mutation_performed": False,
    }


def profile_score(query, profile):
    parts = [profile.get("name",""), profile.get("domain","")]
    parts += profile.get("capabilities") or []
    parts += profile.get("donor_roles") or []
    scores = [similarity(query, part) for part in parts if part]
    return max(scores or [0.0])

def resolve_profile(name):
    q = (name or "").strip()
    if not q:
        return None

    identity_hits = []
    for profile in CAPABILITY_PROFILES:
        identities = [profile.get("id",""), profile.get("name","")]
        identities += profile.get("aliases") or []
        for item in CURRENT:
            if item.get("id") == profile.get("id"):
                identities.append(item.get("title",""))
        best = max((identity_strength(q, identity) for identity in identities), default=0.0)
        if best:
            identity_hits.append((best, profile))

    if not identity_hits:
        return None

    identity_hits.sort(key=lambda x: x[0], reverse=True)
    top_score = identity_hits[0][0]
    top_profiles = {}
    for score, profile in identity_hits:
        if score != top_score:
            break
        top_profiles[profile.get("id")] = profile

    # Multiple equally strong named identities are a HOLD, never an arbitrary
    # capability crown.
    if len(top_profiles) != 1:
        return None

    profile = next(iter(top_profiles.values()))
    return {"score": round(top_score, 6), "resolution": "IDENTITY", **profile}

def current_record_for_profile(profile):
    pid = (profile or {}).get("id")
    for item in CURRENT:
        if item.get("id") == pid:
            return item
    return None

def donor_view(profile, score=None):
    record = current_record_for_profile(profile)
    return {
        "id": profile.get("id"),
        "name": profile.get("name"),
        "domain": profile.get("domain"),
        "capabilities": profile.get("capabilities") or [],
        "donor_roles": profile.get("donor_roles") or [],
        "open_frontiers": profile.get("open_frontiers") or [],
        "profile_source": profile.get("source"),
        "score": round(score, 6) if score is not None else None,
        "authority": authority_state(record) if record else "DECLARED_CAPABILITY_CUE",
        "proof": record.get("proof") if record else None,
        "boundary": record.get("boundary") if record else "Capability cue from current overlay; direct donor contact is required before capability inheritance is crowned.",
    }

def batch_recover_builds(args):
    names = args.get("names") or []
    if not isinstance(names, list) or not names or len(names) > 20:
        raise ValueError("names must be an array of 1..20 build names")
    results = []
    for raw in names:
        name = str(raw).strip()
        if not name:
            continue
        authority = current_identity_matches(name, 5)
        if authority:
            best = authority[0]
            results.append({
                "query": name,
                "state": authority_state(best),
                "current_head": best.get("title") or best.get("name"),
                "proof": best.get("proof"),
                "boundary": best.get("boundary") or best.get("summary"),
                "source": best.get("source"),
                "resolution_basis": "LOCAL_IDENTITY",
                "navigator_contact": "SKIPPED_LOCAL_IDENTITY_AUTHORITY_FOUND",
            })
        else:
            results.append(recover_build({"name": name, "limit": 5}))
    return {
        "count": len(results),
        "results": results,
        "optimization": "Identity-level local authority is resolved before public donor contact; fuzzy discovery never suppresses Navigator recovery.",
    }

def find_capability_donors(args):
    objective = (args.get("objective") or "").strip()
    target_name = (args.get("target") or "").strip()
    limit = max(1, min(int(args.get("limit") or 8), 15))
    if not objective:
        raise ValueError("objective is required")
    target = resolve_profile(target_name) if target_name else None
    ranked = []
    for profile in CAPABILITY_PROFILES:
        if target and profile.get("id") == target.get("id"):
            continue
        score = profile_score(objective, profile)
        if score >= 0.28:
            ranked.append((score, profile))
    ranked.sort(key=lambda x: x[0], reverse=True)
    donors = [donor_view(p, score) for score, p in ranked[:limit]]
    return {
        "objective": objective,
        "target": target,
        "donors": donors,
        "boundary": "Donor ranking is capability relevance, not proof transfer. Contact the donor body/receipt before inheriting a capability claim.",
    }

def compare_builds(args):
    names = args.get("builds") or []
    if not isinstance(names, list) or len(names) < 2 or len(names) > 8:
        raise ValueError("builds must contain 2..8 names")
    resolved = []
    for raw in names:
        p = resolve_profile(str(raw))
        if not p:
            resolved.append({"query": str(raw), "state": "ABSENCE_NOT_PROVEN"})
            continue
        record = current_record_for_profile(p)
        resolved.append({
            "query": str(raw),
            "state": authority_state(record) if record else "DECLARED_CAPABILITY_CUE",
            "profile": donor_view(p),
        })
    cap_sets = [
        set(x["profile"]["capabilities"])
        for x in resolved if x.get("profile")
    ]
    shared = sorted(set.intersection(*cap_sets)) if len(cap_sets) >= 2 else []
    unique = {}
    for x in resolved:
        if not x.get("profile"):
            continue
        mine = set(x["profile"]["capabilities"])
        others = set().union(*[
            set(y["profile"]["capabilities"])
            for y in resolved if y is not x and y.get("profile")
        ])
        unique[x["profile"]["name"]] = sorted(mine - others)
    return {
        "builds": resolved,
        "shared_capabilities": shared,
        "unique_capabilities": unique,
        "boundary": "Capability comparison does not merge bodies or transfer proof jurisdiction.",
    }

def build_capability_mesh(args):
    names = args.get("builds") or []
    objective = (args.get("objective") or "").strip()
    max_nodes = max(2, min(int(args.get("max_nodes") or 10), 20))
    nodes = []
    if names:
        if not isinstance(names, list) or len(names) > 12:
            raise ValueError("builds must contain at most 12 names")
        for raw in names:
            p = resolve_profile(str(raw))
            if p and all(n.get("id") != p.get("id") for n in nodes):
                nodes.append(p)
    elif objective:
        ranked = sorted(
            ((profile_score(objective, p), p) for p in CAPABILITY_PROFILES),
            key=lambda x: x[0],
            reverse=True,
        )
        nodes = [{**p, "objective_score": round(score,6)} for score,p in ranked if score >= 0.25][:max_nodes]
    else:
        raise ValueError("provide builds or objective")
    nodes = nodes[:max_nodes]
    edges = []
    for i, a in enumerate(nodes):
        ac = set(a.get("capabilities") or [])
        for b in nodes[i+1:]:
            shared = sorted(ac & set(b.get("capabilities") or []))
            if shared:
                edges.append({
                    "from": a.get("id"),
                    "to": b.get("id"),
                    "relation": "SHARED_CAPABILITY",
                    "shared_capabilities": shared,
                    "merge": False,
                    "proof_transfer": False,
                })
            else:
                role_overlap = sorted(set(a.get("donor_roles") or []) & set(b.get("donor_roles") or []))
                if role_overlap:
                    edges.append({
                        "from": a.get("id"),
                        "to": b.get("id"),
                        "relation": "SHARED_DONOR_ROLE",
                        "shared_roles": role_overlap,
                        "merge": False,
                        "proof_transfer": False,
                    })

    # Explicit current-registry relations are valid mesh edges even when two
    # bodies intentionally do not share a capability label. Relation edges
    # preserve direction and never transfer proof or merge identity.
    existing_relation_keys = set()
    for edge in edges:
        existing_relation_keys.add((edge.get("from"), edge.get("to"), edge.get("relation"), edge.get("declared_relation")))

    for source in nodes:
        record = current_record_for_profile(source) or {}
        for raw_relation in record.get("relations") or []:
            relation_name = None
            target_name = None
            if isinstance(raw_relation, dict):
                relation_name = str(raw_relation.get("relation") or "").strip()
                target_name = str(raw_relation.get("target") or "").strip()
            elif isinstance(raw_relation, str):
                if "→" in raw_relation:
                    relation_name, target_name = [part.strip() for part in raw_relation.split("→", 1)]
                elif "->" in raw_relation:
                    relation_name, target_name = [part.strip() for part in raw_relation.split("->", 1)]
            if not relation_name or not target_name:
                continue

            target = None
            best = 0.0
            for candidate in nodes:
                if candidate.get("id") == source.get("id"):
                    continue
                identities = [candidate.get("id",""), candidate.get("name","")]
                identities += candidate.get("aliases") or []
                candidate_record = current_record_for_profile(candidate) or {}
                identities += [candidate_record.get("title","")]
                score = max((identity_strength(target_name, identity) for identity in identities if identity), default=0.0)
                if score > best:
                    best = score
                    target = candidate
            if not target or best < 0.99:
                continue

            key = (source.get("id"), target.get("id"), "DECLARED_RELATION", relation_name)
            if key in existing_relation_keys:
                continue
            edges.append({
                "from": source.get("id"),
                "to": target.get("id"),
                "relation": "DECLARED_RELATION",
                "declared_relation": relation_name,
                "relation_source": "current_project_registry",
                "merge": False,
                "proof_transfer": False,
            })
            existing_relation_keys.add(key)

    return {
        "objective": objective or None,
        "nodes": [donor_view(n, n.get("objective_score")) for n in nodes],
        "edges": edges,
        "mesh_law": "EDGE ≠ MERGE. Edges may express shared capability/role or an explicit declared relation; no edge transfers proof or collapses identity.",
    }

def detect_propagation_gaps(args):
    target_name = (args.get("target") or "").strip()
    objective = (args.get("objective") or "").strip()
    limit = max(1, min(int(args.get("limit") or 6), 12))
    if not target_name:
        raise ValueError("target is required")
    target = resolve_profile(target_name)
    if not target:
        return {"target": target_name, "state": "ABSENCE_NOT_PROVEN", "gaps": []}
    target_caps = set(target.get("capabilities") or [])
    query = objective or " ".join(target.get("donor_roles") or target.get("capabilities") or [])
    ranked = []
    for donor in CAPABILITY_PROFILES:
        if donor.get("id") == target.get("id"):
            continue
        score = profile_score(query, donor)
        missing = [c for c in donor.get("capabilities") or [] if c not in target_caps]
        if score >= 0.25 and missing:
            ranked.append((score, donor, missing))
    ranked.sort(key=lambda x: x[0], reverse=True)
    gaps = []
    for score, donor, missing in ranked[:limit]:
        gaps.append({
            "donor": donor_view(donor, score),
            "candidate_capabilities": missing,
            "classification": "PROPAGATION_CANDIDATE_NOT_REQUIREMENT",
        })
    return {
        "target": donor_view(target),
        "objective": objective or None,
        "gaps": gaps,
        "boundary": "A propagation gap means a relevant capability exists elsewhere and is not declared on the target profile. It does not mean the target must inherit it.",
    }

def plan_capability_inheritance(args):
    target_name = (args.get("target") or "").strip()
    objective = (args.get("objective") or "").strip()
    max_donors = max(1, min(int(args.get("max_donors") or 4), 8))
    if not target_name or not objective:
        raise ValueError("target and objective are required")
    gaps = detect_propagation_gaps({"target": target_name, "objective": objective, "limit": max_donors})
    if gaps.get("state") == "ABSENCE_NOT_PROVEN":
        return {**gaps, "mutation_performed": False}
    steps = []
    for gap in gaps.get("gaps") or []:
        donor = gap["donor"]
        steps.append({
            "donor": donor["name"],
            "candidate_capabilities": gap["candidate_capabilities"],
            "contact_gate": "Recover donor current head + proof boundary before inheritance.",
            "inheritance_gate": "Implement the smallest capability slice without replacing target identity.",
            "proof_gate": "Test inherited behavior at the same level as the claim before crown.",
        })
    return {
        "target": gaps["target"],
        "objective": objective,
        "donor_plan": steps,
        "route": [
            "TARGET CURRENT HEAD",
            "DONOR CURRENT HEAD",
            "CAPABILITY CONTACT",
            "MINIMAL INHERITANCE SLICE",
            "TARGET-SIDE CONTACT",
            "COMPARE AGAINST PRE-INHERITANCE BASELINE",
            "CROWN OR REJECT",
            "TRACE DONOR + DELTA",
        ],
        "mutation_performed": False,
        "boundary": "This is a governed inheritance plan. It does not modify either donor or target.",
    }


def build_sync_contract(args):
    name = (args.get("name") or "").strip()
    private_queries = []
    if name:
        private_queries = [
            f"{name} 00_CURRENT_POINTER current head canonical",
            f"{name} 00_OPEN_CURRENT current frozen head",
            f"{name} FLAZ receipt current proof boundary",
            f"{name} 00_REENTRY_POINTER current",
        ]
    else:
        private_queries = [
            "current project registry latest version current pointer",
            "00_CURRENT_POINTER current head FLAZ receipt",
        ]
    return {
        "schema": "JM.BuildMesh.SovereignSyncContract/0.7.3",
        "hosted_snapshot": {
            "server_version": VERSION,
            "current_registry_schema": CURRENT_REGISTRY_SCHEMA,
            "current_registry_date": CURRENT_REGISTRY_DATE,
            "current_registry_body": CURRENT_REGISTRY_BODY,
            "current_registry_sha256": CURRENT_REGISTRY_SHA256,
            "current_registry_source": CURRENT_REGISTRY_SOURCE,
            "current_registry_loaded_bytes": CURRENT_REGISTRY_BYTES,
            "current_registry_path_mode": CURRENT_REGISTRY_PATH_MODE,
            "current_registry_hash_mode": CURRENT_REGISTRY_HASH_MODE,
            "current_registry_reload_policy": CURRENT_REGISTRY_RELOAD_POLICY,
            "current_project_records": len(CURRENT),
            "capability_profiles": len(CAPABILITY_PROFILES),
        },
        "private_contact_queries": private_queries,
        "reconciliation_order": [
            "DIRECT PRIVATE BODY / RECEIPT",
            "EXACT PRIVATE CURRENT / OPEN / REENTRY POINTER",
            "PRIVATE FLAZ / MANIFEST",
            "HOSTED EXTERNAL CURRENT REGISTRY",
            "HOSTED CAPABILITY PROFILE",
            "NAVIGATOR PUBLIC DONOR",
            "PACKAGED HISTORICAL SNAPSHOT",
        ],
        "privacy_rule": "Keep raw private Library evidence local to the host. Do not send private snippets or files to this public MCP merely to reconcile authority.",
        "drift_rule": "If exact private current evidence is newer/stronger than the hosted snapshot, mark SYNC_DRIFT and use the private evidence for the current answer.",
        "registry_integrity_rule": "Hosted registry identity is computed from the exact bytes loaded at process start; hardcoded hash claims are forbidden.",
        "mutation_performed": False,
    }

def prepare_operation_gate(args):
    target = (args.get("target") or "").strip()
    objective = (args.get("objective") or "").strip()
    action_type = (args.get("action_type") or "continue").strip().lower()
    intended_change = (args.get("intended_change") or "").strip()
    donors = args.get("donors") or []
    if not target or not objective:
        raise ValueError("target and objective are required")
    if not isinstance(donors, list) or len(donors) > 8:
        raise ValueError("donors must be an array of at most 8 names")
    authority = resolve_current_head({"name": target})
    profile = resolve_profile(target)
    base = {
        "schema": "JM.BuildMesh.OperationGate/0.7",
        "target": target,
        "objective": objective,
        "action_type": action_type,
        "intended_change": intended_change or None,
        "donors": [str(x) for x in donors],
        "hosted_authority_state": authority.get("state"),
        "hosted_current_head": authority.get("current_head"),
        "target_profile_id": profile.get("id") if profile else None,
    }
    op_id = hashlib.sha256(
        json.dumps(base, ensure_ascii=False, sort_keys=True, separators=(",",":")).encode("utf-8")
    ).hexdigest()[:24]
    return {
        **base,
        "operation_id": f"JMOP-{op_id}",
        "phase": "PLAN_ONLY",
        "preconditions": [
            "Reconcile exact private current pointer/receipt locally when private Library contact is available.",
            "Recover each donor current head and proof boundary before capability transfer.",
            "Preserve target identity and protected ancestors.",
            "Require explicit user approval before any external write, deploy, delete, overwrite or pointer mutation unless that exact action was already explicitly requested in the active conversation.",
        ],
        "host_execution_rule": "The public Build Mesh MCP performs no mutation. Approved writes are executed only by the host through an authorized connector/tool.",
        "verification_route": [
            "READ BACK CHANGED CARRIER",
            "COMPARE INTENDED VS ACTUAL DELTA",
            "RUN CLAIM-LEVEL CONTACT / TEST",
            "WITHHOLD CROWN ON MISMATCH",
            "WRITE RECEIPT / TRACE ONLY AFTER VERIFICATION",
        ],
        "mutation_performed": False,
        "privacy_rule": "Do not include raw private Library content in this capsule.",
    }

def plan_artifact_route(args):
    target = (args.get("target") or "").strip()
    requested_type = (args.get("artifact_type") or "").strip()
    outputs = args.get("outputs") or []
    objective = (args.get("objective") or "").strip()
    if not target or not requested_type:
        raise ValueError("target and artifact_type are required")
    if not isinstance(outputs, list) or len(outputs) > 8:
        raise ValueError("outputs must be an array of at most 8 strings")

    type_key = ARTIFACT_TYPE_ALIASES.get(requested_type.casefold().strip())
    if not type_key:
        allowed = ", ".join(sorted(ARTIFACT_SURFACE_PROFILES))
        raise ValueError(f"unsupported artifact_type; use one of: {allowed}")

    surface = ARTIFACT_SURFACE_PROFILES[type_key]
    authority = resolve_current_head({"name": target})
    capability_profile = resolve_profile(target)
    selected_outputs = [str(x).strip() for x in outputs if str(x).strip()] or list(surface["default_outputs"])

    manifest_seed = {
        "schema": "JM.ArtifactRoute/0.1",
        "target": target,
        "artifact_type": type_key,
        "outputs": selected_outputs,
        "objective": objective or None,
        "hosted_authority_state": authority.get("state"),
        "hosted_current_head": authority.get("current_head"),
        "target_profile_id": capability_profile.get("id") if capability_profile else None,
    }
    route_id = hashlib.sha256(
        json.dumps(manifest_seed, ensure_ascii=False, sort_keys=True, separators=(",",":")).encode("utf-8")
    ).hexdigest()[:24]

    return {
        **manifest_seed,
        "route_id": f"JMART-{route_id}",
        "phase": "PLAN_ONLY",
        "surface_profile": {
            "label": surface["label"],
            "default_outputs": list(surface["default_outputs"]),
            "selected_outputs": selected_outputs,
            "build_gate": surface["build_gate"],
            "proof_gate": surface["proof_gate"],
            "delivery_gate": surface["delivery_gate"],
            "surface_boundary": surface["surface_boundary"],
        },
        "common_route": [
            "RECOVER CURRENT BODY",
            "LOCK SOURCE / IDENTITY / VERSION",
            "SELECT SURFACE PROFILE",
            "BUILD / RENDER",
            "VERIFY AT CLAIM LEVEL",
            "PACKAGE + MANIFEST / HASH",
            "PUBLISH / INSTALL / SEAT",
            "READ BACK ACTUAL CONSEQUENCE",
            "RETURN DIRECT OPEN / DOWNLOAD ROUTE",
            "WRITE RECEIPT + RECOVERY TRACE",
        ],
        "ownership_contract": [
            "ROUTE MAY BUILD / PACKAGE / PUBLISH / DISTRIBUTE",
            "ROUTE DOES NOT BECOME OWNER",
            "SOURCE / RIGHTS / AUTHORIAL INTENT REMAIN WITH THEIR LAWFUL OWNER",
        ],
        "delivery_contract": {
            "open_first": True,
            "direct_route_required": True,
            "link_rule": "LINK EXISTS ≠ CORRECT DELIVERY. Resolve and read back the intended body/bytes before Ding.",
            "surface_difference_law": "SAME IDENTITY BODY ≠ SAME SURFACE BEHAVIOUR.",
        },
        "host_execution_rule": "This public MCP plans the artifact route only. Authorized host tools perform build/write/deploy/publish/install actions and must read back their consequences.",
        "mutation_performed": False,
        "boundary": "Artifact-general routing is shared; proof remains surface-specific. Mesh ≠ Merge.",
    }



def estate_keeper_contract(args):
    scope = (args.get("scope") or "JM Estate / private Library maintenance").strip()
    last_checkpoint = (args.get("last_checkpoint") or "").strip()
    changed_count = args.get("changed_count")
    unresolved_count = args.get("unresolved_count")
    for label, value in (("changed_count", changed_count), ("unresolved_count", unresolved_count)):
        if value is not None and (not isinstance(value, int) or value < 0):
            raise ValueError(f"{label} must be a non-negative integer when supplied")

    seed = {
        "scope": scope,
        "last_checkpoint": last_checkpoint or None,
        "changed_count": changed_count,
        "unresolved_count": unresolved_count,
        "registry_sha256": CURRENT_REGISTRY_SHA256,
        "server_version": VERSION,
    }
    contract_id = hashlib.sha256(
        json.dumps(seed, ensure_ascii=False, sort_keys=True, separators=(",",":")).encode("utf-8")
    ).hexdigest()[:24]

    return {
        "schema": "JM.BuildMesh.EstateKeeperContract/0.7.6",
        "contract_id": f"JMKEEP-{contract_id}",
        "phase": "HOST_CONTACT_REQUIRED",
        "scope": scope,
        "package_head": "JM ECOSTATE — Build Mesh v1.0.6 — Estate Keeper Convergence",
        "hosted_runtime": VERSION,
        "hosted_registry": {
            "schema": CURRENT_REGISTRY_SCHEMA,
            "date": CURRENT_REGISTRY_DATE,
            "sha256": CURRENT_REGISTRY_SHA256,
            "records": len(CURRENT),
        },
        "last_checkpoint": last_checkpoint or None,
        "host_summary": {
            "changed_count": changed_count,
            "unresolved_count": unresolved_count,
        },
        "private_contact_queries": [
            "JM ESTATE MAINTENANCE CONVERGENCE current reentry control",
            "JM_MAGNIFYING_GLASS_CONTROL latest revision source_head",
            "JM_LIBRARY_RECLAIM latest durable descendant current continuation",
            "JM ECOSTATE Body Carrier Mesh v1.12 Physical Census Overlay current",
            "current project registry latest version current pointer",
        ],
        "recovered_donor_routes": [
            "JM Living Library — Estate-Wide Recursive Source Census ×32×10",
            "JM Living Library Beneficial Access Core",
            "JM Estate Live Registry",
            "JM Estate Compass v1.5.0 — Lazy Library",
            "JM Living Notebook / Estate Operating Tool v1.5B",
            "JM Estate Circulation & Return v1.0",
            "JM File Grabber / FLL BenefitMerge",
            "JM ECOSTATE Body ↔ Carrier Mesh v1.12",
            "JM Library Reclaim / JM Magnifying Glass",
        ],
        "authority_order": [
            "DIRECT PRIVATE BODY / RECEIPT",
            "EXACT PRIVATE CURRENT / OPEN / REENTRY POINTER",
            "PRIVATE FLAZ / MANIFEST",
            "HOSTED EXTERNAL CURRENT REGISTRY",
            "HOSTED CAPABILITY PROFILE",
            "NAVIGATOR PUBLIC DONOR",
            "PACKAGED HISTORICAL SNAPSHOT",
        ],
        "delta_cycle": [
            "RECOVER LATEST CONTROL / REENTRY",
            "DETECT NEW OR CHANGED LIBRARY OBJECTS / REGISTRY DELTAS",
            "RESOLVE EXISTING BODY / CARD / LINEAGE BEFORE CREATING ANY IDENTITY",
            "ATTACH OR UPDATE CURRENT HEAD / CARRIER / PROOF / STORAGE ROLE",
            "COMPARE WITH BODY↔CARRIER + RECLAIM CONTROL",
            "CLASSIFY KEEP / RECOVERY / LINEAGE / THIN / RETIRE / HOLD",
            "EXECUTE ONLY ALREADY-AUTHORIZED HOST-SIDE ACTIONS",
            "READ BACK AND VERIFY ACTUAL DELTA",
            "UPDATE DURABLE CONTROL + DRIFT RECEIPT",
            "SEND ONLY BOUNDED NON-PRIVATE STATE SUMMARY TO PUBLIC BUILD MESH",
        ],
        "residency_states": ["KEEP", "RECOVERY", "LINEAGE", "THIN", "RETIRE", "HOLD"],
        "existing_identity_rule": "Reuse the existing Registry Card/body identity. A new carrier does not become a new creation.",
        "authority_rule": "Identity/current-head authority must be exact or privately re-contacted. Fuzzy discovery is never authority.",
        "no_census_default": True,
        "destructive_default": "HOLD",
        "reclaim_rule": "Never double-credit prior mutations. Exact duplicate/containment/thinning requires live proof plus a retained survivor or recovery route.",
        "privacy_rule": "Raw private Library files, snippets and identifiers stay local to the host; this public MCP accepts only bounded state summaries.",
        "host_execution_rule": "This public MCP does not read or mutate the private Library. The host performs private contact and authorized consequence, then reads back and verifies.",
        "mutation_performed": False,
        "laws": [
            "RECOVER BEFORE REBUILD",
            "CONTACT BEFORE CROWN",
            "NO DING, NO CLAIM",
            "MESH ≠ MERGE",
            "BODY ≠ CARRIER",
            "CARRIERS DO NOT MULTIPLY CREATIONS",
            "CENSUS IS NOT THE NEXT JOB",
            "FROM HERE, CONNECT — DO NOT RECOUNT",
            "PRESERVING PROOF ≠ PRESERVING EVERY TRACE",
        ],
    }

def build_mesh_status(args):
    probe = bool(args.get("probe_navigator", True))
    nav = navigator_rpc("navigator_bridge_status", {}, use_cache=False) if probe else {"state": "NOT_PROBED"}
    return {
        "server": SERVER_NAME,
        "version": VERSION,
        "mode": "read-only authority / external-current-registry / capability-mesh / artifact-router / sovereign-sync-contract / estate-keeper-contract / operation-planning service",
        "estate_keeper_contract_schema": "JM.BuildMesh.EstateKeeperContract/0.7.6",
        "current_project_records": len(CURRENT),
        "current_registry_schema": CURRENT_REGISTRY_SCHEMA,
        "current_registry_date": CURRENT_REGISTRY_DATE,
        "current_registry_body": CURRENT_REGISTRY_BODY,
        "current_registry_sha256": CURRENT_REGISTRY_SHA256,
        "current_registry_source": CURRENT_REGISTRY_SOURCE,
        "current_registry_loaded_bytes": CURRENT_REGISTRY_BYTES,
        "current_registry_path_mode": CURRENT_REGISTRY_PATH_MODE,
        "current_registry_hash_mode": CURRENT_REGISTRY_HASH_MODE,
        "current_registry_reload_policy": CURRENT_REGISTRY_RELOAD_POLICY,
        "overlay_entries": len(OVERLAY),
        "capability_profiles": len(CAPABILITY_PROFILES),
        "artifact_surface_profiles": len(ARTIFACT_SURFACE_PROFILES),
        "navigator_cache_ttl_seconds": NAV_CACHE_TTL,
        "navigator_endpoint": NAVIGATOR_MCP,
        "navigator_contact": nav,
        "plugin_historical_register": "1,074 lineages retained in JM ECOSTATE Build Mesh package",
        "laws": [
            "NO DING, NO CLAIM",
            "CONTACT BEFORE CROWN",
            "RECOVER BEFORE REBUILD",
            "MESH ≠ MERGE",
            "BODY ≠ CARRIER ≠ ROUTE ≠ SEAT",
            "ACCESS ≠ AUTHORITY",
            "CENSUS IS NOT THE NEXT JOB",
            "FROM HERE, CONNECT — DO NOT RECOUNT",
        ],
        "boundary": "This public service does not own the Estate, does not access or ingest the private ChatGPT Library, and performs no writes. Private authority reconciliation stays local to the host.",
    }

TOOLS = [
    {"name":"search_builds","description":"Search the hosted current layer and the public-safe Navigator donor without treating discovery as proof.","inputSchema":{"type":"object","properties":{"query":{"type":"string"},"limit":{"type":"integer","minimum":1,"maximum":25}},"required":["query"],"additionalProperties":False},"annotations":{"readOnlyHint":True,"destructiveHint":False,"idempotentHint":True,"openWorldHint":False}},
    {"name":"recover_build","description":"Recover current candidates plus public Navigator contact for a JM build.","inputSchema":{"type":"object","properties":{"name":{"type":"string"},"query":{"type":"string"},"limit":{"type":"integer","minimum":1,"maximum":25}},"additionalProperties":False},"annotations":{"readOnlyHint":True,"destructiveHint":False,"idempotentHint":True,"openWorldHint":False}},
    {"name":"resolve_current_head","description":"Resolve a build to CURRENT_DECLARED, CURRENT_CANDIDATE, CONFLICT_OPEN, SNAPSHOT_ONLY or ABSENCE_NOT_PROVEN.","inputSchema":{"type":"object","properties":{"name":{"type":"string"}},"required":["name"],"additionalProperties":False},"annotations":{"readOnlyHint":True,"destructiveHint":False,"idempotentHint":True,"openWorldHint":False}},
    {"name":"proof_state","description":"Return the recorded proof/status/boundary for a build without inflating discovery into a runtime claim.","inputSchema":{"type":"object","properties":{"name":{"type":"string"}},"required":["name"],"additionalProperties":False},"annotations":{"readOnlyHint":True,"destructiveHint":False,"idempotentHint":True,"openWorldHint":False}},
    {"name":"trace_lineage","description":"Use the public-safe Navigator donor to return preserved lineage for matching Estate bodies.","inputSchema":{"type":"object","properties":{"name":{"type":"string"},"limit":{"type":"integer","minimum":1,"maximum":25}},"required":["name"],"additionalProperties":False},"annotations":{"readOnlyHint":True,"destructiveHint":False,"idempotentHint":True,"openWorldHint":False}},
    {"name":"continue_build_plan","description":"Produce a non-mutating continuation route from the strongest hosted authority/proof state.","inputSchema":{"type":"object","properties":{"name":{"type":"string"},"objective":{"type":"string"}},"required":["name"],"additionalProperties":False},"annotations":{"readOnlyHint":True,"destructiveHint":False,"idempotentHint":True,"openWorldHint":False}},
    {"name":"build_mesh_status","description":"Return native Build Mesh MCP status and optionally probe the Navigator donor.","inputSchema":{"type":"object","properties":{"probe_navigator":{"type":"boolean","default":True}},"additionalProperties":False},"annotations":{"readOnlyHint":True,"destructiveHint":False,"idempotentHint":True,"openWorldHint":False}},
    {"name":"batch_recover_builds","description":"Recover up to 20 JM builds in one call, resolving local current authority before using the public donor.","inputSchema":{"type":"object","properties":{"names":{"type":"array","minItems":1,"maxItems":20,"items":{"type":"string"}}},"required":["names"],"additionalProperties":False},"annotations":{"readOnlyHint":True,"destructiveHint":False,"idempotentHint":True,"openWorldHint":False}},
    {"name":"find_capability_donors","description":"Find existing JM bodies whose declared capabilities are relevant to a target objective, without transferring proof.","inputSchema":{"type":"object","properties":{"objective":{"type":"string"},"target":{"type":"string"},"limit":{"type":"integer","minimum":1,"maximum":15}},"required":["objective"],"additionalProperties":False},"annotations":{"readOnlyHint":True,"destructiveHint":False,"idempotentHint":True,"openWorldHint":False}},
    {"name":"compare_builds","description":"Compare 2 to 8 JM build capability profiles while preserving separate identities and proof jurisdictions.","inputSchema":{"type":"object","properties":{"builds":{"type":"array","minItems":2,"maxItems":8,"items":{"type":"string"}}},"required":["builds"],"additionalProperties":False},"annotations":{"readOnlyHint":True,"destructiveHint":False,"idempotentHint":True,"openWorldHint":False}},
    {"name":"build_capability_mesh","description":"Construct a bounded cross-build capability mesh from named builds or an objective; edges indicate contact reasons, not merges.","inputSchema":{"type":"object","properties":{"builds":{"type":"array","maxItems":12,"items":{"type":"string"}},"objective":{"type":"string"},"max_nodes":{"type":"integer","minimum":2,"maximum":20}},"additionalProperties":False},"annotations":{"readOnlyHint":True,"destructiveHint":False,"idempotentHint":True,"openWorldHint":False}},
    {"name":"detect_propagation_gaps","description":"Find relevant capabilities declared elsewhere but not on a target profile; returns candidates, never mandatory propagation.","inputSchema":{"type":"object","properties":{"target":{"type":"string"},"objective":{"type":"string"},"limit":{"type":"integer","minimum":1,"maximum":12}},"required":["target"],"additionalProperties":False},"annotations":{"readOnlyHint":True,"destructiveHint":False,"idempotentHint":True,"openWorldHint":False}},
    {"name":"plan_capability_inheritance","description":"Plan a bounded donor-to-target capability inheritance route with explicit contact and proof gates; performs no mutation.","inputSchema":{"type":"object","properties":{"target":{"type":"string"},"objective":{"type":"string"},"max_donors":{"type":"integer","minimum":1,"maximum":8}},"required":["target","objective"],"additionalProperties":False},"annotations":{"readOnlyHint":True,"destructiveHint":False,"idempotentHint":True,"openWorldHint":False}},
    {"name":"build_sync_contract","description":"Return the hosted snapshot identity plus private-host search/reconciliation rules without ingesting private Library content.","inputSchema":{"type":"object","properties":{"name":{"type":"string"}},"additionalProperties":False},"annotations":{"readOnlyHint":True,"destructiveHint":False,"idempotentHint":True,"openWorldHint":False}},
    {"name":"estate_keeper_contract","description":"Return the delta-first host/private Estate Keeper contract for registry, body↔carrier, proof, storage and reclaim maintenance without ingesting private Library content or performing mutation.","inputSchema":{"type":"object","properties":{"scope":{"type":"string"},"last_checkpoint":{"type":"string"},"changed_count":{"type":"integer","minimum":0},"unresolved_count":{"type":"integer","minimum":0}},"additionalProperties":False},"annotations":{"readOnlyHint":True,"destructiveHint":False,"idempotentHint":True,"openWorldHint":False}},
    {"name":"plan_artifact_route","description":"Plan one governed artifact-general route for a book, comic, theory, app, APK or downloadable/addable link while keeping proof surface-specific.","inputSchema":{"type":"object","properties":{"target":{"type":"string"},"artifact_type":{"type":"string","enum":["book","comic","theory","app","apk","download"]},"outputs":{"type":"array","maxItems":8,"items":{"type":"string"}},"objective":{"type":"string"}},"required":["target","artifact_type"],"additionalProperties":False},"annotations":{"readOnlyHint":True,"destructiveHint":False,"idempotentHint":True,"openWorldHint":False}},
    {"name":"prepare_operation_gate","description":"Create a deterministic PLAN_ONLY operation capsule for a future host-authorized action; performs no write or deploy.","inputSchema":{"type":"object","properties":{"target":{"type":"string"},"objective":{"type":"string"},"action_type":{"type":"string"},"intended_change":{"type":"string"},"donors":{"type":"array","maxItems":8,"items":{"type":"string"}}},"required":["target","objective"],"additionalProperties":False},"annotations":{"readOnlyHint":True,"destructiveHint":False,"idempotentHint":True,"openWorldHint":False}},
]
HANDLERS = {
    "search_builds": search_builds,
    "recover_build": recover_build,
    "resolve_current_head": resolve_current_head,
    "proof_state": proof_state,
    "trace_lineage": trace_lineage,
    "continue_build_plan": continue_build_plan,
    "build_mesh_status": build_mesh_status,
    "batch_recover_builds": batch_recover_builds,
    "find_capability_donors": find_capability_donors,
    "compare_builds": compare_builds,
    "build_capability_mesh": build_capability_mesh,
    "detect_propagation_gaps": detect_propagation_gaps,
    "plan_capability_inheritance": plan_capability_inheritance,
    "build_sync_contract": build_sync_contract,
    "estate_keeper_contract": estate_keeper_contract,
    "prepare_operation_gate": prepare_operation_gate,
    "plan_artifact_route": plan_artifact_route,
}

def tool_result(data):
    return {
        "content": [{"type": "text", "text": json.dumps(data, ensure_ascii=False, indent=2)}],
        "structuredContent": data,
        "isError": False,
    }

def rpc_result(request_id, result):
    return {"jsonrpc": "2.0", "id": request_id, "result": result}

def rpc_error(request_id, code, message):
    return {"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}}

class Handler(BaseHTTPRequestHandler):
    server_version = "JMBuildMeshNativeMCP/0.8.0"

    def log_message(self, fmt, *args):
        sys.stdout.write(f"{self.address_string()} - {fmt % args}\n")
        sys.stdout.flush()

    def send_json(self, status, obj=None):
        raw = b"" if obj is None else json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "content-type,accept,mcp-protocol-version")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        if raw:
            self.wfile.write(raw)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "content-type,accept,mcp-protocol-version")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.end_headers()

    def do_HEAD(self):
        path = urlparse(self.path).path
        if path in ("/", "/health", "/ready", "/meta"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        self.send_response(404)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/health":
            return self.send_json(200, {"ok": True, "name": SERVER_NAME, "version": VERSION})
        if path == "/ready":
            return self.send_json(200, {"ready": True, "name": SERVER_NAME, "version": VERSION})
        if path in ("/", "/meta"):
            return self.send_json(200, build_mesh_status({"probe_navigator": False}))
        if path == "/mcp":
            return self.send_json(405, {"error": "POST JSON-RPC to /mcp; no server-to-client SSE stream advertised."})
        return self.send_json(404, {"error": "not found"})

    def do_POST(self):
        if urlparse(self.path).path != "/mcp":
            return self.send_json(404, {"error": "not found"})
        size = int(self.headers.get("Content-Length") or 0)
        try:
            payload = json.loads(self.rfile.read(size) or b"{}")
        except Exception:
            return self.send_json(400, rpc_error(None, -32700, "Parse error"))
        if not isinstance(payload, dict) or payload.get("jsonrpc") != "2.0" or "method" not in payload:
            return self.send_json(400, rpc_error(payload.get("id") if isinstance(payload, dict) else None, -32600, "Invalid Request"))

        request_id = payload.get("id")
        method = payload["method"]
        params = payload.get("params") or {}

        if request_id is None:
            return self.send_json(202, None)

        if method == "initialize":
            requested = params.get("protocolVersion", DEFAULT_PROTOCOL)
            protocol = requested if requested in SUPPORTED_PROTOCOLS else DEFAULT_PROTOCOL
            return self.send_json(200, rpc_result(request_id, {
                "protocolVersion": protocol,
                "capabilities": {"tools": {"listChanged": False}},
                "serverInfo": {"name": SERVER_NAME, "version": VERSION},
                "instructions": "Recover before rebuild. Search does not equal proof. Resolve authority before crown. Fuzzy discovery is never authority. Capability edges are contact reasons, not merges. Keep private Library evidence local to the host. Estate Keeper maintenance is delta-first: connect, do not recount. Operation gates, Keeper contracts and artifact routes are PLAN_ONLY and non-mutating. Artifact profiles share one spine while keeping surface proof separate.",
            }))
        if method == "ping":
            return self.send_json(200, rpc_result(request_id, {}))
        if method == "tools/list":
            return self.send_json(200, rpc_result(request_id, {"tools": TOOLS}))
        if method == "tools/call":
            name = params.get("name", "")
            args = params.get("arguments") or {}
            if name not in HANDLERS:
                return self.send_json(200, rpc_error(request_id, -32601, f"Unknown tool: {name}"))
            try:
                data = HANDLERS[name](args)
                return self.send_json(200, rpc_result(request_id, tool_result(data)))
            except Exception as exc:
                return self.send_json(200, rpc_result(request_id, {
                    "content": [{"type": "text", "text": f"{type(exc).__name__}: {exc}"}],
                    "isError": True,
                }))
        return self.send_json(200, rpc_error(request_id, -32601, f"Method not found: {method}"))

if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "3000"))
    print(json.dumps({"event": "startup", "name": SERVER_NAME, "version": VERSION, "host": host, "port": port}, ensure_ascii=False), flush=True)
    ThreadingHTTPServer((host, port), Handler).serve_forever()
